package com.fido.modules.order.entity;

import com.fido.common.exception.BusinessRuleException;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
public class Payment {
    public static final String UNPAID = "UNPAID";
    public static final String PAID = "PAID";
    public static final String REFUNDED = "REFUNDED";

    @Id
    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "payment_status", nullable = false, length = 20)
    @Setter(AccessLevel.NONE)
    private String paymentStatus = "UNPAID";

    @Column(name = "amount", nullable = false)
    private Long amount;

    @Column(name = "refund_amount", nullable = false)
    @Setter(AccessLevel.NONE)
    private Long refundAmount = 0L;

    @Column(name = "refund_reason", length = 500)
    @Setter(AccessLevel.NONE)
    private String refundReason;

    @Column(name = "collected_by_account_id", nullable = true)
    @Setter(AccessLevel.NONE)
    private Long collectedByAccountId;

    @Column(name = "collected_at", nullable = true, columnDefinition = "TIMESTAMP(6)")
    @Setter(AccessLevel.NONE)
    private LocalDateTime collectedAt;

    @Column(name = "refunded_by_account_id", nullable = true)
    @Setter(AccessLevel.NONE)
    private Long refundedByAccountId;

    @Column(name = "refunded_at", nullable = true, columnDefinition = "TIMESTAMP(6)")
    @Setter(AccessLevel.NONE)
    private LocalDateTime refundedAt;

    @Column(
            name = "created_at",
            nullable = false,
            columnDefinition = "TIMESTAMP(6)",
            updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime updatedAt;

    public boolean isUncollected() {
        return UNPAID.equals(paymentStatus)
                && Objects.equals(refundAmount, 0L)
                && collectedByAccountId == null
                && collectedAt == null
                && refundedByAccountId == null
                && refundedAt == null
                && refundReason == null;
    }

    public boolean isCollected() {
        return PAID.equals(paymentStatus)
                && Objects.equals(refundAmount, 0L)
                && collectedByAccountId != null
                && collectedAt != null
                && refundedByAccountId == null
                && refundedAt == null
                && refundReason == null;
    }

    public void collectCod(Long actor, LocalDateTime now) {
        if (REFUNDED.equals(paymentStatus)) {
            throw BusinessRuleException.conflict("PAYMENT_ALREADY_REFUNDED");
        }
        if (PAID.equals(paymentStatus)) {
            throw BusinessRuleException.conflict("PAYMENT_ALREADY_COLLECTED");
        }
        if (!isUncollected() || amount == null || actor == null || actor <= 0 || now == null) {
            throw BusinessRuleException.conflict("ORDER_COD_COLLECTION_NOT_ALLOWED");
        }
        paymentStatus = PAID;
        collectedByAccountId = actor;
        collectedAt = now;
    }

    public void refundFull(Long actor, String reason, LocalDateTime now) {
        if (REFUNDED.equals(paymentStatus)) {
            throw BusinessRuleException.conflict("PAYMENT_ALREADY_REFUNDED");
        }
        if (!isCollected() || amount == null) {
            throw BusinessRuleException.conflict("ORDER_AFTER_SALES_NOT_ALLOWED");
        }
        if (actor == null || actor <= 0 || reason == null || reason.isBlank() || now == null) {
            throw BusinessRuleException.invalid("ORDER_REFUND_REASON_REQUIRED");
        }
        paymentStatus = REFUNDED;
        refundAmount = amount;
        refundedByAccountId = actor;
        refundedAt = now;
        refundReason = reason.trim();
    }

    @PrePersist
    void onCreate() {
        if (refundAmount == null) refundAmount = 0L;
        LocalDateTime now = LocalDateTime.now(java.time.ZoneOffset.UTC);
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        if (refundAmount == null) refundAmount = 0L;
        updatedAt = LocalDateTime.now(java.time.ZoneOffset.UTC);
    }
}
