package com.fido.modules.order.service;

import com.fido.modules.order.dto.request.CheckoutQuoteRequest;
import com.fido.modules.order.dto.response.CheckoutItemDto;
import com.fido.modules.order.dto.response.CheckoutQuoteDto;
import com.fido.modules.order.dto.response.VoucherDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read-only advisory calculation. Order placement always reloads and recalculates independently. */
@Service
@Transactional(readOnly = true)
public class CheckoutQuoteService {
    private final CheckoutCalculationService checkout;
    private final CheckoutRequestNormalizer normalizer;

    public CheckoutQuoteService(
            CheckoutCalculationService checkout,
            CheckoutRequestNormalizer normalizer) {
        this.checkout = checkout;
        this.normalizer = normalizer;
    }

    public CheckoutQuoteDto quote(Long accountId, CheckoutQuoteRequest request) {
        var normalized = normalizer.normalize(
                request.recipient_name(),
                request.recipient_phone(),
                request.province(),
                request.district(),
                request.ward(),
                request.address_line(),
                request.voucher_code());
        CheckoutCalculation calculation =
                checkout.calculateForQuote(accountId, normalized.voucherCode());

        var quoteItems = calculation.items().stream()
                .map(item -> {
                    var priced = calculation.lineFor(item.productId());
                    return new CheckoutItemDto(
                            item.productId(),
                            item.quantity(),
                            item.productName(),
                            item.thumbnail(),
                            item.sku(),
                            item.unitPrice(),
                            priced.discountAmount(),
                            priced.lineTotal(),
                            item.availableQuantity());
                })
                .toList();

        VoucherDto voucher = calculation.voucher().voucherId() == null
                ? null
                : new VoucherDto(calculation.voucher().voucherId(), calculation.voucher().code());
        return new CheckoutQuoteDto(
                quoteItems,
                calculation.subtotal(),
                calculation.discount(),
                calculation.shippingFee(),
                calculation.total(),
                voucher);
    }
}
