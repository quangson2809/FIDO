package com.fido.modules.inventory.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.inventory.entity.GoodsReceiptItem;
import com.fido.modules.inventory.entity.Inventory;
import com.fido.modules.inventory.entity.InventoryTransaction;
import com.fido.modules.inventory.repository.GoodsReceiptItemRepository;
import com.fido.modules.inventory.repository.InventoryRepository;
import com.fido.modules.inventory.repository.InventoryTransactionRepository;
import com.fido.modules.product.service.InventoryProductAccessService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional(propagation = Propagation.MANDATORY)
public class InventoryCommandService {
    private static final int MAX_SQL_INT = Integer.MAX_VALUE;

    private final EntityManager em;
    private final InventoryRepository inventories;
    private final InventoryTransactionRepository transactions;
    private final GoodsReceiptItemRepository receiptItems;
    private final InventoryProductAccessService productAccess;
    private final OperationalWarehouseService operationalWarehouse;
    private final AuditWriteService audit;

    public InventoryCommandService(
            EntityManager em,
            InventoryRepository inventories,
            InventoryTransactionRepository transactions,
            GoodsReceiptItemRepository receiptItems,
            InventoryProductAccessService productAccess,
            OperationalWarehouseService operationalWarehouse,
            AuditWriteService audit) {
        this.em = em;
        this.inventories = inventories;
        this.transactions = transactions;
        this.receiptItems = receiptItems;
        this.productAccess = productAccess;
        this.operationalWarehouse = operationalWarehouse;
        this.audit = audit;
    }

    /**
     * Posts a persisted receipt's lines by semantic source identity. The caller holds the locked
     * GoodsReceipt source row; mixed/changed prior postings fail closed instead of posting twice.
     */
    public void receiveGoods(
            Long actor, Long receiptId, Long warehouseId, List<StockLine> lines) {
        operationalWarehouse.requireOperationalWarehouse(warehouseId);
        if (actor == null || actor <= 0 || receiptId == null || receiptId <= 0
                || lines == null || lines.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "GOODS_RECEIPT_INVALID_SOURCE");
        }

        List<StockLine> orderedLines = ordered(lines);
        Set<Long> receiptItemIds = new HashSet<>();
        Set<Long> productIds = new HashSet<>();
        int alreadyPosted = 0;

        // Validate all sources and all existing semantic keys before mutating the first balance.
        for (StockLine line : orderedLines) {
            if (line.goodsReceiptItemId() == null
                    || !receiptItemIds.add(line.goodsReceiptItemId())
                    || !productIds.add(line.productId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_SOURCE_CONFLICT");
            }
            GoodsReceiptItem source = receiptItems.findById(line.goodsReceiptItemId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.CONFLICT, "INVENTORY_SOURCE_CONFLICT"));
            if (!Objects.equals(source.getReceiptId(), receiptId)
                    || !Objects.equals(source.getProductId(), line.productId())
                    || !Objects.equals(source.getQuantity(), line.quantity())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_SOURCE_CONFLICT");
            }

            String semanticKey = receiptMovementKey(source.getReceiptItemId());
            List<InventoryTransaction> bySource =
                    transactions.findAllByGoodsReceiptItemIdAndTransactionType(
                            source.getReceiptItemId(), InventoryPolicy.RECEIPT_IN);
            if (bySource.size() > 1) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_SOURCE_CONFLICT");
            }
            var byKey = transactions.findByIdempotencyKey(semanticKey);
            if (bySource.isEmpty()) {
                if (byKey.isPresent()) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_IDEMPOTENCY_CONFLICT");
                }
                continue;
            }

            InventoryTransaction existing = bySource.get(0);
            if (byKey.isEmpty()
                    || !Objects.equals(existing.getTxnId(), byKey.get().getTxnId())
                    || !matchesReceiptMovement(existing, semanticKey, warehouseId, line)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_SOURCE_CONFLICT");
            }
            alreadyPosted++;
        }

        if (alreadyPosted == orderedLines.size()) return;
        if (alreadyPosted != 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_SOURCE_CONFLICT");
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        for (StockLine line : orderedLines) {
            applyBalanceDelta(warehouseId, line.productId(), line.quantity(), now);
            record(new InventoryMovement(
                    actor, warehouseId, line.productId(), line.quantity(),
                    InventoryPolicy.RECEIPT_IN, null, line.goodsReceiptItemId(), null, null),
                    receiptMovementKey(line.goodsReceiptItemId()));
        }
    }

    /** Explicit opening command: once per zero-baseline Product/warehouse pair. */
    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_WRITE')")
    public InventoryTransaction openStock(Long actor, Long productId, int openingQuantity) {
        if (actor == null || actor <= 0 || productId == null || productId <= 0
                || openingQuantity <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVENTORY_INVALID_MOVEMENT");
        }
        Long warehouseId = operationalWarehouse.requireOperationalWarehouseId();
        String semanticKey = openingMovementKey(warehouseId, productId);

        productAccess.lockTrackedProduct(productId);
        List<InventoryTransaction> openings =
                transactions.findAllByWarehouseIdAndProductIdAndTransactionType(
                        warehouseId, productId, InventoryPolicy.OPENING);
        var byKey = transactions.findByIdempotencyKey(semanticKey);
        if (byKey.isPresent()) {
            InventoryTransaction existing = byKey.get();
            if (openings.size() == 1
                    && Objects.equals(openings.get(0).getTxnId(), existing.getTxnId())
                    && matchesOpeningMovement(existing, semanticKey, warehouseId, productId, openingQuantity)) {
                return existing;
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_IDEMPOTENCY_CONFLICT");
        }
        if (!openings.isEmpty()
                || !transactions.findAllByWarehouseIdAndProductIdOrderByTxnIdAsc(
                        warehouseId, productId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_SOURCE_CONFLICT");
        }
        var balance = inventories.findByWarehouseIdAndProductId(warehouseId, productId);
        if (balance.isPresent()
                && (balance.get().getQuantityOnHand() == null
                    || balance.get().getQuantityOnHand() != 0
                    || balance.get().getVersion() == null
                    || balance.get().getVersion() != 0)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_SOURCE_CONFLICT");
        }

        applyBalanceDelta(warehouseId, productId, openingQuantity, LocalDateTime.now(ZoneOffset.UTC));
        InventoryTransaction movement = record(new InventoryMovement(
                actor, warehouseId, productId, openingQuantity, InventoryPolicy.OPENING,
                null, null, null, "OPENING"), semanticKey);
        audit.record(AuditWriteEvent.withChanges(
                AuditAction.INVENTORY_OPENING,
                AuditEntityType.INVENTORY,
                warehouseId + ":" + productId,
                Map.of(),
                Map.of(
                        "product_id", productId,
                        "warehouse_id", warehouseId,
                        "quantity_delta", openingQuantity,
                        "reason_code", "OPENING")));
        return movement;
    }

    private boolean matchesReceiptMovement(
            InventoryTransaction existing, String semanticKey, Long warehouseId, StockLine line) {
        return Objects.equals(existing.getIdempotencyKey(), semanticKey)
                && Objects.equals(existing.getTransactionType(), InventoryPolicy.RECEIPT_IN)
                && Objects.equals(existing.getWarehouseId(), warehouseId)
                && Objects.equals(existing.getProductId(), line.productId())
                && Objects.equals(existing.getQuantityDelta(), line.quantity())
                && Objects.equals(existing.getGoodsReceiptItemId(), line.goodsReceiptItemId())
                && existing.getOrderItemId() == null
                && existing.getReversesTransactionId() == null
                && existing.getReason() == null;
    }

    private boolean matchesOpeningMovement(
            InventoryTransaction existing, String semanticKey, Long warehouseId,
            Long productId, int openingQuantity) {
        return Objects.equals(existing.getIdempotencyKey(), semanticKey)
                && Objects.equals(existing.getTransactionType(), InventoryPolicy.OPENING)
                && Objects.equals(existing.getWarehouseId(), warehouseId)
                && Objects.equals(existing.getProductId(), productId)
                && Objects.equals(existing.getQuantityDelta(), openingQuantity)
                && existing.getGoodsReceiptItemId() == null
                && existing.getOrderItemId() == null
                && existing.getReversesTransactionId() == null
                && Objects.equals(existing.getReason(), "OPENING");
    }

    private String receiptMovementKey(Long receiptItemId) {
        return "goods-receipt-item:" + receiptItemId + ":GOODS_RECEIPT";
    }

    private String openingMovementKey(Long warehouseId, Long productId) {
        return "opening:" + warehouseId + ":" + productId;
    }

    /**
     * Applies an explicit adjustment under the Product/balance lock. The persisted key is derived
     * from stable source_operation_id, never from a transport retry header.
     */
    public InventoryTransaction adjustManually(
            Long actor,
            Long productId,
            int quantityDelta,
            String reasonCode,
            String sourceOperationId,
            Integer expectedVersion) {
        requireAdjustmentCommand(actor, productId, quantityDelta, reasonCode, sourceOperationId);
        Long warehouseId = operationalWarehouse.requireOperationalWarehouseId();
        String semanticKey = adjustmentMovementKey(sourceOperationId);

        // Fast-path committed retries, then re-check after taking the Product lock for races.
        var prior = transactions.findByIdempotencyKey(semanticKey);
        if (prior.isPresent()) {
            if (matchesAdjustmentMovement(
                    prior.get(), semanticKey, actor, warehouseId, productId, quantityDelta, reasonCode)) {
                return prior.get();
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_IDEMPOTENCY_CONFLICT");
        }

        productAccess.lockTrackedProduct(productId);
        prior = transactions.findByIdempotencyKey(semanticKey);
        if (prior.isPresent()) {
            if (matchesAdjustmentMovement(
                    prior.get(), semanticKey, actor, warehouseId, productId, quantityDelta, reasonCode)) {
                return prior.get();
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_IDEMPOTENCY_CONFLICT");
        }

        Inventory balance = inventories.findByWarehouseIdAndProductIdForUpdate(warehouseId, productId)
                .orElse(null);
        int currentQuantity = balance == null ? 0 : balance.getQuantityOnHand();
        int currentVersion = balance == null ? 0 : balance.getVersion();
        requireExpectedVersion(expectedVersion, currentVersion);

        long nextQuantity = (long) currentQuantity + quantityDelta;
        if (nextQuantity < 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_INSUFFICIENT_STOCK");
        }
        if (nextQuantity > MAX_SQL_INT || currentVersion >= MAX_SQL_INT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_BALANCE_OVERFLOW");
        }

        applyBalanceDelta(warehouseId, productId, quantityDelta, LocalDateTime.now(ZoneOffset.UTC));
        InventoryTransaction movement;
        try {
            movement = record(new InventoryMovement(
                    actor, warehouseId, productId, quantityDelta, InventoryPolicy.ADJUSTMENT,
                    null, null, null, reasonCode), semanticKey);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            // Unique-key races, including the same source ID concurrently submitted for another
            // Product, must roll back the preceding balance update.
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_IDEMPOTENCY_CONFLICT");
        }
        audit.record(AuditWriteEvent.withChanges(
                AuditAction.INVENTORY_ADJUST,
                AuditEntityType.INVENTORY_TRANSACTION,
                movement.getTxnId().toString(),
                Map.of(),
                Map.of(
                        "product_id", productId,
                        "warehouse_id", warehouseId,
                        "quantity_delta", quantityDelta,
                        "reason_code", reasonCode)));
        return movement;
    }

    /**
     * Full reversal of an ADJUSTMENT only. Receipt and Order movements remain owned by their
     * source workflows; no new movement type is introduced.
     */
    public InventoryTransaction reverseAdjustment(
            Long actor, Long sourceTransactionId, String reasonCode, Integer expectedVersion) {
        if (actor == null || actor <= 0 || sourceTransactionId == null || sourceTransactionId <= 0
                || !InventoryPolicy.isReversalReasonCode(reasonCode)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVENTORY_INVALID_MOVEMENT");
        }

        InventoryTransaction source = transactions.findByTxnIdForUpdate(sourceTransactionId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "INVENTORY_MOVEMENT_NOT_FOUND"));
        if (!InventoryPolicy.ADJUSTMENT.equals(source.getTransactionType())
                || source.getReversesTransactionId() != null) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "INVENTORY_UNSUPPORTED_MOVEMENT_TYPE");
        }
        if (source.getQuantityDelta() == Integer.MIN_VALUE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_BALANCE_OVERFLOW");
        }

        // A source transaction is locked before the balance. This serializes competing reversal
        // requests and makes source identity decisive even when the caller retries with a new key.
        if (!transactions.findAllByReversesTransactionId(sourceTransactionId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_SOURCE_CONFLICT");
        }
        Long warehouseId = source.getWarehouseId();
        Long productId = source.getProductId();
        operationalWarehouse.requireOperationalWarehouse(warehouseId);
        String semanticKey = adjustmentReversalKey(sourceTransactionId);
        if (transactions.findByIdempotencyKey(semanticKey).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_SOURCE_CONFLICT");
        }

        productAccess.lockTrackedProduct(productId);
        Inventory balance = inventories.findByWarehouseIdAndProductIdForUpdate(warehouseId, productId)
                .orElse(null);
        int currentQuantity = balance == null ? 0 : balance.getQuantityOnHand();
        int currentVersion = balance == null ? 0 : balance.getVersion();
        requireExpectedVersion(expectedVersion, currentVersion);

        int quantityDelta = Math.negateExact(source.getQuantityDelta());
        long nextQuantity = (long) currentQuantity + quantityDelta;
        if (nextQuantity < 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_INSUFFICIENT_STOCK");
        }
        if (nextQuantity > MAX_SQL_INT || currentVersion >= MAX_SQL_INT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_BALANCE_OVERFLOW");
        }

        applyBalanceDelta(warehouseId, productId, quantityDelta, LocalDateTime.now(ZoneOffset.UTC));
        InventoryTransaction movement;
        try {
            movement = record(new InventoryMovement(
                    actor, warehouseId, productId, quantityDelta, InventoryPolicy.ADJUSTMENT,
                    null, null, sourceTransactionId, reasonCode), semanticKey);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_SOURCE_CONFLICT");
        }
        audit.record(AuditWriteEvent.withChanges(
                AuditAction.INVENTORY_ADJUST,
                AuditEntityType.INVENTORY_TRANSACTION,
                movement.getTxnId().toString(),
                Map.of("product_id", productId, "warehouse_id", warehouseId,
                        "quantity_delta", source.getQuantityDelta()),
                Map.of("product_id", productId, "warehouse_id", warehouseId,
                        "quantity_delta", quantityDelta, "reason_code", reasonCode)));
        return movement;
    }

    private void requireAdjustmentCommand(
            Long actor, Long productId, int quantityDelta, String reasonCode, String sourceOperationId) {
        if (actor == null || actor <= 0 || productId == null || productId <= 0 || quantityDelta == 0
                || !InventoryPolicy.isAdjustmentReasonCode(reasonCode)
                || !InventoryPolicy.isValidSourceOperationId(sourceOperationId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVENTORY_INVALID_MOVEMENT");
        }
    }

    private void requireExpectedVersion(Integer expectedVersion, int currentVersion) {
        if (expectedVersion != null && expectedVersion != currentVersion) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_STALE_VERSION");
        }
    }

    private boolean matchesAdjustmentMovement(
            InventoryTransaction movement, String semanticKey, Long actor, Long warehouseId,
            Long productId, int quantityDelta, String reasonCode) {
        return Objects.equals(movement.getIdempotencyKey(), semanticKey)
                && Objects.equals(movement.getTransactionType(), InventoryPolicy.ADJUSTMENT)
                && Objects.equals(movement.getWarehouseId(), warehouseId)
                && Objects.equals(movement.getProductId(), productId)
                && Objects.equals(movement.getQuantityDelta(), quantityDelta)
                && Objects.equals(movement.getActorAccountId(), actor)
                && Objects.equals(movement.getReason(), reasonCode)
                && movement.getGoodsReceiptItemId() == null
                && movement.getOrderItemId() == null
                && movement.getReversesTransactionId() == null;
    }

    private String adjustmentMovementKey(String sourceOperationId) {
        return "adjustment:" + sourceOperationId;
    }

    private String adjustmentReversalKey(Long sourceTransactionId) {
        return "adjustment-reversal:" + sourceTransactionId;
    }

    public void deductConfirmedOrder(
            Long actor, Long orderId, List<StockLine> lines, String reason) {
        Long warehouseId = operationalWarehouse.requireOperationalWarehouseId();
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        for (StockLine line : ordered(lines)) {
            int delta = -line.quantity();
            applyBalanceDelta(warehouseId, line.productId(), delta, now);
            record(new InventoryMovement(
                    actor, warehouseId, line.productId(), delta,
                    InventoryPolicy.ORDER_CONFIRM_OUT, line.orderItemId(), null, null, reason));
        }
    }

    public void restoreCancelledOrder(
            Long actor, Long orderId, List<StockLine> lines, String reason) {
        restoreOrderStock(actor, orderId, lines, InventoryPolicy.ORDER_CANCEL_IN, reason);
    }

    public void restoreDeliveryReturn(
            Long actor, Long orderId, List<StockLine> lines, String reason) {
        restoreOrderStock(actor, orderId, lines, InventoryPolicy.DELIVERY_RETURN_IN, reason);
    }

    private void restoreOrderStock(
            Long actor, Long orderId, List<StockLine> lines, String transactionType, String reason) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        List<Long> itemIds = lines.stream().map(StockLine::orderItemId)
                .filter(java.util.Objects::nonNull).distinct().toList();

        if (!itemIds.isEmpty()) {
            var originalMovements = transactions
                    .findAllByOrderItemIdInAndTransactionType(itemIds, InventoryPolicy.ORDER_CONFIRM_OUT)
                    .stream()
                    .sorted(Comparator.comparing(InventoryTransaction::getProductId)
                            .thenComparing(InventoryTransaction::getWarehouseId)
                            .thenComparing(InventoryTransaction::getTxnId))
                    .toList();
            for (InventoryTransaction original : originalMovements) {
                int quantity = Math.negateExact(original.getQuantityDelta());
                applyBalanceDelta(original.getWarehouseId(), original.getProductId(), quantity, now);
                record(new InventoryMovement(
                        actor, original.getWarehouseId(), original.getProductId(), quantity,
                        transactionType, original.getOrderItemId(), null,
                        original.getTxnId(), reason));
            }
            return;
        }

        // Compatibility callers without OrderItem references use the server-resolved warehouse.
        Long warehouseId = operationalWarehouse.requireOperationalWarehouseId();
        for (StockLine line : ordered(lines)) {
            applyBalanceDelta(warehouseId, line.productId(), line.quantity(), now);
            record(new InventoryMovement(
                    actor, warehouseId, line.productId(), line.quantity(),
                    transactionType, null, null, null, reason));
        }
    }

    /**
     * Serializes same-Product writers before first-row creation, locks/re-reads the composite
     * balance row, and applies the delta atomically in SQL under quantity/version bounds.
     */
    private void applyBalanceDelta(
            Long warehouseId, Long productId, int quantityDelta, LocalDateTime now) {
        if (quantityDelta == 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);

        productAccess.lockTrackedProduct(productId);

        Inventory balance = inventories.findByWarehouseIdAndProductIdForUpdate(warehouseId, productId)
                .orElse(null);
        if (balance == null) {
            if (quantityDelta < 0) throw new ResponseStatusException(HttpStatus.CONFLICT);
            ensureInventoryRow(warehouseId, productId);
            balance = inventories.findByWarehouseIdAndProductIdForUpdate(warehouseId, productId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT));
        }
        em.refresh(balance, LockModeType.PESSIMISTIC_WRITE);

        int updated = inventories.applyBalanceDeltaGuarded(
                warehouseId, productId, quantityDelta, now, MAX_SQL_INT, MAX_SQL_INT);
        if (updated != 1) throw new ResponseStatusException(HttpStatus.CONFLICT);

        // Keep a balance entity already loaded by the caller's persistence context in sync.
        em.refresh(balance);
    }

    private List<StockLine> ordered(List<StockLine> lines) {
        return lines.stream()
                .sorted(Comparator.comparing(StockLine::productId)
                        .thenComparing(line -> line.orderItemId() != null
                                ? line.orderItemId()
                                : line.goodsReceiptItemId() != null ? line.goodsReceiptItemId() : 0L))
                .toList();
    }

    private void ensureInventoryRow(Long warehouseId, Long productId) {
        Inventory inventory = new Inventory();
        inventory.setWarehouseId(warehouseId);
        inventory.setProductId(productId);
        inventory.setQuantityOnHand(0);
        inventory.setVersion(0);
        inventories.save(inventory);
        em.flush();
    }

    private InventoryTransaction record(InventoryMovement movement) {
        return record(movement, UUID.randomUUID().toString());
    }

    private InventoryTransaction record(InventoryMovement movement, String idempotencyKey) {
        InventoryTransaction transaction = new InventoryTransaction();
        transaction.setWarehouseId(movement.warehouseId());
        transaction.setProductId(movement.productId());
        transaction.setQuantityDelta(movement.quantityDelta());
        transaction.setTransactionType(movement.transactionType());
        transaction.setOrderItemId(movement.orderItemId());
        transaction.setGoodsReceiptItemId(movement.goodsReceiptItemId());
        transaction.setIdempotencyKey(idempotencyKey);
        transaction.setReversesTransactionId(movement.reversesTransactionId());
        transaction.setActorAccountId(movement.actor());
        transaction.setReason(normalize(movement.reason()));
        return transactions.save(transaction);
    }

    public void requireTrackedProduct(Long productId) {
        productAccess.requireTrackedProduct(productId);
    }

    private String normalize(String reason) {
        if (reason == null || reason.isBlank()) return null;
        String trimmed = reason.trim();
        return trimmed.length() <= 80 ? trimmed : trimmed.substring(0, 80);
    }

    private record InventoryMovement(
            Long actor, Long warehouseId, Long productId, int quantityDelta,
            String transactionType, Long orderItemId, Long goodsReceiptItemId,
            Long reversesTransactionId, String reason) {}

    public record StockLine(
            Long productId, int quantity, Long orderItemId, Long goodsReceiptItemId) {
        public StockLine(Long productId, int quantity) {
            this(productId, quantity, null, null);
        }
        public StockLine(Long productId, int quantity, Long orderItemId) {
            this(productId, quantity, orderItemId, null);
        }
        public StockLine {
            if (productId == null || quantity <= 0) {
                throw new IllegalArgumentException("Stock line requires Product ID and positive quantity");
            }
        }
    }
}
