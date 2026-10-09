package com.fido.modules.order.service;

import com.fido.modules.cart.service.CheckoutCartView;
import java.math.BigDecimal;
import java.util.List;

record CheckoutCalculation(
        List<CheckoutCartView.Item> items,
        BigDecimal subtotal,
        BigDecimal discount,
        BigDecimal shippingFee,
        BigDecimal total,
        com.fido.modules.promotion.service.VoucherRedemptionService.Discount voucher
) {

    CheckoutCalculation(List<CheckoutCartView.Item> items, BigDecimal subtotal, BigDecimal discount, BigDecimal shippingFee, BigDecimal total) {
        this(items,subtotal,discount,shippingFee,total,new com.fido.modules.promotion.service.VoucherRedemptionService.Discount(null,null,discount));
    }

    CheckoutCalculation {
        items = List.copyOf(items);
    }
}
