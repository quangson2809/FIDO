package com.fido.modules.order.dto.response;

import java.time.LocalDateTime;

public record PaymentAdminDto(
        String payment_status,
        Long amount_due,
        Long amount_received,
        Long amount_refunded,
        Long collected_by_account_id,
        LocalDateTime collected_at,
        Long refunded_by_account_id,
        LocalDateTime refunded_at) {}
