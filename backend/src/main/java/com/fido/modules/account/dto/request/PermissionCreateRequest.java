package com.fido.modules.account.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PermissionCreateRequest(
        @NotBlank @Size(max = 120) String code,
        @NotBlank @Size(max = 200) String name,
        @Size(max = 500) String description) {

    public PermissionCreateRequest(String code, String name) {
        this(code, name, null);
    }
}
