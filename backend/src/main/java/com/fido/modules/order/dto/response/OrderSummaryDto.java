package com.fido.modules.order.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record OrderSummaryDto(
        Long order_id,
        String order_code,
        String order_status,
        String payment_status,
        String image_url,
        Long total,
        LocalDateTime created_at,
        LocalDateTime completed_at,
        LocalDateTime returned_at) {
    /** Compatibility adapter for old test fixtures; the HTTP money contract is integer VND. */
    public OrderSummaryDto(
            Long order_id, String order_code, String order_status, String payment_status,
            String image_url, BigDecimal total, LocalDateTime created_at,
            LocalDateTime completed_at, LocalDateTime returned_at) {
        this(order_id, order_code, order_status, payment_status, image_url,
                total == null ? null : total.longValueExact(), created_at, completed_at, returned_at);
    }
}
