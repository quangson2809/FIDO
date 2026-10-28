package com.fido.modules.order.dto.response;

public record OrderItemDto(
        Long order_item_id,
        Long product_id,
        String product_name,
        String image_url,
        String sku,
        Long unit_price,
        Integer quantity,
        Long line_total,
        Long discount_amount) {}
