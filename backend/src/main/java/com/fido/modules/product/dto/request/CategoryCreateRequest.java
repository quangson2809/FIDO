package com.fido.modules.product.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CategoryCreateRequest(
        @Positive Long parent_category_id,
        @NotBlank @Size(max = 150) String name,
        @Pattern(regexp = "ACTIVE|INACTIVE") String status) {}
