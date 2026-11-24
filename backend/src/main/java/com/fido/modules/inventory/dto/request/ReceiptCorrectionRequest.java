package com.fido.modules.inventory.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

public record ReceiptCorrectionRequest(
        @NotBlank @Pattern(regexp = "[A-Za-z0-9._:-]{1,80}") String source_operation_id,
        Long expected_correction_id,
        @NotBlank @Size(max = 500) String reason,
        @NotEmpty @Size(max = 100) List<@Valid Line> items) {
    public record Line(
            @NotNull @Positive Long receipt_item_id,
            @Min(0) int corrected_quantity,
            @NotNull @Min(0) Long corrected_unit_cost) {}
}
