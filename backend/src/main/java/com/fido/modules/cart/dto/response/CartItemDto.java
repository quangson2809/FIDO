package com.fido.modules.cart.dto.response;

import java.math.BigDecimal;

public record CartItemDto(
        Long cart_item_id,
        Long variant_id,
        Integer quantity,
        String product_name,
        String image_url,
        String thumbnail,
        String size,
        String color,
        BigDecimal unit_price,
        BigDecimal line_total,
        Integer available_quantity
) {
}
