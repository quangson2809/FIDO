package com.fido.modules.cart;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import java.util.Map;

class CartAccessHttpTests extends CartHttpSupport {

    @Test
    void cartAndQuoteRequireAuthenticationAndCartStartsEmpty() throws Exception {
        User owner = user();

        assertEquals(401, call("GET", "/api/v1/cart", null, null).status());

        assertEquals(
                401,
                call(
                                "POST",
                                "/api/v1/checkout/quote",
                                null,
                                Map.of(
                                        "recipient_phone", "0900000000",
                                        "recipient_name", "Test Recipient", "province", "Hanoi", "district", "Cau Giay", "ward", "Dich Vong", "address_line", "Hanoi"))
                        .status());

        var initial = call("GET", "/api/v1/cart", owner.token(), null);

        assertEquals(200, initial.status(), initial.body());

        assertEquals(owner.accountId(), initial.data().get("data").get("account_id").asLong());

        assertTrue(initial.data().get("data").has("cart_id"));
        assertTrue(initial.data().get("data").get("cart_id").isNull());

        assertEquals(0, initial.data().get("data").get("items").size());

        assertEquals(0, initial.data().get("data").get("subtotal").asInt());

        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM carts WHERE account_id=?",
                        Integer.class,
                        owner.accountId()));
    }
}
