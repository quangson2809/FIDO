package com.fido.modules.promotion.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record VoucherCreateRequest(
        @NotBlank @Size(max = 80) String code,
        @NotBlank @Pattern(regexp = "FIXED|PERCENT") String discount_type,
        @NotNull @Positive Long discount_value,
        @PositiveOrZero Long minimum_order_value,
        @PositiveOrZero Long maximum_discount,
        Instant starts_at,
        Instant ends_at,
        @Positive Integer usage_limit) {}
