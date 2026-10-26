package com.fido.modules.order.dto.response;

import java.math.BigDecimal;

public record OrderItemDto(
        Long order_item_id,
        Long product_id,
        String product_name,
        String image_url,
        String sku,
        Long unit_price,
        Integer quantity,
        Long line_total,
        Long discount_amount) {
    /** Compatibility adapter for old test fixtures; the HTTP money contract is integer VND. */
    public OrderItemDto(
            Long order_item_id, Long product_id, String product_name, String image_url, String sku,
            BigDecimal unit_price, Integer quantity, BigDecimal line_total) {
        this(order_item_id, product_id, product_name, image_url, sku,
                exactVnd(unit_price), quantity, exactVnd(line_total), 0L);
    }
    private static Long exactVnd(BigDecimal amount) { return amount == null ? null : amount.longValueExact(); }
}
