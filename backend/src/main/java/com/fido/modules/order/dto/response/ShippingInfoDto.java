package com.fido.modules.order.dto.response;

public record ShippingInfoDto(
        String delivery_mode,
        String carrier_name
) {
}
