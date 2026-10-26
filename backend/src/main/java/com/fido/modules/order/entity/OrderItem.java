package com.fido.modules.order.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Immutable;
import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
@Immutable
public class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false, updatable = false)
    private Long orderItemId;

    @Column(name = "order_id", nullable = false, updatable = false)
    private Long orderId;

    @Column(name = "product_id", nullable = false, updatable = false)
    private Long productId;

    @Column(name = "product_name_snapshot", nullable = false, length = 255, updatable = false)
    private String productNameSnapshot;

    @Column(name = "sku_snapshot", nullable = false, length = 100, updatable = false)
    private String skuSnapshot;

    @Transient
    private BigDecimal unitPriceSnapshot;

    @Column(name = "unit_price", nullable = false, updatable = false)
    private Long unitPrice;

    @Column(name = "quantity", nullable = false, updatable = false)
    private Integer quantity;

    @Transient
    private BigDecimal lineTotalSnapshot;

    @Column(name = "discount_amount", nullable = false, updatable = false)
    private Long discountAmount = 0L;

    @Column(name = "line_total", nullable = false, updatable = false)
    private Long lineTotal;

    @Column(name = "attribute_snapshot", nullable = false, length = 2000, updatable = false)
    private String attributeSnapshot = "{}";

    @Column(name = "image_url_snapshot", nullable = false, length = 1000, updatable = false)
    private String imageUrlSnapshot;

    @PrePersist
    void onCreate() {
        if (unitPrice == null && unitPriceSnapshot != null) unitPrice = unitPriceSnapshot.longValueExact();
        if (lineTotal == null && lineTotalSnapshot != null) lineTotal = lineTotalSnapshot.longValueExact();
        if (discountAmount == null) discountAmount = 0L;
        if (attributeSnapshot == null) attributeSnapshot = "{}";
        if (imageUrlSnapshot == null) imageUrlSnapshot = "";
    }

    @PostLoad
    void onLoad() {
        unitPriceSnapshot = unitPrice == null ? null : BigDecimal.valueOf(unitPrice);
        lineTotalSnapshot = lineTotal == null ? null : BigDecimal.valueOf(lineTotal);
    }
}
