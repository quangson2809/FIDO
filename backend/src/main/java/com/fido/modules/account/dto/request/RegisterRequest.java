package com.fido.modules.account.dto.request;

import jakarta.validation.constraints.*;

public record RegisterRequest(
        @NotBlank @Size(max = 20) String phone,
        @Email @Size(max = 254) String email,
        @NotBlank String password) {}
