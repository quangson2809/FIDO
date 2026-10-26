package com.fido.modules.product.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(
        name = "products",
        uniqueConstraints = @UniqueConstraint(name = "uq_products_sku", columnNames = {"sku"}))
@Getter
@Setter
@NoArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long productId;

    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "brand_id")
    private Long brandId;

    @Column(name = "parent_product_id")
    private Long parentProductId;

    @Column(name = "slug", length = 200)
    private String slug;

    @Column(name = "sku", nullable = false, length = 100)
    private String sku;

    @Column(name = "selling_price", nullable = false)
    private Long sellingPrice;

    @Column(name = "cost_price")
    private Long costPrice;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "DRAFT";

    @Column(name = "deleted_at", columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime deletedAt;

    @Transient
    private Long sizeSystemId;

    @Column(name = "name", length = 255)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
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
        basePrice = sellingPrice == null ? null : BigDecimal.valueOf(sellingPrice);
        saleStatus = status;
    }

    private void syncLegacyFields() {
        if (sellingPrice == null && basePrice != null) {
            sellingPrice = basePrice.longValueExact();
        }
        if (basePrice == null && sellingPrice != null) {
            basePrice = BigDecimal.valueOf(sellingPrice);
        }
        if (status == null || status.isBlank()) {
            status = mapLegacyStatus(saleStatus);
        }
        if (saleStatus == null || saleStatus.isBlank()) {
            saleStatus = status;
        }
    }

    private static String mapLegacyStatus(String legacyStatus) {
        if (legacyStatus == null || legacyStatus.isBlank()) return "DRAFT";
        return switch (legacyStatus) {
            case "ACTIVE", "INACTIVE", "DRAFT", "ARCHIVED" -> legacyStatus;
            case "ON_SALE", "AVAILABLE" -> "ACTIVE";
            case "OFF_SALE", "UNAVAILABLE" -> "INACTIVE";
            default -> "DRAFT";
        };
    }
}
