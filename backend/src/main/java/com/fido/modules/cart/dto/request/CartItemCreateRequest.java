package com.fido.modules.cart.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CartItemCreateRequest(
        @NotNull @Positive Long variant_id,
        @NotNull @Positive Integer quantity
) {
}
