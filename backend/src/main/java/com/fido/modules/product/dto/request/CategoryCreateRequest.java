package com.fido.modules.product.dto.request;
import jakarta.validation.constraints.*;
public record CategoryCreateRequest(@Positive Long parent_category_id, @NotBlank @Size(max=150) String name) {}
