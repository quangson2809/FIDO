package com.fido.modules.inventory.repository;

import com.fido.modules.inventory.entity.InventoryTransaction;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

/** InventoryTransaction is an append-only ledger; this repository exposes no update/delete API. */
public interface InventoryTransactionRepository
        extends Repository<InventoryTransaction, Long>, JpaSpecificationExecutor<InventoryTransaction> {

    InventoryTransaction save(InventoryTransaction entity);

    java.util.Optional<InventoryTransaction> findByIdempotencyKey(String idempotencyKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select movement from InventoryTransaction movement where movement.txnId = :transactionId")
    java.util.Optional<InventoryTransaction> findByTxnIdForUpdate(
            @Param("transactionId") Long transactionId);

    List<InventoryTransaction> findAllByReversesTransactionId(Long reversesTransactionId);

    List<InventoryTransaction> findAllByGoodsReceiptItemIdAndTransactionType(
            Long goodsReceiptItemId, String transactionType);

    List<InventoryTransaction> findAllByWarehouseIdAndProductIdAndTransactionType(
            Long warehouseId, Long productId, String transactionType);

    List<InventoryTransaction> findAllByWarehouseIdAndProductIdOrderByTxnIdAsc(
            Long warehouseId, Long productId);

    List<InventoryTransaction> findAllByOrderItemIdInAndTransactionType(
            Collection<Long> orderItemIds, String transactionType);

    @Query(
            value = """
                    SELECT pair_keys.warehouse_id AS warehouseId,
                           pair_keys.product_id AS productId,
                           COALESCE(inventory.quantity_on_hand, 0) AS balanceQuantity,
                           COALESCE(inventory.version, 0) AS balanceVersion,
                           COALESCE(SUM(movement.quantity_delta), 0) AS ledgerQuantity,
                           COUNT(movement.id) AS movementCount,
                           CASE WHEN COALESCE(inventory.quantity_on_hand, 0)
                                     = COALESCE(SUM(movement.quantity_delta), 0)
                                THEN TRUE ELSE FALSE END AS quantityMatches,
                           CASE WHEN COALESCE(inventory.version, 0) = COUNT(movement.id)
                                THEN TRUE ELSE FALSE END AS versionMatches
                    FROM (
                        SELECT warehouse_id, product_id FROM inventories
                        UNION
                        SELECT warehouse_id, product_id FROM inventory_transactions
                    ) pair_keys
                    LEFT JOIN inventories inventory
                      ON inventory.warehouse_id = pair_keys.warehouse_id
                     AND inventory.product_id = pair_keys.product_id
                    LEFT JOIN inventory_transactions movement
                      ON movement.warehouse_id = pair_keys.warehouse_id
                     AND movement.product_id = pair_keys.product_id
                    GROUP BY pair_keys.warehouse_id, pair_keys.product_id,
                             inventory.quantity_on_hand, inventory.version
                    ORDER BY pair_keys.warehouse_id, pair_keys.product_id
                    """,
            countQuery = """
                    SELECT COUNT(*) FROM (
                        SELECT warehouse_id, product_id FROM inventories
                        UNION
                        SELECT warehouse_id, product_id FROM inventory_transactions
                    ) pair_keys
                    """,
            nativeQuery = true)
    org.springframework.data.domain.Page<InventoryReconciliationView> reconcile(
            org.springframework.data.domain.Pageable pageable);

    @Query(
            value = """
                    SELECT EXISTS (
                        SELECT 1
                        FROM inventory_transactions movement
                        JOIN order_items item ON item.id = movement.order_item_id
                        WHERE item.order_id = :orderId
                          AND movement.transaction_type = :transactionType
                    )
                    """,
            nativeQuery = true)
    boolean existsByOrderIdAndTransactionType(
            @Param("orderId") Long orderId, @Param("transactionType") String transactionType);
}
