package com.fido.modules.account.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(max = 20) String phone,
        @NotBlank @Size(max = 150) String full_name,
        @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 8, max = 128) String password) {}
