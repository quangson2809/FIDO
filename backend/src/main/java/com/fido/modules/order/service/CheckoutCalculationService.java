package com.fido.modules.order.service;

import com.fido.modules.cart.service.CartQueryService;
import com.fido.modules.cart.service.CheckoutCartView;
import java.math.BigDecimal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CheckoutCalculationService {

    private final com.fido.modules.promotion.service.VoucherRedemptionService vouchers;
    private final CartQueryService cart;
    private final BigDecimal shippingFee;

    public CheckoutCalculationService(
            CartQueryService cart,
            com.fido.modules.promotion.service.VoucherRedemptionService vouchers,
            @Value("${app.checkout.shipping-fee}")
                    BigDecimal shippingFee
    ) {
        if (shippingFee.signum() < 0) {
            throw new IllegalArgumentException(
                    "Checkout shipping fee cannot be negative"
            );
        }

        this.cart = cart;
        this.vouchers = vouchers;
        this.shippingFee = shippingFee;
    }

    CheckoutCalculation calculate(
            Long accountId,
            String voucherCode
    ) {


        CheckoutCartView current = cart.checkoutView(accountId);

        if (current.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        current.items().forEach(
                this::requireCheckoutReady
        );

        var voucher = voucherCode == null || voucherCode.isBlank()
                ? new com.fido.modules.promotion.service.VoucherRedemptionService.Discount(null,null,BigDecimal.ZERO)
                : vouchers.evaluate(accountId, voucherCode, current.items().stream()
                .map(i -> new com.fido.modules.promotion.service.VoucherRedemptionService.Line(i.variantId(),i.lineTotal())).toList());
        BigDecimal discount = voucher.amount();
        BigDecimal total = current.subtotal()
                .subtract(discount)
                .add(shippingFee);

        return new CheckoutCalculation(
                current.items(),
                current.subtotal(),
                discount,
                shippingFee,
                total,
                voucher
        );
    }

    private void requireCheckoutReady(
            CheckoutCartView.Item item
    ) {
        boolean enoughInventory =
                item.availableQuantity() != null
                && item.availableQuantity() >= item.quantity();

        if (!item.purchasable() || !enoughInventory) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT
            );
        }
    }
}
