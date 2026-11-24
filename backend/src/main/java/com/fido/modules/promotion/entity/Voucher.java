package com.fido.modules.promotion.entity;

import com.fido.common.exception.BusinessRuleException;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Entity
@Table(
        name = "vouchers",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uq_vouchers_code",
                        columnNames = {"code"}))
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
    @Setter(AccessLevel.NONE)
    private String discountType;

    @Column(name = "discount_value", nullable = false)
    @Setter(AccessLevel.NONE)
    private Long discountValue;

    @Column(name = "minimum_order_value", nullable = false)
    @Setter(AccessLevel.NONE)
    private Long minimumOrderValue = 0L;

    @Column(name = "maximum_discount")
    @Setter(AccessLevel.NONE)
    private Long maximumDiscount;

    @Column(name = "starts_at", columnDefinition = "TIMESTAMP(6)")
    @Setter(AccessLevel.NONE)
    private Instant startsAt;

    @Column(name = "ends_at", columnDefinition = "TIMESTAMP(6)")
    @Setter(AccessLevel.NONE)
    private Instant endsAt;

    @Column(name = "usage_limit")
    @Setter(AccessLevel.NONE)
    private Integer usageLimit;

    @Column(name = "usage_count", nullable = false)
    private Integer usageCount = 0;

    @Column(name = "status", nullable = false, length = 20)
    @Setter(AccessLevel.NONE)
    private String status = "DRAFT";

    public record Configuration(
            String discountType,
            Long discountValue,
            Long minimumOrderValue,
            Long maximumDiscount,
            Instant startsAt,
            Instant endsAt,
            Integer usageLimit) {}

    /** Validate the complete candidate before mutating any configuration field. */
    public void configure(Configuration next, String nextStatus) {
        if (next == null) {
            throw BusinessRuleException.invalid("VOUCHER_CONFIGURATION_INVALID");
        }
        requireStatusTransition(nextStatus);
        if (!"FIXED".equals(next.discountType()) && !"PERCENT".equals(next.discountType())) {
            throw BusinessRuleException.invalid("VOUCHER_CONFIGURATION_INVALID");
        }
        if (next.discountValue() == null || next.discountValue() <= 0L) {
            throw BusinessRuleException.invalid("VOUCHER_CONFIGURATION_INVALID");
        }
        if ("PERCENT".equals(next.discountType()) && next.discountValue() > 10_000L) {
            throw BusinessRuleException.invalid("VOUCHER_PERCENT_BPS_OUT_OF_RANGE");
        }
        if (next.minimumOrderValue() == null
                || next.minimumOrderValue() < 0L
                || (next.maximumDiscount() != null && next.maximumDiscount() < 0L)) {
            throw BusinessRuleException.invalid("VOUCHER_CONFIGURATION_INVALID");
        }
        if (next.usageLimit() != null
                && (next.usageLimit() < 1
                        || (usageCount != null && next.usageLimit() < usageCount))) {
            throw BusinessRuleException.invalid("VOUCHER_USAGE_LIMIT_INVALID");
        }
        if (next.startsAt() != null
                && next.endsAt() != null
                && !next.startsAt().isBefore(next.endsAt())) {
            throw BusinessRuleException.invalid("VOUCHER_WINDOW_INVALID");
        }
        Configuration normalized =
                new Configuration(
                        next.discountType(),
                        next.discountValue(),
                        next.minimumOrderValue(),
                        next.maximumDiscount(),
                        next.startsAt() == null
                                ? null
                                : next.startsAt().truncatedTo(ChronoUnit.MICROS),
                        next.endsAt() == null ? null : next.endsAt().truncatedTo(ChronoUnit.MICROS),
                        next.usageLimit());
        if (!"DRAFT".equals(status) && !configuration().equals(normalized)) {
            throw BusinessRuleException.conflict("VOUCHER_ISSUED_TERMS_IMMUTABLE");
        }
        discountType = next.discountType();
        discountValue = next.discountValue();
        minimumOrderValue = next.minimumOrderValue();
        maximumDiscount = next.maximumDiscount();
        startsAt = next.startsAt() == null ? null : next.startsAt().truncatedTo(ChronoUnit.MICROS);
        endsAt = next.endsAt() == null ? null : next.endsAt().truncatedTo(ChronoUnit.MICROS);
        usageLimit = next.usageLimit();
        status = nextStatus;
    }

    public Configuration configuration() {
        return new Configuration(
                discountType,
                discountValue,
                minimumOrderValue,
                maximumDiscount,
                startsAt,
                endsAt,
                usageLimit);
    }

    public String effectiveStatus(Instant now) {
        if (!"ACTIVE".equals(status)) return status;
        if (endsAt != null && !now.isBefore(endsAt)) return "EXPIRED";
        if (usageLimit != null && usageCount >= usageLimit) return "EXHAUSTED";
        if (startsAt != null && now.isBefore(startsAt)) return "SCHEDULED";
        return "ACTIVE";
    }

    public void requireRedeemable(Instant now) {
        if (!"ACTIVE".equals(status)
                || (startsAt != null && now.isBefore(startsAt))
                || (endsAt != null && !now.isBefore(endsAt))) {
            throw BusinessRuleException.conflict("VOUCHER_NOT_ELIGIBLE");
        }
        if (usageLimit != null && (usageCount == null ? 0 : usageCount) >= usageLimit) {
            throw BusinessRuleException.conflict("VOUCHER_USAGE_LIMIT_REACHED");
        }
    }

    public boolean meetsMinimumOrder(long subtotal) {
        return subtotal >= minimumOrderValue;
    }

    private void requireStatusTransition(String next) {
        if (status == null || next == null) {
            throw BusinessRuleException.invalid("VOUCHER_STATUS_TRANSITION_INVALID");
        }
        if (status.equals(next)) return;
        boolean allowed =
                switch (status) {
                    case "DRAFT" -> "ACTIVE".equals(next) || "INACTIVE".equals(next);
                    case "ACTIVE" -> "INACTIVE".equals(next) || "EXPIRED".equals(next);
                    case "INACTIVE" -> "ACTIVE".equals(next) || "EXPIRED".equals(next);
                    default -> false;
                };
        if (!allowed) {
            throw BusinessRuleException.conflict("VOUCHER_STATUS_TRANSITION_INVALID");
        }
    }
}
