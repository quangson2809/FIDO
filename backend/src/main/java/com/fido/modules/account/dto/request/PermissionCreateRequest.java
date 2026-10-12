package com.fido.modules.account.dto.request;

import jakarta.validation.constraints.*;

public record PermissionCreateRequest(
        @NotBlank @Size(max = 120) String code, @NotBlank @Size(max = 200) String name) {}
