package com.fido.modules.promotion.service;

import com.fido.modules.audit.service.*;
import com.fido.modules.product.service.PromotionCatalogService;
import com.fido.modules.promotion.dto.request.VoucherRequest;
import com.fido.modules.promotion.dto.response.VoucherDetailDto;
import com.fido.modules.promotion.entity.Voucher;
import com.fido.modules.promotion.repository.VoucherRepository;
import com.fido.modules.promotion.repository.VoucherUsageRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class VoucherManagementService {
    private static final String READ =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_VOUCHER_READ','PERMISSION_VOUCHER_WRITE')";
    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_VOUCHER_WRITE')";
    private final VoucherRepository vouchers;
    private final VoucherUsageRepository usages;
    private final PromotionCatalogService catalog;
    private final AuditService audit;

    public VoucherManagementService(
            VoucherRepository vouchers,
            VoucherUsageRepository usages,
            PromotionCatalogService catalog,
            AuditService audit) {
        this.vouchers = vouchers;
        this.usages = usages;
        this.catalog = catalog;
        this.audit = audit;
    }

    @PreAuthorize(READ)
    @Transactional(readOnly = true)
    public Page<VoucherDetailDto> list(String search, int page, int pageSize) {
        var pageResult =
                vouchers.findByCodeContainingIgnoreCase(
                        search,
                        PageRequest.of(page - 1, pageSize, Sort.by("voucherId").descending()));
        var ids = pageResult.getContent().stream().map(Voucher::getVoucherId).toList();
        Map<Long, VoucherUsageRepository.UsageCounts> usageByVoucher =
                ids.isEmpty()
                        ? Map.of()
                        : usages.summarize(ids).stream()
                                .collect(
                                        Collectors.toMap(
                                                VoucherUsageRepository.UsageCounts::getVoucherId,
                                                usage -> usage));
        return pageResult.map(
                v -> {
                    var usage = usageByVoucher.get(v.getVoucherId());
                    return dto(
                            v,
                            usage == null ? 0L : usage.getActiveCount(),
                            usage != null && usage.getTotalCount() > 0);
                });
    }

    @PreAuthorize(READ)
    @Transactional(readOnly = true)
    public VoucherDetailDto detail(Long id) {
        return dto(
                vouchers.findById(id)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND)));
    }

    @PreAuthorize(WRITE)
    public VoucherDetailDto create(Long actor, VoucherRequest r) {
        validate(r);
        if (vouchers.existsByCodeIgnoreCaseAndVoucherIdNot(r.code().trim(), 0L))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Mã voucher đã tồn tại");
        Voucher v = new Voucher();
        apply(v, r);
        vouchers.save(v);
        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.VOUCHER_CREATE,
                        AuditTargetType.VOUCHER,
                        v.getVoucherId()));
        return dto(v);
    }

    @PreAuthorize(WRITE)
    public VoucherDetailDto update(Long actor, Long id, VoucherRequest r) {
        Voucher v =
                vouchers.lockById(id)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        validate(r);
        if (usages.existsByVoucherId(id)) {
            boolean immutableChanged =
                    !v.getCode().equals(r.code().trim().toUpperCase(Locale.ROOT))
                            || !v.getDiscountType().equals(normalizeType(r.discount_type()))
                            || !same(v.getDiscountValue(), r.discount_value())
                            || !same(v.getMaximumDiscount(), r.maximum_discount())
                            || !same(v.getMinimumAmount(), r.minimum_amount())
                            || !sameInstant(v.getStartsAt(), r.starts_at())
                            || !v.getScope().equals(r.scope())
                            || !v.getProductIds().equals(r.product_ids())
                            || !v.getCategoryIds().equals(r.category_ids());
            if (immutableChanged
                    || endsBefore(r.ends_at(), v.getEndsAt())
                    || decreased(v.getUsageLimit(), r.global_limit()))
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Voucher đã dùng chỉ được gia hạn, tăng giới hạn hoặc bật/tắt");
        }
        if (vouchers.existsByCodeIgnoreCaseAndVoucherIdNot(
                r.code().trim().toUpperCase(Locale.ROOT), id))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Mã voucher đã tồn tại");
        apply(v, r);
        audit.record(AuditEvent.of(actor, AuditAction.VOUCHER_UPDATE, AuditTargetType.VOUCHER, id));
        return dto(v);
    }

    private static String normalizeType(String type) {
        if ("FIXED_AMOUNT".equals(type)) return "FIXED";
        if ("PERCENTAGE".equals(type)) return "PERCENT";
        return type;
    }

    private static boolean endsBefore(java.time.Instant next, java.time.Instant current) {
        return next != null && current != null && next.isBefore(current);
    }

    private static boolean sameInstant(java.time.Instant a, java.time.Instant b) {
        if (a == null) return b == null;
        return b != null && a.equals(b.truncatedTo(java.time.temporal.ChronoUnit.MICROS));
    }

    private static boolean same(BigDecimal a, BigDecimal b) {
        return a == null ? b == null : b != null && a.compareTo(b) == 0;
    }

    private static boolean decreased(Integer old, Long next) {
        return next != null && (old == null || next < old);
    }

    private static long customerLimit(VoucherRequest r) {
        return r.customer_limit() == null ? 1 : r.customer_limit();
    }

    private void validate(VoucherRequest r) {
        if (r == null) bad("VOUCHER_CONFIGURATION_INVALID");
        if (r.starts_at() != null && r.ends_at() != null && !r.starts_at().isBefore(r.ends_at()))
            bad("VOUCHER_WINDOW_INVALID");
        String type = normalizeType(r.discount_type());
        if (!"FIXED".equals(type) && !"PERCENT".equals(type)) bad("VOUCHER_DISCOUNT_TYPE_INVALID");
        if (r.discount_value() == null || r.discount_value().signum() <= 0
                || r.discount_value().stripTrailingZeros().scale() > 0) bad("VOUCHER_DISCOUNT_VALUE_INVALID");
        if ("PERCENT".equals(type) && r.discount_value().compareTo(new BigDecimal("10000")) > 0)
            bad("VOUCHER_PERCENT_BPS_OUT_OF_RANGE");
        if (r.minimum_amount() == null || r.minimum_amount().signum() < 0
                || r.minimum_amount().stripTrailingZeros().scale() > 0) bad("VOUCHER_MINIMUM_INVALID");
        if (r.maximum_discount() != null && (r.maximum_discount().signum() < 0
                || r.maximum_discount().stripTrailingZeros().scale() > 0)) bad("VOUCHER_MAXIMUM_INVALID");
        if (r.global_limit() != null && (r.global_limit() < 1 || r.global_limit() > Integer.MAX_VALUE))
            bad("VOUCHER_USAGE_LIMIT_INVALID");
        if ((r.scope() != null && !"ALL".equals(r.scope()))
                || (r.product_ids() != null && !r.product_ids().isEmpty())
                || (r.category_ids() != null && !r.category_ids().isEmpty())
                || (r.customer_limit() != null && r.customer_limit() != 1L))
            bad("VOUCHER_TARGETING_NOT_SUPPORTED");
    }

    private static void bad(String reason) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }

    private void apply(Voucher v, VoucherRequest r) {
        v.setCode(r.code().trim().toUpperCase(Locale.ROOT));
        v.setDiscountType(normalizeType(r.discount_type()));
        v.setDiscountValue(r.discount_value());
        v.setMaximumDiscount(r.maximum_discount());
        v.setMinimumAmount(r.minimum_amount());
        v.setStartsAt(r.starts_at() == null ? null
                : r.starts_at().truncatedTo(java.time.temporal.ChronoUnit.MICROS));
        v.setEndsAt(r.ends_at() == null ? null
                : r.ends_at().truncatedTo(java.time.temporal.ChronoUnit.MICROS));
        v.setScope(r.scope());
        v.getProductIds().clear();
        v.getProductIds().addAll(r.product_ids());
        v.getCategoryIds().clear();
        v.getCategoryIds().addAll(r.category_ids());
        v.setGlobalLimit(r.global_limit());
        v.setCustomerLimit(1L);
        v.setScope("ALL");
        v.getProductIds().clear();
        v.getCategoryIds().clear();
        v.setEnabled(r.enabled());
        v.setStatus(r.enabled() ? "ACTIVE" : (v.getStatus() == null ? "DRAFT" : "INACTIVE"));
    }

    private VoucherDetailDto dto(Voucher v) {
        return dto(
                v,
                usages.countByVoucherIdAndRestoredFalse(v.getVoucherId()),
                usages.existsByVoucherId(v.getVoucherId()));
    }

    private VoucherDetailDto dto(Voucher v, long activeUsage, boolean everUsed) {
        return new VoucherDetailDto(
                v.getVoucherId(),
                v.getCode(),
                v.getDiscountType(),
                v.getDiscountValue(),
                v.getMaximumDiscount(),
                v.getMinimumAmount(),
                v.getStartsAt(),
                v.getEndsAt(),
                v.getScope(),
                Set.copyOf(v.getProductIds()),
                Set.copyOf(v.getCategoryIds()),
                v.getUsageLimit() == null ? null : v.getUsageLimit().longValue(),
                v.getCustomerLimit(),
                "ACTIVE".equals(v.getStatus()),
                activeUsage,
                everUsed);
    }
}
