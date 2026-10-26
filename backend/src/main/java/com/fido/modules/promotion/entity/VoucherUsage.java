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

/**
 * Read-only view of voucher use through the canonical orders table.
 * The target schema intentionally has no voucher_usages table.
 */
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

    @Formula("case when status in ('CANCELLED', 'RETURNED') then true else false end")
    private boolean restored;
}
