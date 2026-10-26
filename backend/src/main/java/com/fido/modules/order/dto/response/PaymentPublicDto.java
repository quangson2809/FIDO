package com.fido.modules.order.dto.response;

import java.math.BigDecimal;

public record PaymentPublicDto(
        String payment_status,
        Long amount_due,
        Long amount_received,
        Long amount_refunded) {
    /** Compatibility adapter for old test fixtures; the HTTP money contract is integer VND. */
    public PaymentPublicDto(String payment_status, BigDecimal amount_due,
            BigDecimal amount_received, BigDecimal amount_refunded) {
        this(payment_status, exactVnd(amount_due), exactVnd(amount_received), exactVnd(amount_refunded));
    }
    private static Long exactVnd(BigDecimal amount) { return amount == null ? null : amount.longValueExact(); }
}
