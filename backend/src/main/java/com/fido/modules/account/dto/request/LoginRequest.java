package com.fido.modules.account.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The canonical field is phone; identifier remains an input alias for existing clients. */
public record LoginRequest(
        @JsonAlias("identifier") @NotBlank @Size(max = 20) String phone,
        @NotBlank @Size(min = 1, max = 128) String password) {}
