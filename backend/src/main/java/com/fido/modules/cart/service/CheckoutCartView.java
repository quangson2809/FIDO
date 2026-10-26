package com.fido.modules.cart.service;

import java.math.BigDecimal;
import java.util.List;

public record CheckoutCartView(Long cartId, List<Item> items, Long subtotal) {
    public CheckoutCartView {
        items = items == null ? List.of() : List.copyOf(items);
    }

    /** Compatibility adapter for old test fixtures; decimal values never enter pricing. */
    public CheckoutCartView(Long cartId, List<Item> items, BigDecimal subtotal) {
        this(cartId, items, exactVnd(subtotal));
    }

    public record Item(
            Long productId,
            Integer quantity,
            String productName,
            String thumbnail,
            String sku,
            Long unitPrice,
            Long lineTotal,
            Integer availableQuantity,
            boolean purchasable) {
        /** Compatibility adapter for old test fixtures; rejects fractional VND. */
        public Item(
                Long productId, Integer quantity, String productName, String thumbnail, String sku,
                BigDecimal unitPrice, BigDecimal lineTotal, Integer availableQuantity, boolean purchasable) {
            this(productId, quantity, productName, thumbnail, sku,
                    exactVnd(unitPrice), exactVnd(lineTotal), availableQuantity, purchasable);
        }
    }

    private static Long exactVnd(BigDecimal amount) {
        return amount == null ? null : amount.longValueExact();
    }
}
