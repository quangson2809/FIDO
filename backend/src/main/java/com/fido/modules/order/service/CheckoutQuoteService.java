package com.fido.modules.order.service;

import com.fido.modules.order.dto.request.CheckoutQuoteRequest;
import com.fido.modules.order.dto.response.CheckoutItemDto;
import com.fido.modules.order.dto.response.CheckoutQuoteDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CheckoutQuoteService {

    private final CheckoutCalculationService checkout;

    public CheckoutQuoteService(
            CheckoutCalculationService checkout
    ) {
        this.checkout = checkout;
    }

    public CheckoutQuoteDto quote(
            Long accountId,
            CheckoutQuoteRequest request
    ) {
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
                                item.size(),
                                item.color(),
                                item.unitPrice(),
                                item.lineTotal(),
                                item.availableQuantity()
                        )
                )
                .toList();

        return new CheckoutQuoteDto(
                quoteItems,
                calculation.subtotal(),
                calculation.discount(),
                calculation.shippingFee(),
                calculation.total(),
                null
        );
    }
}
