package com.fido.modules.order.dto.response;

import java.time.LocalDateTime;

public record ShippingInfoDto(
        String shipping_status,
        String recipient_name,
        String recipient_phone,
        String carrier_name,
        String tracking_number,
        LocalDateTime shipped_at,
        LocalDateTime delivered_at) {}
