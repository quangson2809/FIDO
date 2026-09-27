package com.fido.modules.order.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record AfterSalesRequest(
        @NotBlank String operation,
        @NotBlank @Size(max = 500) String reason,
        @Positive Long source_variant_id,
        @Positive Long target_variant_id,
        @Positive Integer quantity
) {
}
