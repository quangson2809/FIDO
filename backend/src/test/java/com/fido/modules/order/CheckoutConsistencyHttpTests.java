package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import java.util.Map;

class CheckoutConsistencyHttpTests extends OrderHttpSupport {

    @Test
    void quoteAndOrderCreationUseTheSameValidatedCalculation() throws Exception {
        User customer = user();

        CatalogFixture fixture = createVariant(5, 100000, 80000);

        var added =
                call(
                        "POST",
                        "/api/v1/cart/items",
                        customer.token(),
                        Map.of("product_id", fixture.productId(), "quantity", 2));

        assertEquals(200, added.status(), added.body());

        Map<String, Object> checkoutRequest =
                Map.of(
                        "recipient_phone", "0900000000",
                        "recipient_name", "Test Recipient", "province", "Hanoi", "district", "Cau Giay", "ward", "Dich Vong", "address_line", "Cau Giay, Hanoi");

        var quote = call("POST", "/api/v1/checkout/quote", customer.token(), checkoutRequest);

        assertEquals(200, quote.status(), quote.body());

        var created = call("POST", "/api/v1/orders", customer.token(), checkoutRequest);

        assertEquals(201, created.status(), created.body());

        long orderId = created.data().get("data").get("order_id").asLong();

        orderIds.add(orderId);

        Map<String, String> quoteFields = Map.of(
                "subtotal", "subtotal",
                "discount", "discount_amount",
                "shipping_fee", "shipping_fee",
                "total", "total_amount");
        for (var field : quoteFields.entrySet()) {
            assertEquals(
                    quote.data().get("data").get(field.getValue()).decimalValue(),
                    created.data().get("data").get(field.getKey()).decimalValue(),
                    field.getKey());
        }

        assertEquals(190000, created.data().get("data").get("total").asInt());

        assertEquals(5, stock(fixture.productId()));
    }
}
