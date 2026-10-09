package com.fido.modules.order.service;

import com.fido.modules.order.dto.request.CheckoutQuoteRequest;
import com.fido.modules.order.dto.response.CheckoutItemDto;
import com.fido.modules.order.dto.response.CheckoutQuoteDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CheckoutQuoteService {

    private final CheckoutCalculationService checkout;
    private final CheckoutQuoteStore quotes;
    private final com.fido.modules.cart.service.CartCommandService cart;

    public CheckoutQuoteService(
            CheckoutCalculationService checkout,
            CheckoutQuoteStore quotes,
            com.fido.modules.cart.service.CartCommandService cart
    ) {
        this.checkout = checkout;
        this.quotes = quotes;
        this.cart = cart;
    }

    public CheckoutQuoteDto quote(
            Long accountId,
            CheckoutQuoteRequest request
    ) {
        cart.lockForCheckout(accountId);
        CheckoutCalculation calculation = checkout.calculate(
                accountId,
                request.voucher_code()
        );

        var quoteItems = calculation.items()
                .stream()
                .map(item ->
                        new CheckoutItemDto(
                                item.variantId(),
                                item.quantity(),
                                item.productName(),
                                item.thumbnail(),
                                item.size(),
                                item.color(),
                                item.unitPrice(),
                                item.lineTotal(),
                                item.availableQuantity()
                        )
                )
                .toList();

        var saved = quotes.save(accountId, request.recipient_phone(),request.recipient_email(),request.recipient_address(),calculation);
        return new CheckoutQuoteDto(
                quoteItems,
                calculation.subtotal(),
                calculation.discount(),
                calculation.shippingFee(),
                calculation.total(),
                calculation.voucher().voucherId()==null ? null : new com.fido.modules.order.dto.response.VoucherDto(calculation.voucher().voucherId(),calculation.voucher().code()),
                saved.getQuoteId(),
                saved.getExpiresAt()
        );
    }
}
