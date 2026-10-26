package com.fido.modules.order.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
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

    /** Compatibility adapter for legacy source fixtures; quote identifiers are intentionally discarded. */
    @Deprecated
    public CheckoutQuoteDto(
            List<CheckoutItemDto> items,
            Long subtotal,
            Long discount,
            Long shippingFee,
            Long total,
            VoucherDto voucher,
            String quoteId,
            Instant expiresAt) {
        this(items, subtotal, discount, shippingFee, total, voucher);
    }

    /** Compatibility adapter for old monetary fixtures; public values remain integer VND. */
    @Deprecated
    public CheckoutQuoteDto(
            List<CheckoutItemDto> items,
            BigDecimal subtotal,
            BigDecimal discount,
            BigDecimal shippingFee,
            BigDecimal total,
            VoucherDto voucher,
            String quoteId,
            Instant expiresAt) {
        this(items, exactVnd(subtotal), exactVnd(discount), exactVnd(shippingFee),
                exactVnd(total), voucher);
    }

    private static Long exactVnd(BigDecimal amount) {
        return amount == null ? null : amount.longValueExact();
    }
}
