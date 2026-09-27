package com.fido.modules.order.dto.response;

public record RecipientDto(
        String phone,
        String email,
        String address
) {
}
