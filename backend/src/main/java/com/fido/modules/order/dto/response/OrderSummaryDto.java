package com.fido.modules.order.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record OrderSummaryDto(
        Long order_id,
        String order_code,
        String order_status,
        String payment_status,
        String image_url,
        BigDecimal total,
        LocalDateTime created_at,
        LocalDateTime completed_at,
        LocalDateTime returned_at
) {
}
