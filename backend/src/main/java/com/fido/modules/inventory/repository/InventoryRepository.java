package com.fido.modules.inventory.repository;

import com.fido.modules.inventory.entity.Inventory;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface InventoryRepository extends Repository<Inventory, Inventory.InventoryId> {

    Optional<Inventory> findByWarehouseIdAndProductId(Long warehouseId, Long productId);

    List<Inventory> findAllByProductIdIn(Collection<Long> productIds);

    Inventory save(Inventory entity);

    @Query(
            value =
                    """
                    SELECT inventory.warehouse_id AS warehouseId,
                           inventory.product_id AS productId,
                           product.sku AS sku,
                           product.name AS productName,
                           inventory.quantity_on_hand AS availableQuantity,
                           inventory.updated_at AS updatedAt
                    FROM inventories inventory
                    JOIN products product ON product.id = inventory.product_id
                    WHERE (:productId IS NULL OR inventory.product_id = :productId)
                      AND (:sku IS NULL OR product.sku = :sku)
                      AND (:warehouseId IS NULL OR inventory.warehouse_id = :warehouseId)
                    ORDER BY inventory.product_id, inventory.warehouse_id
                    """,
            countQuery =
                    """
                    SELECT COUNT(*)
                    FROM inventories inventory
                    JOIN products product ON product.id = inventory.product_id
                    WHERE (:productId IS NULL OR inventory.product_id = :productId)
                      AND (:sku IS NULL OR product.sku = :sku)
                      AND (:warehouseId IS NULL OR inventory.warehouse_id = :warehouseId)
                    """,
            nativeQuery = true)
    Page<InventoryRowView> search(
            @Param("productId") Long productId,
            @Param("sku") String sku,
            @Param("warehouseId") Long warehouseId,
            Pageable pageable);

    @Modifying(flushAutomatically = true)
    @Query(
            """
            update Inventory inventory
            set inventory.quantityOnHand = inventory.quantityOnHand + :quantity,
                inventory.updatedAt = :updatedAt,
                inventory.version = inventory.version + 1
            where inventory.warehouseId = :warehouseId
              and inventory.productId = :productId
            """)
    int increment(
            @Param("warehouseId") Long warehouseId,
            @Param("productId") Long productId,
            @Param("quantity") int quantity,
            @Param("updatedAt") LocalDateTime updatedAt);

    @Modifying(flushAutomatically = true)
    @Query(
            """
            update Inventory inventory
            set inventory.quantityOnHand = inventory.quantityOnHand + :delta,
                inventory.updatedAt = :updatedAt,
                inventory.version = inventory.version + 1
            where inventory.warehouseId = :warehouseId
              and inventory.productId = :productId
              and inventory.quantityOnHand + :delta >= 0
            """)
    int adjustIfNonNegative(
            @Param("warehouseId") Long warehouseId,
            @Param("productId") Long productId,
            @Param("delta") int delta,
            @Param("updatedAt") LocalDateTime updatedAt);
}
