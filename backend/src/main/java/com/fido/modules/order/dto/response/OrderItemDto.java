package com.fido.modules.order.dto.response;

import java.math.BigDecimal;

public record OrderItemDto(
        Long order_item_id,
        Long product_id,
        String product_name,
        String image_url,
        String sku,
        BigDecimal unit_price,
        Integer quantity,
        BigDecimal line_total) {}
