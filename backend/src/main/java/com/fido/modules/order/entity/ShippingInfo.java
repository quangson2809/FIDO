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

    @Column(name = "delivery_mode", nullable = false, length = 30)
    private String deliveryMode;

    @Column(name = "carrier_name", nullable = true, length = 255)
    private String carrierName;
}
