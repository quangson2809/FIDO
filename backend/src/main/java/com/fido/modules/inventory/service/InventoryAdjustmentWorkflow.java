package com.fido.modules.inventory.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.inventory.entity.Inventory;
import com.fido.modules.inventory.entity.InventoryTransaction;
import com.fido.modules.inventory.repository.InventoryRepository;
import com.fido.modules.inventory.repository.InventoryTransactionRepository;
import com.fido.modules.inventory.service.InventoryPostingService.InventoryMovement;
import com.fido.modules.product.service.InventoryProductAccessService;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Objects;

@Component
class InventoryAdjustmentWorkflow {
    private static final int MAX_SQL_INT = Integer.MAX_VALUE;
    private final InventoryRepository inventories;
    private final InventoryTransactionRepository transactions;
    private final InventoryProductAccessService productAccess;
    private final OperationalWarehouseService operationalWarehouse;
    private final AuditWriteService audit;
    private final InventoryPostingService posting;

    InventoryAdjustmentWorkflow(
            InventoryRepository inventories,
            InventoryTransactionRepository transactions,
            InventoryProductAccessService productAccess,
            OperationalWarehouseService operationalWarehouse,
            AuditWriteService audit,
            InventoryPostingService posting) {
        this.inventories = inventories;
        this.transactions = transactions;
        this.productAccess = productAccess;
        this.operationalWarehouse = operationalWarehouse;
        this.audit = audit;
        this.posting = posting;
    }

    InventoryTransaction adjustManually(
            Long actor,
            Long productId,
            int quantityDelta,
            String reasonCode,
            String sourceOperationId,
            Integer expectedVersion) {
        requireAdjustmentCommand(actor, productId, quantityDelta, reasonCode, sourceOperationId);
        Long warehouseId = operationalWarehouse.requireOperationalWarehouseId();
        String semanticKey = adjustmentMovementKey(sourceOperationId);

        // Serialize writers for this Product, then use a locking read so MySQL REPEATABLE_READ
        // sees a committed winner even if warehouse resolution established an earlier snapshot.
        productAccess.lockTrackedProduct(productId);
        var prior = transactions.findByIdempotencyKeyForUpdate(semanticKey);
        if (prior.isPresent()) {
            if (matchesAdjustmentMovement(
                    prior.get(),
                    semanticKey,
                    actor,
                    warehouseId,
                    productId,
                    quantityDelta,
                    reasonCode)) {
                return prior.get();
            }
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "INVENTORY_IDEMPOTENCY_CONFLICT");
        }

        Inventory balance =
                inventories
                        .findByWarehouseIdAndProductIdForUpdate(warehouseId, productId)
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
        InventoryTransaction movement =
                posting.post(
                        new InventoryMovement(
                                actor,
                                warehouseId,
                                productId,
                                quantityDelta,
                                InventoryPolicy.ADJUSTMENT,
                                null,
                                null,
                                null,
                                reasonCode),
                        LocalDateTime.now(ZoneOffset.UTC),
                        semanticKey,
                        "INVENTORY_IDEMPOTENCY_CONFLICT");
        audit.record(
                AuditWriteEvent.withChanges(
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

    InventoryTransaction reverseAdjustment(
            Long actor, Long sourceTransactionId, String reasonCode, Integer expectedVersion) {
        if (actor == null
                || actor <= 0
                || sourceTransactionId == null
                || sourceTransactionId <= 0
                || !InventoryPolicy.isReversalReasonCode(reasonCode)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVENTORY_INVALID_MOVEMENT");
        }

        InventoryTransaction source =
                transactions
                        .findByTxnIdForUpdate(sourceTransactionId)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "INVENTORY_MOVEMENT_NOT_FOUND"));
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
        Inventory balance =
                inventories
                        .findByWarehouseIdAndProductIdForUpdate(warehouseId, productId)
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
        InventoryTransaction movement =
                posting.post(
                        new InventoryMovement(
                                actor,
                                warehouseId,
                                productId,
                                quantityDelta,
                                InventoryPolicy.ADJUSTMENT,
                                null,
                                null,
                                sourceTransactionId,
                                reasonCode),
                        LocalDateTime.now(ZoneOffset.UTC),
                        semanticKey,
                        "INVENTORY_SOURCE_CONFLICT");
        audit.record(
                AuditWriteEvent.withChanges(
                        AuditAction.INVENTORY_ADJUST,
                        AuditEntityType.INVENTORY_TRANSACTION,
                        movement.getTxnId().toString(),
                        Map.of(
                                "product_id",
                                productId,
                                "warehouse_id",
                                warehouseId,
                                "quantity_delta",
                                source.getQuantityDelta()),
                        Map.of(
                                "product_id",
                                productId,
                                "warehouse_id",
                                warehouseId,
                                "quantity_delta",
                                quantityDelta,
                                "reason_code",
                                reasonCode)));
        return movement;
    }

    private void requireAdjustmentCommand(
            Long actor,
            Long productId,
            int quantityDelta,
            String reasonCode,
            String sourceOperationId) {
        if (actor == null
                || actor <= 0
                || productId == null
                || productId <= 0
                || quantityDelta == 0
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
            InventoryTransaction movement,
            String semanticKey,
            Long actor,
            Long warehouseId,
            Long productId,
            int quantityDelta,
            String reasonCode) {
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
}
