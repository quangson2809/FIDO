package com.fido.modules.pricing;

import java.util.List;
import java.util.function.Supplier;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Application-facing boundary for the single authoritative pricing calculator. */
@Service
public class PricingService {
    private final PricingCalculator calculator;

    public PricingService() {
        this.calculator = new PricingCalculator();
    }

    public PricingCalculator.PricingResult calculate(
            List<PricingCalculator.LineInput> lines, long requestedDiscount, long shippingFee) {
        return translate(() -> calculator.calculate(lines, requestedDiscount, shippingFee));
    }

    public long calculateSubtotal(List<PricingCalculator.LineInput> lines) {
        return translate(() -> calculator.calculateSubtotal(lines));
    }

    public long calculateLineGross(Long unitPrice, Integer quantity) {
        return translate(() -> calculator.calculateLineGross(unitPrice, quantity));
    }

    public long calculateDiscountAmount(
            String discountType, Long discountValue, Long maximumDiscount, long subtotal) {
        return translate(
                () -> calculator.calculateDiscountAmount(
                        discountType, discountValue, maximumDiscount, subtotal));
    }

    public long sumAmounts(List<Long> amounts) {
        return translate(() -> calculator.sumAmounts(amounts));
    }

    private <T> T translate(Supplier<T> calculation) {
        try {
            return calculation.get();
        } catch (PricingException ex) {
            HttpStatus status = "MONEY_TOTAL_MISMATCH".equals(ex.code())
                    ? HttpStatus.CONFLICT
                    : HttpStatus.BAD_REQUEST;
            throw new ResponseStatusException(status, ex.code());
        }
    }
}
