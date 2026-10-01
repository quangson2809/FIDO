package com.fido.modules.order.service;

import com.fido.modules.cart.service.CheckoutCartView;
import java.math.BigDecimal;
import java.util.List;

record CheckoutCalculation(
        List<CheckoutCartView.Item> items,
        BigDecimal subtotal,
        BigDecimal discount,
        BigDecimal shippingFee,
        BigDecimal total
) {

    CheckoutCalculation {
        items = List.copyOf(items);
    }
}
