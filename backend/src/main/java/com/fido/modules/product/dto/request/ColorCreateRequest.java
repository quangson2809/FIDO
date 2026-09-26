package com.fido.modules.product.dto.request;
import jakarta.validation.constraints.*;
public record ColorCreateRequest(@NotBlank @Size(max=50) String code, @NotBlank @Size(max=100) String name) {}
