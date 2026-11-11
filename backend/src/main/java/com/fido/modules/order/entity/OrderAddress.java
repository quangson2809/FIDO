package com.fido.modules.order.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "order_addresses")
@Getter
@Setter
@NoArgsConstructor
public class OrderAddress {
    @Id
    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "recipient_name", nullable = false, length = 150)
    private String recipientName;

    @Column(name = "recipient_phone", nullable = false, length = 20)
    private String recipientPhone;

    @Column(name = "province", nullable = false, length = 120)
    private String province;

    @Column(name = "district", nullable = false, length = 120)
    private String district;

    @Column(name = "ward", nullable = false, length = 120)
    private String ward;

    @Column(name = "address_line", nullable = false, length = 500)
    private String addressLine;
}
