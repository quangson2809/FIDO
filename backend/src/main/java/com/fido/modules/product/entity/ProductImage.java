package com.fido.modules.product.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "product_images")
@Getter
@Setter
@NoArgsConstructor
public class ProductImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long imageId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "image_url", nullable = false, length = 1000)
    private String imageUrl;

    @Column(name = "is_primary", nullable = false)
    private Boolean isPrimary = false;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMP(6)", updatable = false)
    private java.time.LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = java.time.LocalDateTime.now(java.time.ZoneOffset.UTC);
        }
        if (sortOrder == null) {
            sortOrder = 0;
        }
        synchronizePrimaryWithPosition();
    }

    @PreUpdate
    void onUpdate() {
        synchronizePrimaryWithPosition();
    }

    private void synchronizePrimaryWithPosition() {
        isPrimary = sortOrder != null && sortOrder == 0;
    }
}
