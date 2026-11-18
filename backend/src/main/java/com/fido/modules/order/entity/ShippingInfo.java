package com.fido.modules.order.entity;

import com.fido.common.exception.BusinessRuleException;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "shipping_infos")
@Getter
@Setter
@NoArgsConstructor
public class ShippingInfo {

    @Id
    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "carrier_name", nullable = true, length = 150)
    @Setter(AccessLevel.NONE)
    private String carrierName;

    @Column(name = "tracking_number", nullable = true, length = 120)
    @Setter(AccessLevel.NONE)
    private String trackingNumber;

    @Column(name = "shipping_status", nullable = false, length = 20)
    @Setter(AccessLevel.NONE)
    private String shippingStatus = "PENDING";

    @Column(name = "shipped_at", nullable = true, columnDefinition = "TIMESTAMP(6)")
    @Setter(AccessLevel.NONE)
    private java.time.LocalDateTime shippedAt;

    @Column(name = "delivered_at", nullable = true, columnDefinition = "TIMESTAMP(6)")
    @Setter(AccessLevel.NONE)
    private java.time.LocalDateTime deliveredAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMP(6)")
    private java.time.LocalDateTime updatedAt;

    public void dispatch(LocalDateTime now, String carrier, String tracking) {
        requireStatus(Set.of("PENDING", "FAILED"));
        if (now == null) throw BusinessRuleException.conflict("ORDER_TRANSITION_NOT_ALLOWED");
        shippingStatus = "SHIPPED";
        shippedAt = now;
        if (carrier != null && !carrier.isBlank()) carrierName = carrier.trim();
        if (tracking != null && !tracking.isBlank()) trackingNumber = tracking.trim();
    }

    public void markFailed() {
        requireStatus(Set.of("SHIPPED"));
        shippingStatus = "FAILED";
    }

    public void markDelivered(LocalDateTime now) {
        requireStatus(Set.of("SHIPPED"));
        if (deliveredAt != null || now == null) {
            throw BusinessRuleException.conflict("ORDER_COD_COLLECTION_NOT_ALLOWED");
        }
        shippingStatus = "DELIVERED";
        deliveredAt = now;
    }

    public void cancel() {
        requireStatus(Set.of("PENDING", "FAILED"));
        shippingStatus = "CANCELLED";
    }

    private void requireStatus(Set<String> allowed) {
        if (!allowed.contains(shippingStatus)) {
            throw BusinessRuleException.conflict("ORDER_TRANSITION_NOT_ALLOWED");
        }
    }

    @PrePersist
    @PreUpdate
    void updateTimestamp() {
        updatedAt = java.time.LocalDateTime.now(java.time.ZoneOffset.UTC);
    }
}
