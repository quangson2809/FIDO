package com.fido.modules.inventory.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

public record StocktakeRequest(
        @NotBlank @Pattern(regexp = "[A-Za-z0-9._:-]{1,80}") String source_operation_id,
        @NotBlank @Size(max = 500) String reason,
        @NotEmpty @Size(max = 100) List<@Valid Line> items) {
    public record Line(
            @NotNull @Positive Long product_id,
            @Min(0) int counted_quantity,
            @NotNull @Min(0) Integer expected_version) {}
}
