package com.fido.modules.inventory.repository;

import com.fido.modules.inventory.entity.Inventory;

import jakarta.persistence.LockModeType;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select inventory from Inventory inventory
            where inventory.warehouseId = :warehouseId
              and inventory.productId = :productId
            """)
    Optional<Inventory> findByWarehouseIdAndProductIdForUpdate(
            @Param("warehouseId") Long warehouseId,
            @Param("productId") Long productId);

    List<Inventory> findAllByProductIdIn(Collection<Long> productIds);
    List<Inventory> findAllByWarehouseIdAndProductIdIn(Long warehouseId, Collection<Long> productIds);
    Inventory save(Inventory entity);

    @Query(value = """
            SELECT warehouse.id AS warehouseId,
                   product.id AS productId,
                   product.sku AS sku,
                   product.name AS productName,
                   COALESCE(inventory.quantity_on_hand, 0) AS availableQuantity,
                   COALESCE(inventory.version, 0) AS version,
                   inventory.updated_at AS updatedAt
            FROM products product
            JOIN warehouses warehouse ON (:warehouseId IS NULL OR warehouse.id = :warehouseId)
            LEFT JOIN inventories inventory
              ON inventory.warehouse_id = warehouse.id
             AND inventory.product_id = product.id
            WHERE (:productId IS NULL OR product.id = :productId)
              AND (:sku IS NULL OR product.sku = :sku)
            ORDER BY product.id, warehouse.id
            """,
            countQuery = """
            SELECT COUNT(*)
            FROM products product
            JOIN warehouses warehouse ON (:warehouseId IS NULL OR warehouse.id = :warehouseId)
            WHERE (:productId IS NULL OR product.id = :productId)
              AND (:sku IS NULL OR product.sku = :sku)
            """,
            nativeQuery = true)
    Page<InventoryRowView> search(
            @Param("productId") Long productId,
            @Param("sku") String sku,
            @Param("warehouseId") Long warehouseId,
            Pageable pageable);

    @Modifying(flushAutomatically = true)
    @Query(value = """
            UPDATE inventories
            SET quantity_on_hand = quantity_on_hand + :quantityDelta,
                updated_at = :updatedAt,
                version = version + 1
            WHERE warehouse_id = :warehouseId
              AND product_id = :productId
              AND quantity_on_hand >= 0
              AND version >= 0
              AND version < :maxVersion
              AND CAST(quantity_on_hand AS SIGNED) + :quantityDelta >= 0
              AND CAST(quantity_on_hand AS SIGNED) + :quantityDelta <= :maxQuantity
            """, nativeQuery = true)
    int applyBalanceDeltaGuarded(
            @Param("warehouseId") Long warehouseId,
            @Param("productId") Long productId,
            @Param("quantityDelta") int quantityDelta,
            @Param("updatedAt") LocalDateTime updatedAt,
            @Param("maxQuantity") int maxQuantity,
            @Param("maxVersion") int maxVersion);
}
