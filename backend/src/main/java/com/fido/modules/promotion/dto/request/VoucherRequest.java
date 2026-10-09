package com.fido.modules.promotion.dto.request;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;
public record VoucherRequest(
    @NotBlank @Size(max=80) String code,
    @NotNull @Pattern(regexp="FIXED_AMOUNT|PERCENTAGE") String discount_type,
    @NotNull @DecimalMin(value="0", inclusive=false) @Digits(integer=16,fraction=2) BigDecimal discount_value,
    @DecimalMin(value="0", inclusive=false) @Digits(integer=16,fraction=2) BigDecimal maximum_discount,
    @NotNull @DecimalMin("0") @Digits(integer=16,fraction=2) BigDecimal minimum_amount,
    @NotNull Instant starts_at, @NotNull Instant ends_at,
    @NotNull @Pattern(regexp="ALL|CATEGORY|PRODUCT") String scope,
    @NotNull Set<@NotNull @Positive Long> product_ids,
    @NotNull Set<@NotNull @Positive Long> category_ids,
    @Positive Long global_limit, @Positive Long customer_limit, boolean enabled
) {}
