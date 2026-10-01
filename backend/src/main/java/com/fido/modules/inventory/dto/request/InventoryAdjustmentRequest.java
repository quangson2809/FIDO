package com.fido.modules.inventory.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record InventoryAdjustmentRequest(
        @NotNull @Positive Long variant_id,
        @NotNull Integer quantity_delta,
        @NotBlank @Size(max = 500) String reason
) {
}
