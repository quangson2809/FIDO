package com.fido.modules.order.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(
        name = "orders",
        uniqueConstraints = {
            @UniqueConstraint(name = "uq_orders_number", columnNames = {"order_number"}),
            @UniqueConstraint(name = "uq_orders_idempotency_key", columnNames = {"idempotency_key"})
        })
@Getter
@Setter
@NoArgsConstructor
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long orderId;

    @Column(name = "order_number", nullable = false, length = 40)
    private String orderCode;

    @Column(name = "account_id", nullable = false)
    private Long customerAccountId;


    @Column(name = "voucher_id")
    private Long voucherId;

    @Column(name = "idempotency_key", nullable = false, length = 120)
    private String idempotencyKey;

    @Column(name = "request_fingerprint", nullable = false, length = 64)
    private String requestFingerprint;

    @Column(name = "subtotal", nullable = false)
    private Long subtotal;

    @Column(name = "discount_amount", nullable = false)
    private Long discountAmount = 0L;

    @Column(name = "shipping_fee", nullable = false)
    private Long shippingFee = 0L;

    @Column(name = "total_amount", nullable = false)
    private Long totalAmount;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "VND";

    @Column(name = "placed_at", nullable = false, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime placedAt;

    @Column(name = "status", nullable = false, length = 30)
    private String orderStatus = "PENDING";


    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMP(6)", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (placedAt == null) placedAt = now;
        if (orderStatus == null) orderStatus = "PENDING";
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
