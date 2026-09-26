package com.fido.modules.order.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "orders", uniqueConstraints = {@UniqueConstraint(columnNames = {"order_code"})})
@Getter
@Setter
@NoArgsConstructor
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "order_code", nullable = false, length = 40)
    private String orderCode;

    @Column(name = "customer_account_id", nullable = true)
    private Long customerAccountId;

    @Column(name = "recipient_phone", nullable = false, length = 20)
    private String recipientPhone;

    @Column(name = "recipient_email", nullable = true, length = 254)
    private String recipientEmail;

    @Column(name = "recipient_address", nullable = false, length = 500)
    private String recipientAddress;

    @Column(name = "subtotal_snapshot", nullable = false, precision = 18, scale = 2)
    private BigDecimal subtotalSnapshot;

    @Column(name = "discount_snapshot", nullable = false, precision = 18, scale = 2)
    private BigDecimal discountSnapshot;

    @Column(name = "shipping_fee_snapshot", nullable = false, precision = 18, scale = 2)
    private BigDecimal shippingFeeSnapshot;

    @Column(name = "total_snapshot", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalSnapshot;

    @Column(name = "voucher_id", nullable = true)
    private Long voucherId;

    @Column(name = "order_status", nullable = false, length = 30)
    private String orderStatus;

    @Column(name = "customer_service_note", nullable = true, columnDefinition = "TEXT")
    private String customerServiceNote;

    @Column(name = "cancel_reason", nullable = true, length = 500)
    private String cancelReason;

    @Column(name = "completed_at", nullable = true, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime completedAt;

    @Column(name = "returned_at", nullable = true, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime returnedAt;

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
