package com.fido.modules.order.dto.response;

public record PaymentPublicDto(
        String payment_status,
        Long amount_due,
        Long amount_received,
        Long amount_refunded) {}
