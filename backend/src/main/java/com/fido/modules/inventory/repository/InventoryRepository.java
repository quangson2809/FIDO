package com.fido.modules.inventory.repository;

import com.fido.modules.inventory.entity.Inventory;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface InventoryRepository extends Repository<Inventory, Long> {

    Optional<Inventory> findById(Long id);

    List<Inventory> findAllByVariantIdIn(
            Collection<Long> variantIds
    );

    Inventory save(Inventory entity);

    @Query(
            value = """
                    SELECT
                        variant.variant_id AS variantId,
                        variant.sku AS sku,
                        product.product_id AS productId,
                        product.name AS productName,
                        size_value.display_name AS size,
                        color.name AS color,
                        variant.sale_status AS saleStatus,
                        inventory.available_quantity AS availableQuantity,
                        inventory.updated_at AS updatedAt
                    FROM inventories inventory
                    JOIN product_variants variant
                        ON variant.variant_id = inventory.variant_id
                    JOIN products product
                        ON product.product_id = variant.product_id
                    JOIN size_values size_value
                        ON size_value.size_value_id = variant.size_value_id
                    JOIN colors color
                        ON color.color_id = variant.color_id
                    WHERE (:variantId IS NULL OR variant.variant_id = :variantId)
                      AND (:sku IS NULL OR variant.sku = :sku)
                      AND (:productId IS NULL OR product.product_id = :productId)
                      AND (:sizeValueId IS NULL OR variant.size_value_id = :sizeValueId)
                      AND (:colorId IS NULL OR variant.color_id = :colorId)
                    ORDER BY variant.variant_id
                    """,
            countQuery = """
                    SELECT COUNT(*)
                    FROM inventories inventory
                    JOIN product_variants variant
                        ON variant.variant_id = inventory.variant_id
                    JOIN products product
                        ON product.product_id = variant.product_id
                    WHERE (:variantId IS NULL OR variant.variant_id = :variantId)
                      AND (:sku IS NULL OR variant.sku = :sku)
                      AND (:productId IS NULL OR product.product_id = :productId)
                      AND (:sizeValueId IS NULL OR variant.size_value_id = :sizeValueId)
                      AND (:colorId IS NULL OR variant.color_id = :colorId)
                    """,
            nativeQuery = true
    )
    Page<InventoryRowView> search(
            @Param("variantId") Long variantId,
            @Param("sku") String sku,
            @Param("productId") Long productId,
            @Param("sizeValueId") Long sizeValueId,
            @Param("colorId") Long colorId,
            Pageable pageable
    );


    @Modifying(
            flushAutomatically = true
    )
    @Query("""
            update Inventory inventory
            set inventory.availableQuantity =
                    inventory.availableQuantity + :quantity,
                inventory.updatedAt = :updatedAt
            where inventory.variantId = :variantId
            """)
    int increment(
            @Param("variantId") Long variantId,
            @Param("quantity") int quantity,
            @Param("updatedAt") LocalDateTime updatedAt
    );

    @Modifying(
            flushAutomatically = true
    )
    @Query("""
            update Inventory inventory
            set inventory.availableQuantity =
                    inventory.availableQuantity + :delta,
                inventory.updatedAt = :updatedAt
            where inventory.variantId = :variantId
              and inventory.availableQuantity + :delta >= 0
            """)
    int adjustIfNonNegative(
            @Param("variantId") Long variantId,
            @Param("delta") int delta,
            @Param("updatedAt") LocalDateTime updatedAt
    );
}
