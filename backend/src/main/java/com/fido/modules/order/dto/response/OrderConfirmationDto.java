package com.fido.modules.order.dto.response;

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
        LocalDateTime created_at) {}
