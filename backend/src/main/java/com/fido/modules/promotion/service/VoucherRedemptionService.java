package com.fido.modules.promotion.service;

import com.fido.modules.account.service.AccountAccessService;
import com.fido.modules.product.service.PromotionCatalogService;
import com.fido.modules.pricing.PricingCalculator;
import com.fido.modules.pricing.PricingService;
import com.fido.modules.promotion.entity.Voucher;
import com.fido.modules.promotion.entity.VoucherUsage;
import com.fido.modules.promotion.repository.VoucherRepository;
import com.fido.modules.promotion.repository.VoucherUsageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Service
@Transactional(propagation = Propagation.MANDATORY)
public class VoucherRedemptionService {
    private final VoucherRepository vouchers;
    private final VoucherUsageRepository usages;
    private final PromotionCatalogService catalog;
    private final AccountAccessService accounts;
    private final PricingService pricing;

    public VoucherRedemptionService(
            VoucherRepository vouchers,
            VoucherUsageRepository usages,
            PromotionCatalogService catalog,
            AccountAccessService accounts) {
        this(vouchers, usages, catalog, accounts, new PricingService());
    }

    @Autowired
    public VoucherRedemptionService(
            VoucherRepository vouchers,
            VoucherUsageRepository usages,
            PromotionCatalogService catalog,
            AccountAccessService accounts,
            PricingService pricing) {
        this.vouchers = vouchers;
        this.usages = usages;
        this.catalog = catalog;
        this.accounts = accounts;
        this.pricing = pricing;
    }

    public record Line(Long productId, Long amount) {
        /** Compatibility adapter for old test fixtures; rejects fractional VND. */
        public Line(Long productId, BigDecimal amount) {
            this(productId, exactVnd(amount));
        }
    }

    public record Discount(
            Long voucherId,
            String code,
            Long amount,
            String discountType,
            Long discountValue) {
        public Discount(Long voucherId, String code, Long amount) {
            this(voucherId, code, amount, null, null);
        }

        /** Compatibility adapter for old test fixtures; response money is integer VND. */
        public Discount(Long voucherId, String code, BigDecimal amount) {
            this(voucherId, code, exactVnd(amount), null, null);
        }
    }

    /** Used by order placement; locks the Voucher row before eligibility is evaluated. */
    public Discount evaluate(Long accountId, String code, List<Line> lines) {
        return evaluate(accountId, code, lines, true);
    }

    /** Used by advisory quote; reads the Voucher without a write lock and never changes quota. */
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
        if (!"ACTIVE".equals(voucher.getStatus())) {
            throw rejected("VOUCHER_NOT_ELIGIBLE");
        }
        if (voucher.getStartsAt() != null && now.isBefore(voucher.getStartsAt())) {
            throw rejected("VOUCHER_NOT_ELIGIBLE");
        }
        if (voucher.getEndsAt() != null && !now.isBefore(voucher.getEndsAt())) {
            throw rejected("VOUCHER_NOT_ELIGIBLE");
        }
        if (voucher.getUsageLimit() != null && voucher.getUsageCount() >= voucher.getUsageLimit()) {
            throw rejected("VOUCHER_USAGE_LIMIT_REACHED");
        }

        long subtotal = pricing.sumAmounts(lines.stream().map(Line::amount).toList());
        if (subtotal < voucher.getMinimumOrderValue()) {
            throw rejected("VOUCHER_MINIMUM_ORDER_NOT_MET");
        }
        long amount = pricing.calculateDiscountAmount(
                voucher.getDiscountType(),
                voucher.getDiscountValueAmount(),
                voucher.getMaximumDiscountAmount(),
                subtotal);
        if (amount <= 0L) {
            throw rejected("VOUCHER_NOT_ELIGIBLE");
        }
        return new Discount(
                voucher.getVoucherId(),
                voucher.getCode(),
                amount,
                voucher.getDiscountType(),
                voucher.getDiscountValueAmount());
    }

    /**
     * Legacy source compatibility only. Authoritative production calls use integer VND and the
     * shared PricingService above.
     */
    @Deprecated
    public static BigDecimal discount(
            String type, BigDecimal value, BigDecimal maximum, BigDecimal subtotal) {
        if (value == null || subtotal == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "VOUCHER_CONFIGURATION_INVALID");
        }
        long result;
        try {
            result = new PricingCalculator().calculateDiscountAmount(
                    normalizeType(type),
                    value.longValueExact(),
                    maximum == null ? null : maximum.longValueExact(),
                    subtotal.longValueExact());
        } catch (ArithmeticException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "VOUCHER_CONFIGURATION_INVALID");
        } catch (com.fido.modules.pricing.PricingException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.code());
        }
        return BigDecimal.valueOf(result);
    }

    public static long discount(String type, Long value, Long maximum, long subtotal) {
        try {
            return new PricingCalculator().calculateDiscountAmount(
                    normalizeType(type), value, maximum, subtotal);
        } catch (com.fido.modules.pricing.PricingException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.code());
        }
    }

    /** Increments one global use inside the caller's Order transaction, guarded by the schema counter. */
    public void consume(Long orderId, Long accountId, Discount discount) {
        if (discount.voucherId() == null) return;
        Voucher voucher = vouchers.lockById(discount.voucherId())
                .orElseThrow(() -> rejected("VOUCHER_NOT_FOUND"));
        VoucherUsage order = usages.findById(orderId)
                .orElseThrow(() -> rejected("VOUCHER_ORDER_NOT_FOUND"));
        if (!discount.voucherId().equals(order.getVoucherId())
                || !accountId.equals(order.getAccountId())
                || "CANCELLED".equals(order.getOrderStatus())) {
            throw rejected("VOUCHER_ORDER_MISMATCH");
        }
        long activeOrders = usages.countByVoucherIdAndRestoredFalse(discount.voucherId());
        int recorded = voucher.getUsageCount() == null ? 0 : voucher.getUsageCount();
        if (recorded >= activeOrders) return;
        if (vouchers.incrementUsageCountIfAvailable(discount.voucherId()) != 1) {
            throw rejected("VOUCHER_USAGE_LIMIT_REACHED");
        }
        voucher.setUsageCount(recorded + 1);
    }

    public void restoreCancelledOrder(Long orderId, Long voucherId) {
        if (voucherId == null) return;
        Voucher voucher = vouchers.lockById(voucherId)
                .orElseThrow(() -> rejected("VOUCHER_NOT_FOUND"));
        VoucherUsage order = usages.findById(orderId)
                .orElseThrow(() -> rejected("VOUCHER_ORDER_NOT_FOUND"));
        if (!voucherId.equals(order.getVoucherId()) || !"CANCELLED".equals(order.getOrderStatus())) return;
        long activeOrders = usages.countByVoucherIdAndRestoredFalse(voucherId);
        int minimumCount = Math.toIntExact(Math.min(activeOrders, Integer.MAX_VALUE));
        int recorded = voucher.getUsageCount() == null ? 0 : voucher.getUsageCount();
        if (vouchers.decrementUsageCountAbove(voucherId, minimumCount) == 1) {
            voucher.setUsageCount(Math.max(0, recorded - 1));
        }
    }

    private static String normalizeType(String type) {
        if ("FIXED_AMOUNT".equals(type)) return "FIXED";
        if ("PERCENTAGE".equals(type)) return "PERCENT";
        return type;
    }

    private static ResponseStatusException rejected(String code) {
        return new ResponseStatusException(HttpStatus.CONFLICT, code);
    }

    private static Long exactVnd(BigDecimal amount) {
        return amount == null ? null : amount.longValueExact();
    }
}
