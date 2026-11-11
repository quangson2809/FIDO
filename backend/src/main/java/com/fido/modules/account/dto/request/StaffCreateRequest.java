package com.fido.modules.account.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record StaffCreateRequest(
        @NotBlank @Size(max = 20) String phone,
        @NotBlank @Size(max = 150) String full_name,
        @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 8, max = 128) String password,
        List<@NotNull Long> role_ids) {}
