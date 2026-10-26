package com.fido.modules.order.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
public class Payment {

    @Id
    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "method", nullable = false, length = 30)
    private String method = "COD";

    @Column(name = "payment_status", nullable = false, length = 20)
    private String paymentStatus = "UNPAID";

    @Column(name = "amount", nullable = false)
    private Long amount;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "VND";

    @Column(name = "refund_amount", nullable = false)
    private Long refundAmount = 0L;

    @Column(name = "refund_reason", length = 500)
    private String refundReason;

    @Transient
    private BigDecimal amountDue;

    @Transient
    private BigDecimal amountReceived;

    @Transient
    private BigDecimal amountRefunded;

    @Column(name = "collected_by_account_id", nullable = true)
    private Long collectedByAccountId;

    @Column(name = "collected_at", nullable = true, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime collectedAt;

    @Column(name = "refunded_by_account_id", nullable = true)
    private Long refundedByAccountId;

    @Column(name = "refunded_at", nullable = true, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime refundedAt;

    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMP(6)", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        syncAmounts();
        LocalDateTime now = LocalDateTime.now(java.time.ZoneOffset.UTC);
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        syncAmounts();
        updatedAt = LocalDateTime.now(java.time.ZoneOffset.UTC);
    }

    @PostLoad
    void onLoad() {
        amountDue = amount == null ? null : BigDecimal.valueOf(amount);
        amountReceived = "PAID".equals(paymentStatus) && amount != null ? BigDecimal.valueOf(amount) : BigDecimal.ZERO;
        amountRefunded = refundAmount == null ? BigDecimal.ZERO : BigDecimal.valueOf(refundAmount);
    }

    private void syncAmounts() {
        if (amount == null && amountDue != null) amount = amountDue.longValue();
        if (refundAmount == null || refundAmount == 0L) {
            if (amountRefunded != null) refundAmount = amountRefunded.longValue();
        }
    }
}
