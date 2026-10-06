package com.fido.modules.product.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record ProductImageInput(
        @NotBlank @Size(max = 1000) String image_url,
        @Size(max = 255) String alt_text,
        @NotNull @PositiveOrZero Integer sort_order
) {
}
