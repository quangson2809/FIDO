package com.fido.modules.cart.dto.response;

import java.math.BigDecimal;

public record CartItemDto(
        Long cart_item_id,
        Long product_id,
        Integer quantity,
        String product_name,
        String image_url,
        String thumbnail,
        String sku,
        Long unit_price,
        Long line_total,
        Integer available_quantity) {
    /** Compatibility adapter for old test fixtures; response money is integer VND. */
    public CartItemDto(
            Long cart_item_id, Long product_id, Integer quantity, String product_name,
            String image_url, String thumbnail, String sku, BigDecimal unit_price,
            BigDecimal line_total, Integer available_quantity) {
        this(cart_item_id, product_id, quantity, product_name, image_url, thumbnail, sku,
                exactVnd(unit_price), exactVnd(line_total), available_quantity);
    }

    private static Long exactVnd(BigDecimal amount) {
        return amount == null ? null : amount.longValueExact();
    }
}
