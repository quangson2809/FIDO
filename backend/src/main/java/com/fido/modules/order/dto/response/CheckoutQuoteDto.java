package com.fido.modules.order.dto.response;

import java.util.List;

/** Advisory response only; deliberately has no quote_id or expiry/commit token. */
public record CheckoutQuoteDto(
        List<CheckoutItemDto> items,
        Long subtotal,
        Long discount_amount,
        Long shipping_fee,
        Long total_amount,
        VoucherDto voucher) {

    public CheckoutQuoteDto {
        items = List.copyOf(items);
    }
}
