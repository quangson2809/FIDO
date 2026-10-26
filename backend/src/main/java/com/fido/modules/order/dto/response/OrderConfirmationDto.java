package com.fido.modules.order.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record OrderConfirmationDto(
        Long order_id,
        String order_code,
        String order_status,
        PaymentPublicDto payment,
        Long subtotal,
        Long discount,
        Long shipping_fee,
        Long total,
        RecipientDto recipient,
        LocalDateTime created_at) {
    /** Compatibility adapter for old test fixtures; the HTTP money contract is integer VND. */
    public OrderConfirmationDto(
            Long order_id, String order_code, String order_status, PaymentPublicDto payment,
            BigDecimal subtotal, BigDecimal discount, BigDecimal shipping_fee, BigDecimal total,
            RecipientDto recipient, LocalDateTime created_at) {
        this(order_id, order_code, order_status, payment, exactVnd(subtotal), exactVnd(discount),
                exactVnd(shipping_fee), exactVnd(total), recipient, created_at);
    }
    private static Long exactVnd(BigDecimal amount) { return amount == null ? null : amount.longValueExact(); }
}
