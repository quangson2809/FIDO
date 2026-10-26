package com.fido.modules.order.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "shipping_infos")
@Getter
@Setter
@NoArgsConstructor
public class ShippingInfo {

    @Id
    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "recipient_name", nullable = false, length = 150)
    private String recipientName;

    @Column(name = "recipient_phone", nullable = false, length = 20)
    private String recipientPhone;

    @Transient
    private String deliveryMode;

    @Column(name = "carrier_name", nullable = true, length = 150)
    private String carrierName;

    @Column(name = "tracking_number", nullable = true, length = 120)
    private String trackingNumber;

    @Column(name = "shipping_status", nullable = false, length = 20)
    private String shippingStatus = "PENDING";

    @Column(name = "shipped_at", nullable = true, columnDefinition = "TIMESTAMP(6)")
    private java.time.LocalDateTime shippedAt;

    @Column(name = "delivered_at", nullable = true, columnDefinition = "TIMESTAMP(6)")
    private java.time.LocalDateTime deliveredAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMP(6)")
    private java.time.LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void updateTimestamp() {
        updatedAt = java.time.LocalDateTime.now(java.time.ZoneOffset.UTC);
    }
}
