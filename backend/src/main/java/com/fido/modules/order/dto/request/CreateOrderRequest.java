package com.fido.modules.order.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Canonical order-placement body. Idempotency-Key is supplied only as an HTTP header. */
public record CreateOrderRequest(
        @NotBlank @Size(max = 150) String recipient_name,
        @NotBlank @Size(max = 20) String recipient_phone,
        @NotBlank @Size(max = 120) String province,
        @NotBlank @Size(max = 120) String district,
        @NotBlank @Size(max = 120) String ward,
        @NotBlank @Size(max = 500) String address_line,
        @Size(max = 80) String voucher_code) {}
