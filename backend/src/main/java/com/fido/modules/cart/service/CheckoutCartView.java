package com.fido.modules.cart.service;

import java.math.BigDecimal;
import java.util.List;

/**
 * Internal cross-module checkout input.
 * Values are recalculated from current Catalog and Inventory state.
 */
public record CheckoutCartView(
        Long cartId,
        List<Item> items,
        BigDecimal subtotal
) {

    public record Item(
            Long variantId,
            Integer quantity,
            String productName,
            String sku,
            String size,
            String color,
            BigDecimal unitPrice,
            BigDecimal lineTotal,
            Integer availableQuantity,
            boolean purchasable
    ) {
    }
}
