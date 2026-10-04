package com.fido.modules.order.dto.response;

import java.math.BigDecimal;

public record CheckoutItemDto(
        Long variant_id,
        Integer quantity,
        String product_name,
        String thumbnail,
        String size,
        String color,
        BigDecimal unit_price,
        BigDecimal line_total,
        Integer available_quantity
) {
}
