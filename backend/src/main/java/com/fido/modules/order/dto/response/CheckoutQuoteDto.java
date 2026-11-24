package com.fido.modules.order.dto.response;

import java.util.List;

/** Chỉ là báo giá tham khảo; không có quote_id hoặc token cam kết giữ giá/tồn kho. */
public record CheckoutQuoteDto(
        List<CheckoutItemDto> items,
        Long subtotal,
        Long discount_amount,
        Long shipping_fee,
        Long total_amount,
        VoucherDto voucher,
        String confirmation_token) {

    public CheckoutQuoteDto(
            List<CheckoutItemDto> items,
            Long subtotal,
            Long discount_amount,
            Long shipping_fee,
            Long total_amount,
            VoucherDto voucher) {
        this(items, subtotal, discount_amount, shipping_fee, total_amount, voucher, null);
    }

    public CheckoutQuoteDto {
        items = List.copyOf(items);
    }
}
