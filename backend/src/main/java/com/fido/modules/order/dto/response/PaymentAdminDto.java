package com.fido.modules.order.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentAdminDto(
        String payment_status,
        Long amount_due,
        Long amount_received,
        Long amount_refunded,
        Long collected_by_account_id,
        LocalDateTime collected_at,
        Long refunded_by_account_id,
        LocalDateTime refunded_at) {
    /** Compatibility adapter for old test fixtures; the HTTP money contract is integer VND. */
    public PaymentAdminDto(String payment_status, BigDecimal amount_due,
            BigDecimal amount_received, BigDecimal amount_refunded, Long collected_by_account_id,
            LocalDateTime collected_at, Long refunded_by_account_id, LocalDateTime refunded_at) {
        this(payment_status, exactVnd(amount_due), exactVnd(amount_received), exactVnd(amount_refunded),
                collected_by_account_id, collected_at, refunded_by_account_id, refunded_at);
    }
    private static Long exactVnd(BigDecimal amount) { return amount == null ? null : amount.longValueExact(); }
}
