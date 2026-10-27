package com.fido.modules.order.service;

import com.fido.modules.cart.service.CartQueryService;
import com.fido.modules.cart.service.CheckoutCartView;
import com.fido.modules.pricing.PricingCalculator;
import com.fido.modules.pricing.PricingService;
import com.fido.modules.promotion.service.VoucherRedemptionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;


@Service
public class CheckoutCalculationService {
    private final VoucherRedemptionService vouchers;
    private final CartQueryService cart;
    private final long shippingFee;
    private final PricingService pricing;

    @Autowired
    public CheckoutCalculationService(
            CartQueryService cart,
            VoucherRedemptionService vouchers,
            @Value("${app.checkout.shipping-fee}") Long shippingFee,
            PricingService pricing) {
        if (shippingFee == null || shippingFee < 0) {
            throw new IllegalArgumentException(
                    "Checkout shipping fee must be a non-negative integer VND amount");
        }
        this.cart = cart;
        this.vouchers = vouchers;
        this.shippingFee = shippingFee;
        this.pricing = pricing;
    }

    CheckoutCalculation calculateForOrder(Long accountId, String voucherCode) {
        return calculate(accountId, voucherCode, false);
    }

    CheckoutCalculation calculateForQuote(Long accountId, String voucherCode) {
        return calculate(accountId, voucherCode, true);
    }

    private CheckoutCalculation calculate(Long accountId, String voucherCode, boolean advisoryQuote) {
        CheckoutCartView current = cart.checkoutView(accountId);
        if (current.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CART_EMPTY");
        }
        current.items().forEach(this::requireCheckoutReady);

        VoucherRedemptionService.Discount voucher;
        if (voucherCode == null) {
            voucher = new VoucherRedemptionService.Discount(null, null, 0L);
        } else {
            var lines = current.items().stream()
                    .map(item -> new VoucherRedemptionService.Line(item.productId(), item.lineTotal()))
                    .toList();
            voucher = advisoryQuote
                    ? vouchers.evaluateForQuote(accountId, voucherCode, lines)
                    : vouchers.evaluate(accountId, voucherCode, lines);
        }

        var result = pricing.calculate(
                current.items().stream()
                        .map(item -> new PricingCalculator.LineInput(
                                item.productId(), item.unitPrice(), item.quantity()))
                        .toList(),
                voucher.amount(),
                shippingFee);
        if (voucher.voucherId() != null && result.discountAmount() == 0L) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "VOUCHER_NOT_ELIGIBLE");
        }
        return new CheckoutCalculation(
                current.items(),
                result.subtotal(),
                result.discountAmount(),
                result.shippingFee(),
                result.total(),
                voucher,
                result.lines());
    }

    private void requireCheckoutReady(CheckoutCartView.Item item) {
        boolean enoughInventory = item.availableQuantity() != null
                && item.quantity() != null
                && item.availableQuantity() >= item.quantity();
        if (!item.purchasable() || !enoughInventory) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "INVENTORY_INSUFFICIENT_STOCK");
        }
    }

}
}
