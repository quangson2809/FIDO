package com.fido.modules.inventory.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "inventories")
@IdClass(Inventory.InventoryId.class)
@Getter
@Setter
@NoArgsConstructor
public class Inventory {

    @Id
    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Id
    @Column(name = "warehouse_id", nullable = false)
    private Long warehouseId;

    @Column(name = "quantity_on_hand", nullable = false)
    private Integer quantityOnHand = 0;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version = 0;

    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime updatedAt;

    public static class InventoryId implements java.io.Serializable {
        private Long productId;
        private Long warehouseId;

        public InventoryId() {}

        public InventoryId(Long warehouseId, Long productId) {
            this.warehouseId = warehouseId;
            this.productId = productId;
        }

        @Override
        public boolean equals(Object other) {
            if (this == other) return true;
            if (!(other instanceof InventoryId that)) return false;
            return java.util.Objects.equals(warehouseId, that.warehouseId)
                    && java.util.Objects.equals(productId, that.productId);
        }

        @Override
        public int hashCode() {
            return java.util.Objects.hash(warehouseId, productId);
        }
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
