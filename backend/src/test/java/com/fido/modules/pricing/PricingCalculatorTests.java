package com.fido.modules.pricing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

class PricingCalculatorTests {
    private final PricingCalculator pricing = new PricingCalculator();

    @Test
    void equalRemaindersUseProductIdentityInsteadOfInputOrder() {
        var first = new PricingCalculator.LineInput(9L, 1L, 1);
        var second = new PricingCalculator.LineInput(2L, 1L, 1);
        var third = new PricingCalculator.LineInput(5L, 1L, 1);

        var result = pricing.calculate(List.of(first, second, third), 2L, 0L);
        var reordered = pricing.calculate(List.of(third, first, second), 2L, 0L);

        Map<Long, Long> expected = Map.of(2L, 1L, 5L, 1L, 9L, 0L);
        assertEquals(expected, discountsByProduct(result));
        assertEquals(expected, discountsByProduct(reordered));
        assertEquals(1L, result.total());
    }

    @Test
    void allocatedLinesReconcileWithOrderTotalsAndKeepShippingSeparate() {
        var result =
                pricing.calculate(
                        List.of(
                                new PricingCalculator.LineInput(10L, 101L, 2),
                                new PricingCalculator.LineInput(20L, 199L, 1)),
                        57L,
                        30_000L);

        assertEquals(401L, result.subtotal());
        assertEquals(
                57L,
                result.lines().stream()
                        .mapToLong(PricingCalculator.PricedLine::discountAmount)
                        .sum());
        assertEquals(
                344L,
                result.lines().stream().mapToLong(PricingCalculator.PricedLine::lineTotal).sum());
        assertEquals(30_344L, result.total());
        assertTrue(result.lines().stream().allMatch(line -> line.lineTotal() >= 0));
    }

    @Test
    void allocationRejectsIntermediateOverflowInsteadOfWrappingMoney() {
        PricingException failure =
                assertThrows(
                        PricingException.class,
                        () ->
                                pricing.calculate(
                                        List.of(
                                                new PricingCalculator.LineInput(
                                                        1L, Long.MAX_VALUE, 1)),
                                        2L,
                                        0L));

        assertEquals("MONEY_OVERFLOW", failure.code());
    }

    private Map<Long, Long> discountsByProduct(PricingCalculator.PricingResult result) {
        return result.lines().stream()
                .collect(
                        Collectors.toMap(
                                PricingCalculator.PricedLine::productId,
                                PricingCalculator.PricedLine::discountAmount));
    }
}
