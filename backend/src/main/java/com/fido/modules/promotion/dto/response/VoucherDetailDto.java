package com.fido.modules.promotion.dto.response;

import java.time.Instant;

/** Dữ liệu voucher cho quản trị, gồm bộ đếm lượt dùng chung toàn hệ thống. */
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
        String status,
        String effective_status) {}
