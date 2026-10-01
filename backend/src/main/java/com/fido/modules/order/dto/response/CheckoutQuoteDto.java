package com.fido.modules.order.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record CheckoutQuoteDto(
        List<CheckoutItemDto> items,
        BigDecimal subtotal,
        BigDecimal discount,
        BigDecimal shipping_fee,
        BigDecimal total,
        VoucherDto voucher
) {
}
