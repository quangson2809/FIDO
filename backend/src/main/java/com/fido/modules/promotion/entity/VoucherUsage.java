package com.fido.modules.promotion.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Formula;
import org.hibernate.annotations.Immutable;

/** Read-only projection over the canonical orders table; no voucher_usages table exists in V1. */
@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@Immutable
public class VoucherUsage {
    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private Long orderId;

    @Column(name = "voucher_id", updatable = false)
    private Long voucherId;

    @Column(name = "account_id", nullable = false, updatable = false)
    private Long accountId;

    @Column(name = "status", nullable = false, updatable = false)
    private String orderStatus;

    @Formula("case when status = 'CANCELLED' then true else false end")
    private boolean restored;
}
