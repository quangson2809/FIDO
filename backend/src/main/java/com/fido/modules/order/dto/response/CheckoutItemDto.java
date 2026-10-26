package com.fido.modules.order.dto.response;

import java.math.BigDecimal;

public record CheckoutItemDto(
        Long product_id,
        Integer quantity,
        String product_name,
        String thumbnail,
        String sku,
        Long unit_price,
        Long discount_amount,
        Long line_total,
        Integer available_quantity) {
    /** Compatibility adapter for old test fixtures; public money fields stay integer VND. */
    public CheckoutItemDto(
            Long product_id, Integer quantity, String product_name, String thumbnail, String sku,
            BigDecimal unit_price, BigDecimal line_total, Integer available_quantity) {
        this(product_id, quantity, product_name, thumbnail, sku,
                exactVnd(unit_price), 0L, exactVnd(line_total), available_quantity);
    }

    private static Long exactVnd(BigDecimal amount) {
        return amount == null ? null : amount.longValueExact();
    }
}
