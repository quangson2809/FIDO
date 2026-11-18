package com.fido.modules.order.entity;

import com.fido.common.exception.BusinessRuleException;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Set;

@Entity
@Table(
        name = "orders",
        uniqueConstraints = {
            @UniqueConstraint(
                    name = "uq_orders_number",
                    columnNames = {"order_number"}),
            @UniqueConstraint(
                    name = "uq_orders_idempotency_key",
                    columnNames = {"idempotency_key"})
        })
@Getter
@Setter
@NoArgsConstructor
public class Order {
    public static final String PENDING = "PENDING";
    public static final String CONFIRMED = "CONFIRMED";
    public static final String PREPARING = "PREPARING";
    public static final String SHIPPING = "SHIPPING";
    public static final String COMPLETED = "COMPLETED";
    public static final String DELIVERY_FAILED = "DELIVERY_FAILED";
    public static final String CANCELLED = "CANCELLED";
    public static final String RETURNED = "RETURNED";

    private static final Map<String, Set<String>> TRANSITIONS =
            Map.of(
                    PENDING, Set.of(CONFIRMED, CANCELLED),
                    CONFIRMED, Set.of(PREPARING, CANCELLED),
                    PREPARING, Set.of(SHIPPING, CANCELLED),
                    SHIPPING, Set.of(COMPLETED, DELIVERY_FAILED),
                    DELIVERY_FAILED, Set.of(SHIPPING, CANCELLED),
                    COMPLETED, Set.of(RETURNED),
                    CANCELLED, Set.of(),
                    RETURNED, Set.of());

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

    @Column(name = "status", nullable = false, length = 30)
    @Setter(AccessLevel.NONE)
    private String orderStatus = "PENDING";

    @Column(
            name = "created_at",
            nullable = false,
            columnDefinition = "TIMESTAMP(6)",
            updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime updatedAt;

    public static boolean canTransition(String from, String to) {
        return TRANSITIONS.getOrDefault(from, Set.of()).contains(to);
    }

    public void confirm() {
        transitionTo(CONFIRMED);
    }

    public void startPreparing() {
        transitionTo(PREPARING);
    }

    public void dispatch() {
        transitionTo(SHIPPING);
    }

    public void markDeliveryFailed() {
        transitionTo(DELIVERY_FAILED);
    }

    public void cancel() {
        transitionTo(CANCELLED);
    }

    public void complete() {
        transitionTo(COMPLETED);
    }

    public void acceptReturn() {
        transitionTo(RETURNED);
    }

    private void transitionTo(String next) {
        if (next.equals(orderStatus)) {
            throw BusinessRuleException.conflict("ORDER_TRANSITION_ALREADY_APPLIED");
        }
        if (!canTransition(orderStatus, next)) {
            throw BusinessRuleException.conflict("ORDER_TRANSITION_NOT_ALLOWED");
        }
        orderStatus = next;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (orderStatus == null) orderStatus = "PENDING";
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
