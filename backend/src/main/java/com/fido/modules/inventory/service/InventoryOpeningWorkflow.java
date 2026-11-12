package com.fido.modules.inventory.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;
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
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Component
class InventoryOpeningWorkflow {
    private final InventoryRepository inventories;
    private final InventoryTransactionRepository transactions;
    private final InventoryProductAccessService productAccess;
    private final OperationalWarehouseService operationalWarehouse;
    private final AuditWriteService audit;
    private final InventoryPostingService posting;

    InventoryOpeningWorkflow(
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

    InventoryTransaction openStock(Long actor, Long productId, int openingQuantity) {
        if (actor == null
                || actor <= 0
                || productId == null
                || productId <= 0
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
                    && matchesOpeningMovement(
                            existing, semanticKey, warehouseId, productId, openingQuantity)) {
                return existing;
            }
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "INVENTORY_IDEMPOTENCY_CONFLICT");
        }
        if (!openings.isEmpty()
                || !transactions
                        .findAllByWarehouseIdAndProductIdOrderByTxnIdAsc(warehouseId, productId)
                        .isEmpty()) {
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
        InventoryTransaction movement =
                posting.post(
                        new InventoryMovement(
                                actor,
                                warehouseId,
                                productId,
                                openingQuantity,
                                InventoryPolicy.OPENING,
                                null,
                                null,
                                null,
                                "OPENING"),
                        LocalDateTime.now(ZoneOffset.UTC),
                        semanticKey);
        audit.record(
                AuditWriteEvent.withChanges(
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

    private boolean matchesOpeningMovement(
            InventoryTransaction existing,
            String semanticKey,
            Long warehouseId,
            Long productId,
            int openingQuantity) {
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

    private String openingMovementKey(Long warehouseId, Long productId) {
        return "opening:" + warehouseId + ":" + productId;
    }
}
