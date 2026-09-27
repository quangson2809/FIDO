package com.fido.modules.order.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentAdminDto(
        String payment_status,
        BigDecimal amount_due,
        BigDecimal amount_received,
        BigDecimal amount_refunded,
        Long collected_by_account_id,
        LocalDateTime collected_at,
        Long refunded_by_account_id,
        LocalDateTime refunded_at
) {
}
