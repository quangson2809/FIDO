package com.fido.modules.promotion.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

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

    @Transient
    private BigDecimal discountValue;

    @Transient
    private BigDecimal maximumDiscount;

    @Transient
    private BigDecimal minimumAmount;

    @Column(name = "starts_at", columnDefinition = "TIMESTAMP(6)")
    private Instant startsAt;

    @Column(name = "ends_at", columnDefinition = "TIMESTAMP(6)")
    private Instant endsAt;

    @Column(name = "minimum_order_value", nullable = false)
    private Long minimumOrderValue = 0L;

    @Column(name = "usage_limit")
    private Integer usageLimit;

    @Column(name = "usage_count", nullable = false)
    private Integer usageCount = 0;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "DRAFT";

    @Column(name = "discount_value", nullable = false)
    private Long discountValueAmount;

    @Column(name = "maximum_discount")
    private Long maximumDiscountAmount;

    @Transient
    private String scope;

    @Transient
    private Long globalLimit;

    @Transient
    private Long customerLimit;

    @Transient
    private boolean enabled;
    @Transient private java.util.Set<Long> productIds = new java.util.HashSet<>();
    @Transient private java.util.Set<Long> categoryIds = new java.util.HashSet<>();

    @Transient
    private Set<Long> productIds = new HashSet<>();

    @Transient
    private Set<Long> categoryIds = new HashSet<>();

    public void setDiscountValue(BigDecimal value) {
        this.discountValue = value;
        this.discountValueAmount = value == null ? null : value.longValueExact();
    }
    public void setMaximumDiscount(BigDecimal value) {
        this.maximumDiscount = value;
        this.maximumDiscountAmount = value == null ? null : value.longValueExact();
    }
    public void setMinimumAmount(BigDecimal value) {
        this.minimumAmount = value;
        this.minimumOrderValue = value == null ? 0L : value.longValueExact();
    }
    public void setGlobalLimit(Long value) {
        this.globalLimit = value;
        if (value == null) this.usageLimit = null;
        else if (value >= 1 && value <= Integer.MAX_VALUE) this.usageLimit = value.intValue();
    }

    @PrePersist
    @PreUpdate
    void syncLegacyFields() {
        if (discountValueAmount == null && discountValue != null) discountValueAmount = discountValue.longValue();
        if (maximumDiscountAmount == null && maximumDiscount != null) maximumDiscountAmount = maximumDiscount.longValue();
        if (minimumOrderValue == null && minimumAmount != null) minimumOrderValue = minimumAmount.longValue();
        if (minimumOrderValue == null) minimumOrderValue = 0L;
        if (status == null || status.isBlank()) status = enabled ? "ACTIVE" : "INACTIVE";
        if (usageCount == null) usageCount = 0;
        if (usageCount < 0) throw new IllegalStateException("VOUCHER_USAGE_COUNT_INVALID");
        if (globalLimit != null) {
            if (globalLimit < 1 || globalLimit > Integer.MAX_VALUE) throw new IllegalStateException("VOUCHER_USAGE_LIMIT_INVALID");
            usageLimit = globalLimit.intValue();
        }
        if (discountType != null) {
            if ("FIXED_AMOUNT".equals(discountType)) discountType = "FIXED";
            if ("PERCENTAGE".equals(discountType)) discountType = "PERCENT";
        }
    }

    @PostLoad
    void onLoad() {
        discountValue = discountValueAmount == null ? null : BigDecimal.valueOf(discountValueAmount);
        maximumDiscount = maximumDiscountAmount == null ? null : BigDecimal.valueOf(maximumDiscountAmount);
        minimumAmount = minimumOrderValue == null ? BigDecimal.ZERO : BigDecimal.valueOf(minimumOrderValue);
        enabled = "ACTIVE".equals(status);
        globalLimit = usageLimit == null ? null : usageLimit.longValue();
        scope = "ALL";
        customerLimit = 1L;
    }
}
