package com.fido.modules.promotion.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fido.modules.pricing.PricingService;
import org.junit.jupiter.api.Test;

class VoucherDiscountTests {
    private final PricingService pricing = new PricingService();

    @Test
    void fixedDiscountIsCappedAtMerchandiseSubtotal() {
        assertEquals(75L, pricing.calculateDiscountAmount("FIXED", 100L, null, 75L));
    }

    @Test
    void percentageUsesBasisPointsAndHalfUpRounding() {
        assertEquals(1L, pricing.calculateDiscountAmount("PERCENT", 1_000L, null, 5L));
        assertEquals(750L, pricing.calculateDiscountAmount("PERCENT", 1_500L, null, 4_997L));
    }

    @Test
    void percentageDiscountAppliesTheIntegerVndCap() {
        assertEquals(700L, pricing.calculateDiscountAmount("PERCENT", 1_500L, 700L, 4_997L));
        assertEquals(20L, pricing.calculateDiscountAmount("PERCENT", 5_000L, 20L, 100L));
    }
}
