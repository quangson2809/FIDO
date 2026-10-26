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

    @Transient private Long amountDue;
    @Transient private Long amountReceived;
    @Transient private Long amountRefunded;

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
        amountDue = amount;
        amountReceived = "PAID".equals(paymentStatus) ? amount : 0L;
        amountRefunded = refundAmount == null ? 0L : refundAmount;
    }

    private void syncAmounts() {
        if (amount == null && amountDue != null) amount = amountDue;
        if (refundAmount == null || refundAmount == 0L) {
            if (amountRefunded != null) refundAmount = amountRefunded;
        }
    }

    public void setAmountDue(Long amount) { this.amountDue = amount; }
    @Deprecated public void setAmountDue(BigDecimal amount) { this.amountDue = exactVnd(amount); }
    public void setAmountReceived(Long amount) { this.amountReceived = amount; }
    @Deprecated public void setAmountReceived(BigDecimal amount) { this.amountReceived = exactVnd(amount); }
    public void setAmountRefunded(Long amount) { this.amountRefunded = amount; }
    @Deprecated public void setAmountRefunded(BigDecimal amount) { this.amountRefunded = exactVnd(amount); }

    private static Long exactVnd(BigDecimal amount) {
        return amount == null ? null : amount.longValueExact();
    }
}
