package com.fido.modules.promotion.service;

import com.fido.modules.account.service.AccountAccessService;
import com.fido.modules.product.service.PromotionCatalogService;
import com.fido.modules.promotion.entity.Voucher;
import com.fido.modules.promotion.entity.VoucherUsage;
import com.fido.modules.promotion.repository.VoucherRepository;
import com.fido.modules.promotion.repository.VoucherUsageRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;

@Service
@Transactional(propagation = Propagation.MANDATORY)
public class VoucherRedemptionService {
    private final VoucherRepository vouchers;
    private final VoucherUsageRepository usages;
    private final PromotionCatalogService catalog;
    private final AccountAccessService accounts;

    public VoucherRedemptionService(VoucherRepository vouchers, VoucherUsageRepository usages,
            PromotionCatalogService catalog, AccountAccessService accounts) {
        this.vouchers = vouchers;
        this.usages = usages;
        this.catalog = catalog;
        this.accounts = accounts;
    }

    public record Line(Long productId, BigDecimal amount) {}
    public record Discount(Long voucherId, String code, BigDecimal amount) {}

    public Discount evaluate(Long accountId, String code, List<Line> lines) {
        if (code == null || code.isBlank()) return new Discount(null, null, BigDecimal.ZERO);
        boolean internalAccount = accounts.findAccess(accountId)
                .map(access -> access.roles().stream()
                        .anyMatch(role -> "ADMIN".equals(role.code()) || "SUPERADMIN".equals(role.code())))
                .orElse(true);
        if (internalAccount) throw new ResponseStatusException(
                HttpStatus.FORBIDDEN, "Voucher chỉ dành cho khách hàng đã đăng nhập");
        Voucher voucher = vouchers.lockByCode(code.trim())
                .orElseThrow(() -> rejected("Mã voucher không tồn tại"));
        Instant now = Instant.now();
        if (!voucher.isEnabled() || voucher.getStartsAt() == null) throw rejected("Voucher chưa được bật");
        if (now.isBefore(voucher.getStartsAt())) throw rejected("Voucher chưa đến thời gian áp dụng");
        if (voucher.getEndsAt() != null && !now.isBefore(voucher.getEndsAt())) throw rejected("Voucher đã hết hạn");

        var active = usages.activeForUpdate(voucher.getVoucherId());
        if (voucher.getGlobalLimit() != null && active.size() >= voucher.getGlobalLimit()) {
            throw rejected("Voucher đã hết lượt sử dụng");
        }
        if (active.stream().filter(u -> u.getAccountId().equals(accountId)).count()
                >= voucher.getCustomerLimit()) {
            throw rejected("Bạn đã dùng hết lượt của voucher này");
        }

        var eligibleProducts = catalog.eligibleProducts(
                lines.stream().map(Line::productId).toList(),
                voucher.getScope(), voucher.getProductIds(), voucher.getCategoryIds());
        BigDecimal subtotal = lines.stream()
                .filter(line -> eligibleProducts.contains(line.productId()))
                .map(Line::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (subtotal.signum() <= 0) throw rejected("Không có sản phẩm phù hợp với voucher");
        if (subtotal.compareTo(voucher.getMinimumAmount()) < 0) {
            throw rejected("Tiền hàng đủ điều kiện chưa đạt mức tối thiểu " + voucher.getMinimumAmount());
        }
        return new Discount(voucher.getVoucherId(), voucher.getCode(),
                discount(voucher.getDiscountType(), voucher.getDiscountValue(),
                        voucher.getMaximumDiscount(), subtotal));
    }

    public static BigDecimal discount(String type, BigDecimal value, BigDecimal maximum, BigDecimal subtotal) {
        BigDecimal amount = "PERCENT".equals(type)
                ? subtotal.multiply(value).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP)
                        .min(maximum == null ? subtotal : maximum)
                : value;
        return amount.min(subtotal).setScale(2, RoundingMode.HALF_UP);
    }

    public void consume(Long orderId, Long accountId, Discount discount) {
        if (discount.voucherId() == null) return;
        VoucherUsage usage = new VoucherUsage();
        usage.setOrderId(orderId);
        usage.setAccountId(accountId);
        usage.setVoucherId(discount.voucherId());
        usages.save(usage);
    }

    public void restoreCancelledOrder(Long orderId, Long voucherId) {
        if (voucherId == null) return;
        vouchers.lockById(voucherId).orElseThrow();
        usages.findById(orderId).filter(u -> !u.isRestored()).ifPresent(u -> u.setRestored(true));
    }

    private static ResponseStatusException rejected(String reason) {
        return new ResponseStatusException(HttpStatus.CONFLICT, reason);
    }
}
