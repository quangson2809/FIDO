package com.fido.modules.inventory.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SupplierCreateRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 20) String phone,
        @Email @Size(max = 254) String email,
        @NotBlank @Pattern(regexp = "ACTIVE|INACTIVE") String usage_status) {}
