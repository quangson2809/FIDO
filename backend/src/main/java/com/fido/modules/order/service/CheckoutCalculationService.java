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

import java.math.BigDecimal;

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
            throw new IllegalArgumentException("Checkout shipping fee must be a non-negative integer VND amount");
        }
        this.cart = cart;
        this.vouchers = vouchers;
        this.shippingFee = shippingFee;
        this.pricing = pricing;
    }

    /** Compatibility adapter for old tests; production configuration uses integer VND. */
    CheckoutCalculationService(
            CartQueryService cart,
            VoucherRedemptionService vouchers,
            BigDecimal shippingFee) {
        this(cart, vouchers, exactVnd(shippingFee), new PricingService());
    }

    CheckoutCalculation calculate(Long accountId, String voucherCode) {
        CheckoutCartView current = cart.checkoutView(accountId);
        if (current.items().isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT, "CART_EMPTY");
        current.items().forEach(this::requireCheckoutReady);

        var voucher = voucherCode == null || voucherCode.isBlank()
                ? new VoucherRedemptionService.Discount(null, null, 0L)
                : vouchers.evaluate(accountId, voucherCode,
                        current.items().stream()
                                .map(item -> new VoucherRedemptionService.Line(item.productId(), item.lineTotal()))
                                .toList());

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
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_INSUFFICIENT_STOCK");
        }
    }

    private static Long exactVnd(BigDecimal amount) {
        return amount == null ? null : amount.longValueExact();
    }
}
