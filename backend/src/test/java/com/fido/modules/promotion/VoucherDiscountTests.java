package com.fido.modules.promotion;
import static org.junit.jupiter.api.Assertions.assertEquals;
import com.fido.modules.promotion.service.VoucherRedemptionService;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
class VoucherDiscountTests {
    @Test void fixedIsCappedToEligibleMerchandise() {
        assertEquals(new BigDecimal("75.00"),VoucherRedemptionService.discount("FIXED_AMOUNT",new BigDecimal("100"),null,new BigDecimal("75")));
    }
    @Test void percentRoundsHalfUpAndCapsAtMaximum() {
        assertEquals(new BigDecimal("3.34"),VoucherRedemptionService.discount("PERCENTAGE",new BigDecimal("10"),new BigDecimal("20"),new BigDecimal("33.35")));
        assertEquals(new BigDecimal("20.00"),VoucherRedemptionService.discount("PERCENTAGE",new BigDecimal("50"),new BigDecimal("20"),new BigDecimal("100")));
    }
}
