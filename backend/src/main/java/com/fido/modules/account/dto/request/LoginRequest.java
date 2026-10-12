package com.fido.modules.account.dto.request;

import jakarta.validation.constraints.*;

public record LoginRequest(
        @NotBlank @Size(max = 20) String identifier, @NotBlank String password) {}
