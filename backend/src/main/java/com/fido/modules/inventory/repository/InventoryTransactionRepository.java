package com.fido.modules.inventory.repository;

import com.fido.modules.inventory.entity.InventoryTransaction;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
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
