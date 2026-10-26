package com.fido.modules.cart.service;

import java.math.BigDecimal;
import java.util.List;

public record CheckoutCartView(Long cartId, List<Item> items, BigDecimal subtotal) {

    public record Item(
            Long productId,
            Integer quantity,
            String productName,
            String thumbnail,
            String sku,
            BigDecimal unitPrice,
            BigDecimal lineTotal,
            Integer availableQuantity,
            boolean purchasable) {}
}
