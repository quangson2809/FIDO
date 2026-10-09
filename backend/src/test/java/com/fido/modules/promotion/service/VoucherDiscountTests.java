package com.fido.modules.promotion.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class VoucherDiscountTests {
    @Test
    void fixedAmountIsCappedAtEligibleMerchandiseSubtotal() {
        assertEquals(new BigDecimal("50000.00"),
                VoucherRedemptionService.discount("FIXED_AMOUNT",
                        new BigDecimal("100000"), null, new BigDecimal("50000")));
    }

    @Test
    void percentageDiscountRespectsMaximumAndExcludesNonEligibleAmount() {
        assertEquals(new BigDecimal("15000.00"),
                VoucherRedemptionService.discount("PERCENTAGE",
                        new BigDecimal("30"), new BigDecimal("15000"),
                        new BigDecimal("100000")));
    }

    @Test
    void percentageRoundsHalfUpToTwoDecimalPlaces() {
        assertEquals(new BigDecimal("0.13"),
                VoucherRedemptionService.discount("PERCENTAGE",
                        new BigDecimal("12.50"), new BigDecimal("100"),
                        new BigDecimal("1.00")));
    }
}
