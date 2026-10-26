package com.fido.modules.order.dto.response;

import java.math.BigDecimal;

public record CheckoutItemDto(
        Long product_id,
        Integer quantity,
        String product_name,
        String thumbnail,
        String sku,
        BigDecimal unit_price,
        BigDecimal line_total,
        Integer available_quantity) {}
