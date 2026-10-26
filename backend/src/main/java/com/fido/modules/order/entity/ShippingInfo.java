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

    @Column(name = "carrier_name", nullable = true, length = 255)
    private String carrierName;
}
