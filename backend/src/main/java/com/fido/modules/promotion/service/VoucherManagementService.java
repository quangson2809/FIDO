package com.fido.modules.promotion.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.promotion.dto.request.VoucherCreateRequest;
import com.fido.modules.promotion.dto.request.VoucherPatchRequest;
import com.fido.modules.promotion.dto.response.VoucherDetailDto;
import com.fido.modules.promotion.entity.Voucher;
import com.fido.modules.promotion.repository.VoucherRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

@Service
@Transactional
public class VoucherManagementService {
    private static final String READ =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_VOUCHER_READ','PERMISSION_VOUCHER_WRITE')";
    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_VOUCHER_WRITE')";

    private final VoucherRepository vouchers;
    private final AuditWriteService audit;

    public VoucherManagementService(VoucherRepository vouchers, AuditWriteService audit) {
        this.vouchers = vouchers;
        this.audit = audit;
    }

    @PreAuthorize(READ)
    @Transactional(readOnly = true)
    public Page<VoucherDetailDto> list(String search, int page, int pageSize) {
        String normalizedSearch = search == null ? "" : search.trim();
        return vouchers.findByCodeContainingIgnoreCase(
                        normalizedSearch,
                        PageRequest.of(page - 1, pageSize, Sort.by("voucherId").descending()))
                .map(VoucherManagementService::dto);
    }

    @PreAuthorize(READ)
    @Transactional(readOnly = true)
    public VoucherDetailDto detail(Long id) {
        return dto(vouchers.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "VOUCHER_NOT_FOUND")));
    }

    @PreAuthorize(WRITE)
    public VoucherDetailDto create(VoucherCreateRequest request) {
        if (request == null) bad("VOUCHER_CONFIGURATION_INVALID");
        String code = normalizeCode(request.code());
        validateConfiguration(
                request.discount_type(),
                request.discount_value(),
                request.minimum_order_value() == null ? 0L : request.minimum_order_value(),
                request.maximum_discount(),
                request.starts_at(),
                request.ends_at(),
                request.usage_limit());
        if (vouchers.existsByCodeIgnoreCaseAndVoucherIdNot(code, 0L)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "VOUCHER_CODE_ALREADY_EXISTS");
        }

        Voucher voucher = new Voucher();
        voucher.setCode(code);
        voucher.setDiscountType(request.discount_type());
        voucher.setDiscountValue(request.discount_value());
        voucher.setMinimumOrderValue(request.minimum_order_value() == null ? 0L : request.minimum_order_value());
        voucher.setMaximumDiscount(request.maximum_discount());
        voucher.setStartsAt(micros(request.starts_at()));
        voucher.setEndsAt(micros(request.ends_at()));
        voucher.setUsageLimit(request.usage_limit());
        voucher.setUsageCount(0);
        voucher.setStatus("DRAFT");

        Voucher saved = vouchers.save(voucher);
        audit.record(AuditWriteEvent.of(
                AuditAction.VOUCHER_CREATE, AuditEntityType.VOUCHER, saved.getVoucherId().toString()));
        return dto(saved);
    }

    @PreAuthorize(WRITE)
    public VoucherDetailDto update(Long id, VoucherPatchRequest request) {
        if (request == null || request.isEmpty()) bad("VOUCHER_CONFIGURATION_INVALID");
        Voucher voucher = vouchers.lockById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "VOUCHER_NOT_FOUND"));

        if (request.isCodePresent()) {
            String code = normalizeCode(request.getCode());
            if (vouchers.existsByCodeIgnoreCaseAndVoucherIdNot(code, id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "VOUCHER_CODE_ALREADY_EXISTS");
            }
            voucher.setCode(code);
        }
        if (request.isDiscountTypePresent()) voucher.setDiscountType(request.getDiscountType());
        if (request.isDiscountValuePresent()) voucher.setDiscountValue(request.getDiscountValue());
        if (request.isMinimumOrderValuePresent()) voucher.setMinimumOrderValue(request.getMinimumOrderValue());
        if (request.isMaximumDiscountPresent()) voucher.setMaximumDiscount(request.getMaximumDiscount());
        if (request.isStartsAtPresent()) voucher.setStartsAt(micros(request.getStartsAt()));
        if (request.isEndsAtPresent()) voucher.setEndsAt(micros(request.getEndsAt()));
        if (request.isUsageLimitPresent()) voucher.setUsageLimit(request.getUsageLimit());
        if (request.isStatusPresent()) {
            requireStatusTransition(voucher.getStatus(), request.getStatus());
            voucher.setStatus(request.getStatus());
        }

        validateConfiguration(
                voucher.getDiscountType(),
                voucher.getDiscountValue(),
                voucher.getMinimumOrderValue(),
                voucher.getMaximumDiscount(),
                voucher.getStartsAt(),
                voucher.getEndsAt(),
                voucher.getUsageLimit());
        if (voucher.getUsageLimit() != null
                && voucher.getUsageCount() != null
                && voucher.getUsageLimit() < voucher.getUsageCount()) {
            bad("VOUCHER_USAGE_LIMIT_INVALID");
        }

        Voucher saved = vouchers.save(voucher);
        audit.record(AuditWriteEvent.of(
                AuditAction.VOUCHER_UPDATE, AuditEntityType.VOUCHER, saved.getVoucherId().toString()));
        return dto(saved);
    }

    private static void validateConfiguration(
            String discountType,
            Long discountValue,
            Long minimumOrderValue,
            Long maximumDiscount,
            Instant startsAt,
            Instant endsAt,
            Integer usageLimit) {
        if (!"FIXED".equals(discountType) && !"PERCENT".equals(discountType)) {
            bad("VOUCHER_CONFIGURATION_INVALID");
        }
        if (discountValue == null || discountValue <= 0L) {
            bad("VOUCHER_CONFIGURATION_INVALID");
        }
        if ("PERCENT".equals(discountType) && discountValue > 10_000L) {
            bad("VOUCHER_PERCENT_BPS_OUT_OF_RANGE");
        }
        if (minimumOrderValue == null || minimumOrderValue < 0L
                || (maximumDiscount != null && maximumDiscount < 0L)) {
            bad("VOUCHER_CONFIGURATION_INVALID");
        }
        if (usageLimit != null && usageLimit < 1) {
            bad("VOUCHER_USAGE_LIMIT_INVALID");
        }
        if (startsAt != null && endsAt != null && !startsAt.isBefore(endsAt)) {
            bad("VOUCHER_WINDOW_INVALID");
        }
    }

    private static void requireStatusTransition(String current, String next) {
        if (current == null || next == null) bad("VOUCHER_STATUS_TRANSITION_INVALID");
        if (current.equals(next)) return;
        boolean allowed = switch (current) {
            case "DRAFT" -> "ACTIVE".equals(next) || "INACTIVE".equals(next);
            case "ACTIVE" -> "INACTIVE".equals(next) || "EXPIRED".equals(next);
            case "INACTIVE" -> "ACTIVE".equals(next) || "EXPIRED".equals(next);
            case "EXPIRED" -> false;
            default -> false;
        };
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "VOUCHER_STATUS_TRANSITION_INVALID");
        }
    }

    private static String normalizeCode(String code) {
        if (code == null) bad("VOUCHER_CONFIGURATION_INVALID");
        String normalized = code.trim().toUpperCase(Locale.ROOT);
        if (normalized.isEmpty() || normalized.length() > 80) bad("VOUCHER_CONFIGURATION_INVALID");
        return normalized;
    }

    private static Instant micros(Instant value) {
        return value == null ? null : value.truncatedTo(ChronoUnit.MICROS);
    }

    private static VoucherDetailDto dto(Voucher voucher) {
        return new VoucherDetailDto(
                voucher.getVoucherId(),
                voucher.getCode(),
                voucher.getDiscountType(),
                voucher.getDiscountValue(),
                voucher.getMinimumOrderValue(),
                voucher.getMaximumDiscount(),
                voucher.getStartsAt(),
                voucher.getEndsAt(),
                voucher.getUsageLimit(),
                voucher.getUsageCount(),
                voucher.getStatus());
    }

    private static void bad(String reason) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }
}
