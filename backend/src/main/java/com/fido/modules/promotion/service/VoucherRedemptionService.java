package com.fido.modules.promotion.service;

import com.fido.modules.account.service.AccountAccessService;
import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.promotion.entity.Voucher;
import com.fido.modules.promotion.repository.VoucherRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
@Transactional(propagation = Propagation.MANDATORY)
public class VoucherRedemptionService {
    private final VoucherRepository vouchers;
    private final AccountAccessService accounts;
    private final com.fido.modules.pricing.PricingService pricing;
    private final AuditWriteService audit;

    public VoucherRedemptionService(
            VoucherRepository vouchers,
            AccountAccessService accounts,
            com.fido.modules.pricing.PricingService pricing,
            AuditWriteService audit) {
        this.vouchers = vouchers;
        this.accounts = accounts;
        this.pricing = pricing;
        this.audit = audit;
    }

    public record Line(Long productId, Long amount) {}

    public record Discount(
            Long voucherId,
            String code,
            Long amount,
            String discountType,
            Long discountValue,
            long subtotal) {
        public Discount(Long voucherId, String code, Long amount) {
            this(voucherId, code, amount, null, null, 0L);
        }
    }

    /** Order placement reads and locks the Voucher before recalculating eligibility. */
    public Discount evaluate(Long accountId, String code, List<Line> lines) {
        return evaluate(accountId, code, lines, true);
    }

    /** Quotes are advisory: they do not reserve or consume quota. */
    public Discount evaluateForQuote(Long accountId, String code, List<Line> lines) {
        return evaluate(accountId, code, lines, false);
    }

    private Discount evaluate(Long accountId, String code, List<Line> lines, boolean lockVoucher) {
        if (code == null || code.isBlank()) {
            return new Discount(null, null, 0L);
        }
        boolean internalAccount = accounts.findAccess(accountId)
                .map(access -> access.roles().stream()
                        .anyMatch(role -> "ADMIN".equals(role.code()) || "SUPERADMIN".equals(role.code())))
                .orElse(true);
        if (internalAccount) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }

        Voucher voucher = (lockVoucher
                ? vouchers.lockByCode(code.trim())
                : vouchers.findByCodeIgnoreCase(code.trim()))
                .orElseThrow(() -> rejected("VOUCHER_NOT_FOUND"));
        Instant now = Instant.now();
        requireRedeemable(voucher, now);

        long subtotal = pricing.sumAmounts(lines.stream().map(Line::amount).toList());
        if (subtotal < voucher.getMinimumOrderValue()) {
            throw rejected("VOUCHER_MINIMUM_ORDER_NOT_MET");
        }
        long amount = pricing.calculateDiscountAmount(
                voucher.getDiscountType(),
                voucher.getDiscountValue(),
                voucher.getMaximumDiscount(),
                subtotal);
        if (amount <= 0L) {
            throw rejected("VOUCHER_NOT_ELIGIBLE");
        }
        return new Discount(
                voucher.getVoucherId(),
                voucher.getCode(),
                amount,
                voucher.getDiscountType(),
                voucher.getDiscountValue(),
                subtotal);
    }

    /** Claims one global quota use inside the caller's Order transaction. */
    public void consume(Discount discount) {
        if (discount == null || discount.voucherId() == null) return;

        Voucher voucher = vouchers.lockById(discount.voucherId())
                .orElseThrow(() -> rejected("VOUCHER_NOT_FOUND"));
        Instant now = Instant.now();
        requireRedeemable(voucher, now);
        if (discount.subtotal() < voucher.getMinimumOrderValue()) {
            throw rejected("VOUCHER_NOT_ELIGIBLE");
        }

        int before = valueOrZero(voucher.getUsageCount());
        if (vouchers.incrementUsageCountIfAvailable(
                        voucher.getVoucherId(), now, discount.subtotal()) != 1) {
            throw rejected("VOUCHER_QUOTA_CONFLICT");
        }
        voucher.setUsageCount(Math.addExact(before, 1));
        auditQuotaChange(
                AuditAction.VOUCHER_QUOTA_CONSUME,
                voucher.getVoucherId(),
                before,
                before + 1);
    }

    /** P1.7 calls release only as part of an eligible, locked cancellation transition. */
    public void release(Long voucherId) {
        if (voucherId == null) return;

        Voucher voucher = vouchers.lockById(voucherId)
                .orElseThrow(() -> rejected("VOUCHER_NOT_FOUND"));
        int before = valueOrZero(voucher.getUsageCount());
        if (vouchers.decrementUsageCountAbove(voucherId, 0) != 1) {
            throw rejected("VOUCHER_QUOTA_CONFLICT");
        }
        voucher.setUsageCount(before - 1);
        auditQuotaChange(AuditAction.VOUCHER_QUOTA_RELEASE, voucherId, before, before - 1);
    }

    private static void requireRedeemable(Voucher voucher, Instant now) {
        if (!"ACTIVE".equals(voucher.getStatus())
                || (voucher.getStartsAt() != null && now.isBefore(voucher.getStartsAt()))
                || (voucher.getEndsAt() != null && !now.isBefore(voucher.getEndsAt()))) {
            throw rejected("VOUCHER_NOT_ELIGIBLE");
        }
        if (voucher.getUsageLimit() != null
                && valueOrZero(voucher.getUsageCount()) >= voucher.getUsageLimit()) {
            throw rejected("VOUCHER_USAGE_LIMIT_REACHED");
        }
    }

    private void auditQuotaChange(AuditAction action, Long voucherId, int before, int after) {
        audit.record(AuditWriteEvent.withChanges(
                action,
                AuditEntityType.VOUCHER,
                voucherId.toString(),
                Map.of("usage_count", before),
                Map.of("usage_count", after)));
    }

    private static int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    private static ResponseStatusException rejected(String code) {
        return new ResponseStatusException(HttpStatus.CONFLICT, code);
    }
}
