package com.fido.modules.order.service;

import com.fido.modules.cart.service.CartService;
import com.fido.modules.order.dto.request.CheckoutQuoteRequest;
import com.fido.modules.order.dto.response.CheckoutItemDto;
import com.fido.modules.order.dto.response.CheckoutQuoteDto;
import java.math.BigDecimal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class CheckoutQuoteService {

    private final CartService cart;
    private final BigDecimal shippingFee;

    public CheckoutQuoteService(
            CartService cart,
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

    public CheckoutQuoteDto quote(
            Long accountId,
            CheckoutQuoteRequest request
    ) {
        if (request.voucher_code() != null
                && !request.voucher_code().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_IMPLEMENTED
            );
        }

        var current = cart.checkoutView(accountId);

        if (current.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        var quoteItems = current.items()
                .stream()
                .map(item -> {
                    boolean enoughQuantity =
                            item.availableQuantity() != null
                            && item.availableQuantity() >= item.quantity();

                    if (!item.purchasable() || !enoughQuantity) {
                        throw new ResponseStatusException(
                                HttpStatus.CONFLICT
                        );
                    }

                    return new CheckoutItemDto(
                            item.variantId(),
                            item.quantity(),
                            item.productName(),
                            item.size(),
                            item.color(),
                            item.unitPrice(),
                            item.lineTotal(),
                            item.availableQuantity()
                    );
                })
                .toList();

        BigDecimal discount = BigDecimal.ZERO;

        BigDecimal total = current.subtotal()
                .subtract(discount)
                .add(shippingFee);

        return new CheckoutQuoteDto(
                quoteItems,
                current.subtotal(),
                discount,
                shippingFee,
                total,
                null
        );
    }
}
