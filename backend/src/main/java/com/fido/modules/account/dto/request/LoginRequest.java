package com.fido.modules.account.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Login accepts the canonical phone field only. */
public record LoginRequest(
        @NotBlank @Size(max = 20) String phone,
        @NotBlank @Size(min = 1, max = 128) String password) {}
