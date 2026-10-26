package com.fido.modules.order.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
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

    @Transient private String recipientPhone;
    @Transient private String recipientEmail;
    @Transient private String recipientAddress;
    @Transient private Long subtotalSnapshot;
    @Transient private Long discountSnapshot;
    @Transient private Long shippingFeeSnapshot;
    @Transient private Long totalSnapshot;

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

    @Transient private String customerServiceNote;
    @Transient private String cancelReason;
    @Transient private LocalDateTime completedAt;
    @Transient private LocalDateTime returnedAt;

    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMP(6)", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        syncLegacyFields();
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (placedAt == null) placedAt = now;
        if (orderStatus == null) orderStatus = "PENDING";
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
        subtotalSnapshot = subtotal;
        discountSnapshot = discountAmount;
        shippingFeeSnapshot = shippingFee;
        totalSnapshot = totalAmount;
    }

    private void syncLegacyFields() {
        if (subtotal == null && subtotalSnapshot != null) subtotal = subtotalSnapshot;
        if (discountAmount == null && discountSnapshot != null) discountAmount = discountSnapshot;
        if (shippingFee == null && shippingFeeSnapshot != null) shippingFee = shippingFeeSnapshot;
        if (totalAmount == null && totalSnapshot != null) totalAmount = totalSnapshot;
        // Idempotency key and request fingerprint must come from the owning Order-create flow.
    }

    // Canonical snapshots are Long integer-VND values. These setters preserve source compatibility
    // for old tests while refusing fractional VND; production code uses the Long overloads.
    public void setSubtotalSnapshot(Long amount) { this.subtotalSnapshot = amount; }
    @Deprecated public void setSubtotalSnapshot(BigDecimal amount) { this.subtotalSnapshot = exactVnd(amount); }
    public void setDiscountSnapshot(Long amount) { this.discountSnapshot = amount; }
    @Deprecated public void setDiscountSnapshot(BigDecimal amount) { this.discountSnapshot = exactVnd(amount); }
    public void setShippingFeeSnapshot(Long amount) { this.shippingFeeSnapshot = amount; }
    @Deprecated public void setShippingFeeSnapshot(BigDecimal amount) { this.shippingFeeSnapshot = exactVnd(amount); }
    public void setTotalSnapshot(Long amount) { this.totalSnapshot = amount; }
    @Deprecated public void setTotalSnapshot(BigDecimal amount) { this.totalSnapshot = exactVnd(amount); }

    private static Long exactVnd(BigDecimal amount) {
        return amount == null ? null : amount.longValueExact();
    }
}
