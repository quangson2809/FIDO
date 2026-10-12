package com.fido.modules.account.dto.request;

import jakarta.validation.constraints.*;

public record AddressRequest(@NotBlank @Size(max = 500) String address_text) {}
