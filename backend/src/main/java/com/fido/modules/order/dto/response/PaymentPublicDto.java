package com.fido.modules.order.dto.response;

import java.math.BigDecimal;

public record PaymentPublicDto(
        String payment_status,
        BigDecimal amount_due,
        BigDecimal amount_received,
        BigDecimal amount_refunded
) {
}
