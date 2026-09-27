package com.fido.modules.order.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record OrderConfirmationDto(
        Long order_id,
        String order_code,
        String order_status,
        PaymentPublicDto payment,
        BigDecimal subtotal,
        BigDecimal discount,
        BigDecimal shipping_fee,
        BigDecimal total,
        RecipientDto recipient,
        LocalDateTime created_at
) {
}
