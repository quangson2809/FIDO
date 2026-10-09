package com.fido.modules.promotion.dto.response;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;
public record VoucherDetailDto(Long voucher_id, String code, String discount_type,
    BigDecimal discount_value, BigDecimal maximum_discount, BigDecimal minimum_amount,
    Instant starts_at, Instant ends_at, String scope, Set<Long> product_ids,
    Set<Long> category_ids, Long global_limit, Long customer_limit, boolean enabled,
    long active_usage, boolean ever_used) {}
