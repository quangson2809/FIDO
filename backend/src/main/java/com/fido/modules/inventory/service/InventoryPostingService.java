package com.fido.modules.inventory.service;

import com.fido.modules.inventory.entity.Inventory;
import com.fido.modules.inventory.entity.InventoryTransaction;
import com.fido.modules.inventory.repository.InventoryRepository;
import com.fido.modules.inventory.repository.InventoryTransactionRepository;
import com.fido.modules.inventory.service.InventoryCommandService.StockLine;
import com.fido.modules.product.service.InventoryProductAccessService;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Component
class InventoryPostingService {
    private static final int MAX_SQL_INT = Integer.MAX_VALUE;
    private final EntityManager em;
    private final InventoryRepository inventories;
    private final InventoryTransactionRepository transactions;
    private final InventoryProductAccessService productAccess;

    InventoryPostingService(
            EntityManager em,
            InventoryRepository inventories,
            InventoryTransactionRepository transactions,
            InventoryProductAccessService productAccess) {
        this.em = em;
        this.inventories = inventories;
        this.transactions = transactions;
        this.productAccess = productAccess;
    }

    InventoryTransaction post(InventoryMovement movement, LocalDateTime now, String key) {
        return post(movement, now, key, null);
    }

    InventoryTransaction post(
            InventoryMovement movement, LocalDateTime now, String key, String ledgerConflictCode) {
        applyBalanceDelta(
                movement.warehouseId(), movement.productId(), movement.quantityDelta(), now);
        try {
            return record(movement, key);
        } catch (org.springframework.dao.DataIntegrityViolationException failure) {
            if (ledgerConflictCode == null) throw failure;
            throw new ResponseStatusException(HttpStatus.CONFLICT, ledgerConflictCode);
        }
    }

    private void applyBalanceDelta(
            Long warehouseId, Long productId, int quantityDelta, LocalDateTime now) {
        if (quantityDelta == 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);

        productAccess.lockTrackedProduct(productId);

        Inventory balance =
                inventories
                        .findByWarehouseIdAndProductIdForUpdate(warehouseId, productId)
                        .orElse(null);
        if (balance == null) {
            if (quantityDelta < 0) throw new ResponseStatusException(HttpStatus.CONFLICT);
            ensureInventoryRow(warehouseId, productId);
            balance =
                    inventories
                            .findByWarehouseIdAndProductIdForUpdate(warehouseId, productId)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT));
        }
        em.refresh(balance, LockModeType.PESSIMISTIC_WRITE);

        int updated =
                inventories.applyBalanceDeltaGuarded(
                        warehouseId, productId, quantityDelta, now, MAX_SQL_INT, MAX_SQL_INT);
        if (updated != 1) throw new ResponseStatusException(HttpStatus.CONFLICT);

        // Keep a balance entity already loaded by the caller's persistence context in sync.
        em.refresh(balance);
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

    static List<StockLine> ordered(List<StockLine> lines) {
        return lines.stream()
                .sorted(
                        Comparator.comparing(StockLine::productId)
                                .thenComparing(
                                        line ->
                                                line.orderItemId() != null
                                                        ? line.orderItemId()
                                                        : line.goodsReceiptItemId() != null
                                                                ? line.goodsReceiptItemId()
                                                                : 0L))
                .toList();
    }

    static String normalize(String reason) {
        if (reason == null || reason.isBlank()) return null;
        String trimmed = reason.trim();
        return trimmed.length() <= 80 ? trimmed : trimmed.substring(0, 80);
    }

    record InventoryMovement(
            Long actor,
            Long warehouseId,
            Long productId,
            int quantityDelta,
            String transactionType,
            Long orderItemId,
            Long goodsReceiptItemId,
            Long reversesTransactionId,
            String reason) {}
}
