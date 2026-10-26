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
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long productId;

    @Column(name = "category_id", nullable = true)
    private Long categoryId;

    @Column(name = "brand_id", nullable = true)
    private Long brandId;

    @Column(name = "parent_product_id")
    private Long parentProductId;

    @Column(name = "slug", length = 200)
    private String slug;

    @Column(name = "sku", nullable = false, length = 100)
    private String sku;

    @Column(name = "selling_price", nullable = false)
    private BigDecimal sellingPrice;

    @Column(name = "cost_price")
    private BigDecimal costPrice;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "DRAFT";

    @Column(name = "deleted_at", columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime deletedAt;

    @Transient
    private Long sizeSystemId;

    @Column(name = "name", nullable = true, length = 255)
    private String name;

    @Column(name = "description", nullable = true, columnDefinition = "TEXT")
    private String description;

    @Transient
    private String gender;

    @Transient
    private String season;

    @Transient
    private String style;

    @Transient
    private String materialCare;

    @Transient
    private BigDecimal basePrice;

    @Transient
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
        basePrice = sellingPrice;
        saleStatus = status;
    }

    private void syncLegacyFields() {
        if (sellingPrice == null && basePrice != null) sellingPrice = basePrice;
        if (status == null || status.isBlank()) {
            status = (saleStatus == null || saleStatus.isBlank()) ? "DRAFT" : saleStatus;
        }
    }
}
