package com.fido.modules.product.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
public class ProductVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long variantId;

    @Column(name = "parent_product_id", nullable = true)
    private Long productId;

    @Transient
    private Long sizeValueId;

    @Transient
    private Long colorId;

    @Column(name = "sku", nullable = false, length = 100)
    private String sku;

    @Transient
    private BigDecimal overridePrice;

    @Column(name = "selling_price", nullable = false)
    private Long sellingPrice;

    @Column(name = "status", nullable = false, length = 20)
    private String saleStatus;

    @Column(
            name = "created_at",
            nullable = false,
            columnDefinition = "TIMESTAMP(6)",
            updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        syncLegacyFields();
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        syncLegacyFields();
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    @PostLoad
    void onLoad() {
        overridePrice = sellingPrice == null ? null : BigDecimal.valueOf(sellingPrice);
        saleStatus = "ACTIVE";
    }

    private void syncLegacyFields() {
        if (sellingPrice == null && overridePrice != null) sellingPrice = overridePrice.longValue();
        if (saleStatus == null || saleStatus.isBlank()) saleStatus = "ACTIVE";
    }
}
