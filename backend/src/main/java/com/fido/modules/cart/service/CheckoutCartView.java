package com.fido.modules.cart.service;

import java.util.List;

public record CheckoutCartView(Long cartId, List<Item> items, Long subtotal) {
    public CheckoutCartView {
        items = items == null ? List.of() : List.copyOf(items);
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
    }

}
