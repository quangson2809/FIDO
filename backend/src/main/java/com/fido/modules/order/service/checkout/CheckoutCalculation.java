package com.fido.modules.order.service.checkout;

import com.fido.modules.cart.service.CheckoutCartView;
import com.fido.modules.pricing.PricingCalculator;
import com.fido.modules.promotion.service.VoucherRedemptionService;

import java.util.List;

record CheckoutCalculation(
        List<CheckoutCartView.Item> items,
        long subtotal,
        long discount,
        long shippingFee,
        long total,
        VoucherRedemptionService.Discount voucher,
        List<PricingCalculator.PricedLine> pricedLines) {

    CheckoutCalculation {
        items = List.copyOf(items);
        pricedLines = pricedLines == null ? List.of() : List.copyOf(pricedLines);
    }

    PricingCalculator.PricedLine lineFor(Long productId) {
        return pricedLines.stream()
                .filter(line -> line.productId().equals(productId))
                .findFirst()
                .orElseThrow(
                        () ->
                                new IllegalStateException(
                                        "Pricing result is missing a Product line"));
    }
}
