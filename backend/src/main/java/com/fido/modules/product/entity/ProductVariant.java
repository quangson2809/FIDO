package com.fido.modules.product.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "product_variants", uniqueConstraints = {@UniqueConstraint(columnNames = {"product_id", "size_value_id", "color_id"}), @UniqueConstraint(columnNames = {"sku"})})
@Getter
@Setter
@NoArgsConstructor
public class ProductVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "variant_id", nullable = false)
    private Long variantId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "size_value_id", nullable = false)
    private Long sizeValueId;

    @Column(name = "color_id", nullable = false)
    private Long colorId;

    @Column(name = "sku", nullable = true, length = 100)
    private String sku;

    @Column(name = "override_price", nullable = true, precision = 18, scale = 2)
    private BigDecimal overridePrice;

    @Column(name = "sale_status", nullable = false, length = 30)
    private String saleStatus;

    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMP(6)", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
