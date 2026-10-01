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

    private final CartQueryService cart;
    private final BigDecimal shippingFee;

    public CheckoutCalculationService(
            CartQueryService cart,
            @Value("${app.checkout.shipping-fee:30000.00}")
                    BigDecimal shippingFee
    ) {
        if (shippingFee.signum() < 0) {
            throw new IllegalArgumentException(
                    "Checkout shipping fee cannot be negative"
            );
        }

        this.cart = cart;
        this.shippingFee = shippingFee;
    }

    CheckoutCalculation calculate(
            Long accountId,
            String voucherCode
    ) {
        rejectUnsupportedVoucher(voucherCode);

        CheckoutCartView current = cart.checkoutView(accountId);

        if (current.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        current.items().forEach(
                this::requireCheckoutReady
        );

        BigDecimal discount = BigDecimal.ZERO;
        BigDecimal total = current.subtotal()
                .subtract(discount)
                .add(shippingFee);

        return new CheckoutCalculation(
                current.items(),
                current.subtotal(),
                discount,
                shippingFee,
                total
        );
    }

    private void rejectUnsupportedVoucher(String voucherCode) {
        if (voucherCode != null && !voucherCode.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_IMPLEMENTED
            );
        }
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
