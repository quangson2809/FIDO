package com.fido.modules.product.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record BrandRequest(
        @NotBlank @Size(max = 150) String name,
        @Pattern(regexp = "ACTIVE|INACTIVE") String status) {}
