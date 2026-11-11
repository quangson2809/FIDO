package com.fido.modules.inventory.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record InventoryAdjustmentRequest(
        @NotNull @Positive Long product_id,
        @NotNull Integer quantity_delta,
        @NotBlank
                @Pattern(regexp = "COUNT_CORRECTION|DAMAGE|LOSS|FOUND|DATA_CORRECTION")
                @Size(max = 80) String reason_code,
        @NotBlank @Pattern(regexp = "[A-Za-z0-9._:-]{1,80}") String source_operation_id,
        @Min(0) Integer expected_version) {}
