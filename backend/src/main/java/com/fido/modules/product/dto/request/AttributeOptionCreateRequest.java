package com.fido.modules.product.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record AttributeOptionCreateRequest(
        @NotBlank @Size(max = 120) String value,
        @NotBlank @Size(max = 150) String label,
        @PositiveOrZero Integer sort_order) {}
