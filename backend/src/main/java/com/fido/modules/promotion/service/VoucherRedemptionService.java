package com.fido.modules.promotion.service;

import com.fido.modules.account.service.identity.AccountAccessService;
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

    /** Đặt đơn phải khóa voucher rồi kiểm tra lại điều kiện theo dữ liệu hiện tại. */
    public Discount evaluate(Long accountId, String code, List<Line> lines) {
        return evaluate(accountId, code, lines, true);
    }

    /** Báo giá chỉ tham khảo; không giữ hoặc tiêu thụ lượt dùng voucher. */
    public Discount evaluateForQuote(Long accountId, String code, List<Line> lines) {
        return evaluate(accountId, code, lines, false);
    }

    /**
     * accountId từ đăng nhập; code từ request, lines chứa tiền gốc từng Product do checkout tính lại.
     * lockVoucher=true khi đặt đơn để khóa cấu hình/quota; báo giá dùng false và không tiêu thụ lượt.
     */
    private Discount evaluate(Long accountId, String code, List<Line> lines, boolean lockVoucher) {
        if (code == null || code.isBlank()) {
            return new Discount(null, null, 0L);
        }
        boolean internalAccount =
                accounts.findAccess(accountId)
                        .map(
                                access ->
                                        access.roles().stream()
                                                .anyMatch(
                                                        role ->
                                                                "ADMIN".equals(role.code())
                                                                        || "SUPERADMIN"
                                                                                .equals(
                                                                                        role
                                                                                                .code())))
                        .orElse(true);
        if (internalAccount) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }

        Voucher voucher =
                (lockVoucher
                                ? vouchers.lockByCode(code.trim())
                                : vouchers.findByCodeIgnoreCase(code.trim()))
                        .orElseThrow(() -> rejected("VOUCHER_NOT_FOUND"));
        // So thời gian hiện tại với cửa sổ voucher: gồm startsAt, không gồm endsAt.
        Instant now = Instant.now();
        voucher.requireRedeemable(now);

        long subtotal = pricing.sumAmounts(lines.stream().map(Line::amount).toList());
        if (!voucher.meetsMinimumOrder(subtotal)) {
            throw rejected("VOUCHER_MINIMUM_ORDER_NOT_MET");
        }
        long amount =
                pricing.calculateDiscountAmount(
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

    /**
     * discount là kết quả evaluate vừa tính dưới khóa; dùng voucherId và subtotal để kiểm tra lại hạn
     * mức.
     * Chỉ tăng một lượt dùng trong giao dịch tạo đơn; rollback đơn cũng rollback bộ đếm.
     */
    public void consume(Discount discount) {
        if (discount == null || discount.voucherId() == null) return;

        Voucher voucher =
                vouchers.lockById(discount.voucherId())
                        .orElseThrow(() -> rejected("VOUCHER_NOT_FOUND"));
        Instant now = Instant.now();
        voucher.requireRedeemable(now);
        if (!voucher.meetsMinimumOrder(discount.subtotal())) {
            throw rejected("VOUCHER_NOT_ELIGIBLE");
        }

        int before = valueOrZero(voucher.getUsageCount());
        // UPDATE có điều kiện trong DB quyết định lượt dùng cuối cùng; kiểm tra trước ở Java không
        // thay thế bước này.
        if (vouchers.incrementUsageCountIfAvailable(
                        voucher.getVoucherId(), now, discount.subtotal())
                != 1) {
            throw rejected("VOUCHER_QUOTA_CONFLICT");
        }
        voucher.setUsageCount(Math.addExact(before, 1));
        auditQuotaChange(
                AuditAction.VOUCHER_QUOTA_CONSUME, voucher.getVoucherId(), before, before + 1);
    }

    /** Chỉ gọi khi chuyển hủy đơn hợp lệ dưới khóa; không tự giải phóng lượt dùng khi hoàn tiền. */
    public void release(Long voucherId) {
        if (voucherId == null) return;

        Voucher voucher =
                vouchers.lockById(voucherId).orElseThrow(() -> rejected("VOUCHER_NOT_FOUND"));
        int before = valueOrZero(voucher.getUsageCount());
        if (vouchers.decrementUsageCountAbove(voucherId, 0) != 1) {
            throw rejected("VOUCHER_QUOTA_CONFLICT");
        }
        voucher.setUsageCount(before - 1);
        auditQuotaChange(AuditAction.VOUCHER_QUOTA_RELEASE, voucherId, before, before - 1);
    }

    private void auditQuotaChange(AuditAction action, Long voucherId, int before, int after) {
        audit.record(
                AuditWriteEvent.withChanges(
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
