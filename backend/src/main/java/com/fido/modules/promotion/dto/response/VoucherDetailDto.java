package com.fido.modules.promotion.dto.response;

import java.time.Instant;

/** Admin view of the canonical vouchers row and its global quota counter. */
public record VoucherDetailDto(
        Long id,
        String code,
        String discount_type,
        Long discount_value,
        Long minimum_order_value,
        Long maximum_discount,
        Instant starts_at,
        Instant ends_at,
        Integer usage_limit,
        Integer usage_count,
        String status) {}
