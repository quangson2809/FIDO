package com.fido.modules.order.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
@Immutable
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_item_id", nullable = false, updatable = false)
    private Long orderItemId;

    @Column(name = "order_id", nullable = false, updatable = false)
    private Long orderId;

    @Column(name = "variant_id", nullable = false, updatable = false)
    private Long variantId;

    @Column(name = "product_name_snapshot", nullable = false, length = 255, updatable = false)
    private String productNameSnapshot;

    @Column(name = "sku_snapshot", nullable = true, length = 100, updatable = false)
    private String skuSnapshot;

    @Column(name = "size_snapshot", nullable = false, length = 50, updatable = false)
    private String sizeSnapshot;

    @Column(name = "color_snapshot", nullable = false, length = 80, updatable = false)
    private String colorSnapshot;

    @Column(name = "unit_price_snapshot", nullable = false, precision = 18, scale = 2, updatable = false)
    private BigDecimal unitPriceSnapshot;

    @Column(name = "quantity", nullable = false, updatable = false)
    private Integer quantity;

    @Column(name = "line_total_snapshot", nullable = false, precision = 18, scale = 2, updatable = false)
    private BigDecimal lineTotalSnapshot;

    @Column(name = "image_url_snapshot", nullable = true, length = 1000, updatable = false)
    private String imageUrlSnapshot;
}
