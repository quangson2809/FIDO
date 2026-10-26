package com.fido.modules.order.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record CheckoutQuoteDto(
        List<CheckoutItemDto> items,
        Long subtotal,
        Long discount,
        Long shipping_fee,
        Long total,
        VoucherDto voucher,
        String quote_id,
        java.time.Instant expires_at) {
    /** Compatibility adapter for old tests; public money fields stay integer VND. */
    public CheckoutQuoteDto(
            List<CheckoutItemDto> items, BigDecimal subtotal, BigDecimal discount,
            BigDecimal shipping_fee, BigDecimal total, VoucherDto voucher,
            String quote_id, java.time.Instant expires_at) {
        this(items, exactVnd(subtotal), exactVnd(discount), exactVnd(shipping_fee),
                exactVnd(total), voucher, quote_id, expires_at);
    }

    private static Long exactVnd(BigDecimal amount) {
        return amount == null ? null : amount.longValueExact();
    }
}
