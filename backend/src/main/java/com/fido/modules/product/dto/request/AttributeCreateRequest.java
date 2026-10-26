package com.fido.modules.product.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record AttributeCreateRequest(
        @NotNull @Positive Long attribute_type_id,
        @NotBlank @Size(max = 80) String code,
        @NotBlank @Size(max = 150) String name,
        @NotNull Boolean is_required,
        Boolean is_variant_defining,
        @PositiveOrZero Integer sort_order) {}
