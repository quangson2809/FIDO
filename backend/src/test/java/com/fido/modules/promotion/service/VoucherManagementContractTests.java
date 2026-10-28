package com.fido.modules.promotion.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.promotion.dto.request.VoucherCreateRequest;
import com.fido.modules.promotion.dto.request.VoucherPatchRequest;
import com.fido.modules.promotion.entity.Voucher;
import com.fido.modules.promotion.repository.VoucherRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class VoucherManagementContractTests {
    private VoucherRepository vouchers;
    private AuditWriteService audit;
    private VoucherManagementService service;

    @BeforeEach
    void setUp() {
        vouchers = org.mockito.Mockito.mock(VoucherRepository.class);
        audit = org.mockito.Mockito.mock(AuditWriteService.class);
        service = new VoucherManagementService(vouchers, audit);
    }

    @Test
    void createNormalizesCodeAndStartsWithDraftAndZeroGlobalUses() {
        when(vouchers.existsByCodeIgnoreCaseAndVoucherIdNot("SPRING", 0L)).thenReturn(false);
        when(vouchers.save(any(Voucher.class))).thenAnswer(invocation -> {
            Voucher voucher = invocation.getArgument(0);
            voucher.setVoucherId(10L);
            return voucher;
        });

        var result = service.create(new VoucherCreateRequest(
                " spring ", "FIXED", 5_000L, 0L, null,
                Instant.parse("2026-10-01T00:00:00Z"),
                Instant.parse("2026-11-01T00:00:00Z"), 3));

        assertEquals("SPRING", result.code());
        assertEquals("DRAFT", result.status());
        assertEquals(0, result.usage_count());
        assertEquals(5_000L, result.discount_value());
        verify(audit).record(org.mockito.ArgumentMatchers.argThat(
                event -> event.action() == AuditAction.VOUCHER_CREATE));
    }

    @Test
    void patchUsesCanonicalFieldsAndRejectsQuotaBelowCurrentUsage() {
        Voucher voucher = new Voucher();
        voucher.setVoucherId(10L);
        voucher.setCode("SPRING");
        voucher.setDiscountType("FIXED");
        voucher.setDiscountValue(5_000L);
        voucher.setMinimumOrderValue(0L);
        voucher.setUsageCount(2);
        voucher.setUsageLimit(3);
        voucher.setStatus("DRAFT");
        when(vouchers.lockById(10L)).thenReturn(Optional.of(voucher));
        when(vouchers.save(any(Voucher.class))).thenAnswer(invocation -> invocation.getArgument(0));

        VoucherPatchRequest activate = new VoucherPatchRequest();
        activate.setStatus("ACTIVE");
        assertEquals("ACTIVE", service.update(10L, activate).status());

        VoucherPatchRequest lowerLimit = new VoucherPatchRequest();
        lowerLimit.setUsageLimit(1);
        ResponseStatusException error = assertThrows(
                ResponseStatusException.class, () -> service.update(10L, lowerLimit));
        assertEquals(400, error.getStatusCode().value());
    }

    @Test
    void percentVoucherRejectsBasisPointsAboveOneHundredPercent() {
        when(vouchers.existsByCodeIgnoreCaseAndVoucherIdNot(eq("TOOMUCH"), eq(0L))).thenReturn(false);
        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> service.create(new VoucherCreateRequest(
                        "TOOMUCH", "PERCENT", 10_001L, 0L, null, null, null, null)));
        assertEquals(400, error.getStatusCode().value());
    }
}
