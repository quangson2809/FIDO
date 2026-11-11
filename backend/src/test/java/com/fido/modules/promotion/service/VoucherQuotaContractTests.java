package com.fido.modules.promotion.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fido.modules.account.service.AccountAccessService;
import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.pricing.PricingService;
import com.fido.modules.promotion.entity.Voucher;
import com.fido.modules.promotion.repository.VoucherRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class VoucherQuotaContractTests {
    private VoucherRepository vouchers;
    private AuditWriteService audit;
    private VoucherRedemptionService service;

    @BeforeEach
    void setUp() {
        vouchers = org.mockito.Mockito.mock(VoucherRepository.class);
        audit = org.mockito.Mockito.mock(AuditWriteService.class);
        service = new VoucherRedemptionService(
                vouchers,
                org.mockito.Mockito.mock(AccountAccessService.class),
                new PricingService(),
                audit);
    }

    @Test
    void consumeUsesOneGlobalCounterAndAuditsTheCommittedValueChange() {
        Voucher voucher = voucher(1, 2);
        when(vouchers.lockById(5L)).thenReturn(Optional.of(voucher));
        when(vouchers.incrementUsageCountIfAvailable(
                        eq(5L), any(Instant.class), eq(15_000L)))
                .thenReturn(1);

        service.consume(new VoucherRedemptionService.Discount(
                5L, "SPRING", 1_000L, "FIXED", 1_000L, 15_000L));

        assertEquals(2, voucher.getUsageCount());
        verify(vouchers).incrementUsageCountIfAvailable(
                eq(5L), any(Instant.class), eq(15_000L));
        verify(audit).record(org.mockito.ArgumentMatchers.argThat(
                event -> event.action() == AuditAction.VOUCHER_QUOTA_CONSUME));
    }

    @Test
    void consumeFailsWhenTheDatabaseGuardRejectsTheFinalQuotaSlot() {
        Voucher voucher = voucher(0, 1);
        when(vouchers.lockById(5L)).thenReturn(Optional.of(voucher));
        when(vouchers.incrementUsageCountIfAvailable(
                        eq(5L), any(Instant.class), eq(15_000L)))
                .thenReturn(0);

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> service.consume(new VoucherRedemptionService.Discount(
                        5L, "SPRING", 1_000L, "FIXED", 1_000L, 15_000L)));

        assertEquals(409, error.getStatusCode().value());
        assertEquals(0, voucher.getUsageCount());
    }

    @Test
    void releaseDecrementsOneGlobalUseAndAuditsIt() {
        Voucher voucher = voucher(1, 2);
        when(vouchers.lockById(5L)).thenReturn(Optional.of(voucher));
        when(vouchers.decrementUsageCountAbove(5L, 0)).thenReturn(1);

        service.release(5L);

        assertEquals(0, voucher.getUsageCount());
        verify(audit).record(org.mockito.ArgumentMatchers.argThat(
                event -> event.action() == AuditAction.VOUCHER_QUOTA_RELEASE));
    }

    @Test
    void releaseCannotDecrementAnAlreadyEmptyGlobalCounter() {
        Voucher voucher = voucher(0, 2);
        when(vouchers.lockById(5L)).thenReturn(Optional.of(voucher));
        when(vouchers.decrementUsageCountAbove(5L, 0)).thenReturn(0);

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class, () -> service.release(5L));

        assertEquals(409, error.getStatusCode().value());
        assertEquals(0, voucher.getUsageCount());
    }

    private static Voucher voucher(int usageCount, int usageLimit) {
        Voucher voucher = new Voucher();
        voucher.setVoucherId(5L);
        voucher.setCode("SPRING");
        voucher.setDiscountType("FIXED");
        voucher.setDiscountValue(1_000L);
        voucher.setMinimumOrderValue(0L);
        voucher.setUsageLimit(usageLimit);
        voucher.setUsageCount(usageCount);
        voucher.setStatus("ACTIVE");
        voucher.setStartsAt(Instant.now().minusSeconds(60));
        voucher.setEndsAt(Instant.now().plusSeconds(3600));
        return voucher;
    }
}
