package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Map;
import org.junit.jupiter.api.Test;

class CheckoutConsistencyHttpTests extends OrderHttpSupport {

    @Test
    void quoteAndOrderCreationUseTheSameValidatedCalculation()
            throws Exception {
        User customer = user();

        CatalogFixture fixture = createVariant(
                5,
                100000,
                80000
        );

        var added = call(
                "POST",
                "/api/v1/cart/items",
                customer.token(),
                Map.of(
                        "variant_id", fixture.variantId(),
                        "quantity", 2
                )
        );

        assertEquals(
                200,
                added.status(),
                added.body()
        );

        Map<String, Object> checkoutRequest = Map.of(
                "recipient_phone", "0900000000",
                "recipient_email", "customer@example.test",
                "recipient_address", "Cau Giay, Hanoi"
        );

        var quote = call(
                "POST",
                "/api/v1/checkout/quote",
                customer.token(),
                checkoutRequest
        );

        assertEquals(
                200,
                quote.status(),
                quote.body()
        );

        var created = call(
                "POST",
                "/api/v1/orders",
                customer.token(),
                checkoutRequest
        );

        assertEquals(
                201,
                created.status(),
                created.body()
        );

        long orderId = created.data()
                .get("data")
                .get("order_id")
                .asLong();

        orderIds.add(orderId);

        for (String field : new String[]{
                "subtotal",
                "discount",
                "shipping_fee",
                "total"
        }) {
            assertEquals(
                    quote.data()
                            .get("data")
                            .get(field)
                            .decimalValue(),
                    created.data()
                            .get("data")
                            .get(field)
                            .decimalValue(),
                    field
            );
        }

        assertEquals(
                190000,
                created.data()
                        .get("data")
                        .get("total")
                        .asInt()
        );

        assertEquals(
                5,
                stock(fixture.variantId())
        );
    }
}
