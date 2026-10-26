package com.fido.modules.order.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long orderId;

    @Column(name = "order_number", nullable = true, length = 64)
    private String orderCode;

    @Column(name = "account_id", nullable = false)
    private Long customerAccountId;

    @Transient
    private String recipientPhone;

    @Transient
    private String recipientEmail;

    @Transient
    private String recipientAddress;

    @Transient
    private BigDecimal subtotalSnapshot;

    @Transient
    private BigDecimal discountSnapshot;

    @Transient
    private BigDecimal shippingFeeSnapshot;

    @Transient
    private BigDecimal totalSnapshot;

    @Column(name = "voucher_id", nullable = true)
    private Long voucherId;

    @Column(name = "idempotency_key", nullable = false, length = 120, unique = true)
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
    private String orderStatus;

    @Transient
    private String customerServiceNote;

    @Transient
    private String cancelReason;

    @Transient
    private LocalDateTime completedAt;

    @Transient
    private LocalDateTime returnedAt;

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
        if (placedAt == null) placedAt = now;
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
        subtotalSnapshot = subtotal == null ? null : BigDecimal.valueOf(subtotal);
        discountSnapshot = discountAmount == null ? null : BigDecimal.valueOf(discountAmount);
        shippingFeeSnapshot = shippingFee == null ? null : BigDecimal.valueOf(shippingFee);
        totalSnapshot = totalAmount == null ? null : BigDecimal.valueOf(totalAmount);
    }

    private void syncLegacyFields() {
        if (subtotal == null && subtotalSnapshot != null) subtotal = subtotalSnapshot.longValue();
        if (discountAmount == null && discountSnapshot != null) discountAmount = discountSnapshot.longValue();
        if (shippingFee == null && shippingFeeSnapshot != null) shippingFee = shippingFeeSnapshot.longValue();
        if (totalAmount == null && totalSnapshot != null) totalAmount = totalSnapshot.longValue();
        // idempotency_key and request_fingerprint are required by the canonical schema.
        // They must be supplied by the checkout flow; the entity must not fabricate values.
    }
}
