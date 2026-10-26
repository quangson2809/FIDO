package com.fido.modules.inventory.service;

import com.fido.modules.inventory.entity.Inventory;
import com.fido.modules.inventory.entity.InventoryTransaction;
import com.fido.modules.inventory.repository.InventoryRepository;
import com.fido.modules.inventory.repository.InventoryTransactionRepository;
import com.fido.modules.product.service.InventoryProductAccessService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(propagation = Propagation.MANDATORY)
public class InventoryCommandService {
    private static final int MAX_SQL_INT = Integer.MAX_VALUE;

    private final EntityManager em;
    private final InventoryRepository inventories;
    private final InventoryTransactionRepository transactions;
    private final InventoryProductAccessService productAccess;
    private final OperationalWarehouseService operationalWarehouse;

    public InventoryCommandService(
            EntityManager em,
            InventoryRepository inventories,
            InventoryTransactionRepository transactions,
            InventoryProductAccessService productAccess,
            OperationalWarehouseService operationalWarehouse) {
        this.em = em;
        this.inventories = inventories;
        this.transactions = transactions;
        this.productAccess = productAccess;
        this.operationalWarehouse = operationalWarehouse;
    }

    public void receiveGoods(
            Long actor, Long receiptId, Long warehouseId, List<StockLine> lines) {
        operationalWarehouse.requireOperationalWarehouse(warehouseId);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        for (StockLine line : ordered(lines)) {
            applyBalanceDelta(warehouseId, line.productId(), line.quantity(), now);
            record(new InventoryMovement(
                    actor, warehouseId, line.productId(), line.quantity(),
                    InventoryPolicy.RECEIPT_IN, null, line.goodsReceiptItemId(), null, null));
        }
    }

    public InventoryTransaction adjustManually(
            Long actor, Long productId, int quantityDelta, String reason) {
        if (quantityDelta == 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        Long warehouseId = operationalWarehouse.requireOperationalWarehouseId();
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        applyBalanceDelta(warehouseId, productId, quantityDelta, now);
        return record(new InventoryMovement(
                actor, warehouseId, productId, quantityDelta, InventoryPolicy.ADJUSTMENT,
                null, null, null, reason));
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
                        .thenComparing(line -> line.orderItemId() == null ? 0L : line.orderItemId()))
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
        InventoryTransaction transaction = new InventoryTransaction();
        transaction.setWarehouseId(movement.warehouseId());
        transaction.setProductId(movement.productId());
        transaction.setQuantityDelta(movement.quantityDelta());
        transaction.setTransactionType(movement.transactionType());
        transaction.setOrderItemId(movement.orderItemId());
        transaction.setGoodsReceiptItemId(movement.goodsReceiptItemId());
        transaction.setIdempotencyKey(UUID.randomUUID().toString());
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
