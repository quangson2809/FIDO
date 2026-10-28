package com.fido.modules.cart.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record CartDto(
        Long cart_id,
        Long account_id,
        List<CartItemDto> items,
        Long subtotal,
        LocalDateTime created_at,
        LocalDateTime updated_at) {
    /** Compatibility adapter for old test fixtures; response money is integer VND. */
    public CartDto(
            Long cart_id, Long account_id, List<CartItemDto> items, BigDecimal subtotal,
            LocalDateTime created_at, LocalDateTime updated_at) {
        this(cart_id, account_id, items, exactVnd(subtotal), created_at, updated_at);
    }

    private static Long exactVnd(BigDecimal amount) {
        return amount == null ? null : amount.longValueExact();
    }
}
