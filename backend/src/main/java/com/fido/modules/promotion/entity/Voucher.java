package com.fido.modules.promotion.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(
        name = "vouchers",
        uniqueConstraints = @UniqueConstraint(name = "uq_vouchers_code", columnNames = {"code"}))
@Getter
@Setter
@NoArgsConstructor
public class Voucher {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long voucherId;

    @Column(name = "code", nullable = false, length = 80)
    private String code;

    @Column(name = "discount_type", nullable = false, length = 20)
    private String discountType;

    @Column(name = "discount_value", nullable = false)
    private Long discountValue;

    @Column(name = "minimum_order_value", nullable = false)
    private Long minimumOrderValue = 0L;

    @Column(name = "maximum_discount")
    private Long maximumDiscount;

    @Column(name = "starts_at", columnDefinition = "TIMESTAMP(6)")
    private Instant startsAt;

    @Column(name = "ends_at", columnDefinition = "TIMESTAMP(6)")
    private Instant endsAt;

    @Column(name = "usage_limit")
    private Integer usageLimit;

    @Column(name = "usage_count", nullable = false)
    private Integer usageCount = 0;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "DRAFT";
}
