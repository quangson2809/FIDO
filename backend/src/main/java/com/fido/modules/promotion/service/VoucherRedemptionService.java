package com.fido.modules.promotion.service;

import com.fido.modules.account.service.AccountAccessService;
import com.fido.modules.product.service.PromotionCatalogService;
import com.fido.modules.promotion.entity.Voucher;
import com.fido.modules.promotion.entity.VoucherUsage;
import com.fido.modules.promotion.repository.VoucherRepository;
import com.fido.modules.promotion.repository.VoucherUsageRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service @Transactional(propagation = Propagation.MANDATORY)
public class VoucherRedemptionService {
    private final VoucherRepository vouchers;
    private final VoucherUsageRepository usages;
    private final PromotionCatalogService catalog;
    private final AccountAccessService accounts;
    public VoucherRedemptionService(VoucherRepository vouchers, VoucherUsageRepository usages,
                                    PromotionCatalogService catalog, AccountAccessService accounts) {
        this.vouchers=vouchers; this.usages=usages; this.catalog=catalog; this.accounts=accounts;
    }
    public record Line(Long variantId, BigDecimal amount) {}
    public record Discount(Long voucherId, String code, BigDecimal amount) {}
    public Discount evaluate(Long accountId, String code, List<Line> lines) {
        if (code==null || code.isBlank()) return new Discount(null,null,BigDecimal.ZERO);
        boolean customer=accounts.findAccess(accountId)
                .map(a->a.roles().stream().anyMatch(r->"CUSTOMER".equals(r.code()))).orElse(false);
        if (!customer) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Voucher chỉ dành cho khách hàng đã đăng nhập");
        Voucher v=vouchers.lockByCode(code.trim()).orElseThrow(()->rejected("Mã voucher không tồn tại"));
        Instant now=Instant.now();
        if (!v.isEnabled() || v.getStartsAt()==null) throw rejected("Voucher chưa được bật");
        if (now.isBefore(v.getStartsAt())) throw rejected("Voucher chưa đến thời gian áp dụng");
        if (!now.isBefore(v.getEndsAt())) throw rejected("Voucher đã hết hạn");
        // Locking reads see current usage even under MySQL REPEATABLE READ.
        var active = usages.activeForUpdate(v.getVoucherId());
        if (v.getGlobalLimit()!=null && active.size()>=v.getGlobalLimit())
            throw rejected("Voucher đã hết lượt sử dụng");
        if (active.stream().filter(u->u.getAccountId().equals(accountId)).count()>=v.getCustomerLimit())
            throw rejected("Bạn đã dùng hết lượt của voucher này");
        var eligible=catalog.eligibleVariants(lines.stream().map(Line::variantId).toList(),
                v.getScope(),v.getProductIds(),v.getCategoryIds());
        BigDecimal subtotal=lines.stream().filter(l->eligible.contains(l.variantId()))
                .map(Line::amount).reduce(BigDecimal.ZERO,BigDecimal::add);
        if (subtotal.signum()<=0) throw rejected("Không có sản phẩm phù hợp với voucher");
        if (subtotal.compareTo(v.getMinimumAmount())<0) throw rejected("Tiền hàng đủ điều kiện chưa đạt mức tối thiểu " + v.getMinimumAmount());
        return new Discount(v.getVoucherId(),v.getCode(),discount(v.getDiscountType(),v.getDiscountValue(),v.getMaximumDiscount(),subtotal));
    }
    public static BigDecimal discount(String type, BigDecimal value, BigDecimal maximum, BigDecimal subtotal) {
        BigDecimal amount="PERCENTAGE".equals(type)
                ? subtotal.multiply(value).divide(new BigDecimal("100"),2,RoundingMode.HALF_UP).min(maximum)
                : value;
        return amount.min(subtotal).setScale(2,RoundingMode.HALF_UP);
    }
    // evaluate holds the voucher row lock through the owning order transaction.
    public void consume(Long orderId, Long accountId, Discount discount) {
        if (discount.voucherId()==null) return;
        VoucherUsage usage=new VoucherUsage();
        usage.setOrderId(orderId); usage.setAccountId(accountId); usage.setVoucherId(discount.voucherId());
        usages.save(usage);
    }
    // Caller owns the order lock; all usage changes also serialize on its voucher.
    public void restoreCancelledOrder(Long orderId, Long voucherId) {
        if (voucherId==null) return;
        vouchers.lockById(voucherId).orElseThrow();
        usages.findById(orderId).filter(u->!u.isRestored()).ifPresent(u->u.setRestored(true));
    }
    private static ResponseStatusException rejected(String reason) {
        return new ResponseStatusException(HttpStatus.CONFLICT,reason);
    }
}
