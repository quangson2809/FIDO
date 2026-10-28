package com.fido.modules.order.dto.response;

public record CheckoutItemDto(
        Long product_id,
        Integer quantity,
        String product_name,
        String thumbnail,
        String sku,
        Long unit_price,
        Long discount_amount,
        Long line_total,
        Integer available_quantity) {}
