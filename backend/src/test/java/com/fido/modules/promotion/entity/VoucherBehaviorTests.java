package com.fido.modules.promotion.entity;

import static org.junit.jupiter.api.Assertions.*;

import com.fido.common.exception.BusinessRuleException;

import org.junit.jupiter.api.Test;

import java.time.Instant;

class VoucherBehaviorTests {
    private static final Instant START = Instant.parse("2026-11-18T00:00:00Z");

    private Voucher.Configuration configuration(int limit) {
        return new Voucher.Configuration(
                "FIXED", 500L, 1000L, null, START, START.plusSeconds(60), limit);
    }

    @Test
    void timeMinimumAndQuotaChecksHaveNoConsumptionSideEffect() {
        Voucher voucher = new Voucher();
        voucher.configure(configuration(1), "ACTIVE");
        assertThrows(
                BusinessRuleException.class, () -> voucher.requireRedeemable(START.minusNanos(1)));
        voucher.requireRedeemable(START);
        assertFalse(voucher.meetsMinimumOrder(999));
        assertTrue(voucher.meetsMinimumOrder(1000));
        assertThrows(
                BusinessRuleException.class,
                () -> voucher.requireRedeemable(START.plusSeconds(60)));
        assertEquals(0, voucher.getUsageCount());
        // A persisted quota is loaded by JPA; the service still claims it with a guarded UPDATE.
        voucher.setUsageCount(1);
        assertThrows(BusinessRuleException.class, () -> voucher.requireRedeemable(START));
        assertEquals(1, voucher.getUsageCount());
    }

    @Test
    void invalidConfigurationDoesNotPartiallyApplyOrActivateVoucher() {
        Voucher voucher = new Voucher();
        voucher.configure(configuration(3), "DRAFT");
        voucher.setUsageCount(2);
        assertThrows(
                BusinessRuleException.class, () -> voucher.configure(configuration(1), "ACTIVE"));
        assertEquals("DRAFT", voucher.getStatus());
        assertEquals(3, voucher.getUsageLimit());
        var invalidPercent =
                new Voucher.Configuration("PERCENT", 10001L, 0L, null, null, null, null);
        assertThrows(
                BusinessRuleException.class, () -> voucher.configure(invalidPercent, "ACTIVE"));
        assertEquals("FIXED", voucher.getDiscountType());
        voucher.configure(configuration(3), "ACTIVE");
        voucher.configure(configuration(3), "EXPIRED");
        assertThrows(
                BusinessRuleException.class, () -> voucher.configure(configuration(3), "ACTIVE"));
        assertEquals("EXPIRED", voucher.getStatus());
    }
}
