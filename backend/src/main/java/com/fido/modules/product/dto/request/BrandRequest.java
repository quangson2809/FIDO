package com.fido.modules.product.dto.request;
import jakarta.validation.constraints.*;
public record BrandRequest(@NotBlank @Size(max=150) String name) {}
