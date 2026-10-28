package com.fido.modules.order.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "order_voucher_snapshots")
@Getter
@Setter
@NoArgsConstructor
public class OrderVoucherSnapshot {
    @Id
    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "voucher_code_snapshot", nullable = false, length = 80)
    private String voucherCodeSnapshot;

    @Column(name = "discount_type_snapshot", nullable = false, length = 20)
    private String discountTypeSnapshot;

    @Column(name = "discount_value_snapshot", nullable = false)
    private Long discountValueSnapshot;

    @Column(name = "discount_amount_snapshot", nullable = false)
    private Long discountAmountSnapshot;
}
