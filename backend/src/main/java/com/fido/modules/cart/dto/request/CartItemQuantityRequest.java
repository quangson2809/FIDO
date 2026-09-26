package com.fido.modules.cart.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CartItemQuantityRequest(
        @NotNull @Positive Integer quantity
) {
}
