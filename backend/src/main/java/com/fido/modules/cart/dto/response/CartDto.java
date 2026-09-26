package com.fido.modules.cart.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record CartDto(
        Long cart_id,
        Long account_id,
        List<CartItemDto> items,
        BigDecimal subtotal,
        LocalDateTime created_at,
        LocalDateTime updated_at
) {
}
