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
    private Long variantId;

    @Transient
    private Integer availableQuantity;


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

    public Integer getAvailableQuantity() {
        return quantityOnHand;
    }

    public void setAvailableQuantity(Integer quantity) {
        this.quantityOnHand = quantity;
    }

    public static class InventoryId implements java.io.Serializable {
        private Long warehouseId;
        private Long variantId;

        public InventoryId() {}

        public InventoryId(Long warehouseId, Long variantId) {
            this.warehouseId = warehouseId;
            this.variantId = variantId;
        }

        @Override
        public boolean equals(Object other) {
            if (this == other) return true;
            if (!(other instanceof InventoryId that)) return false;
            return java.util.Objects.equals(warehouseId, that.warehouseId)
                    && java.util.Objects.equals(variantId, that.variantId);
        }

        @Override
        public int hashCode() {
            return java.util.Objects.hash(warehouseId, variantId);
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
