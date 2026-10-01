package com.fido.modules.order.dto.response;

import java.math.BigDecimal;

public record OrderItemDto(
        Long order_item_id,
        Long variant_id,
        String product_name,
        String sku,
        String size,
        String color,
        BigDecimal unit_price,
        Integer quantity,
        BigDecimal line_total
) {
}
