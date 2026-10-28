package com.fido.modules.cart;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import java.util.Map;

class CartItemHttpTests extends CartHttpSupport {

    @Test
    void itemLifecycleEnforcesOwnershipSellabilityAndNoStockReservation() throws Exception {
        User owner = user();
        User other = user();

        CatalogFixture active = createVariant("ON_SALE", "ON_SALE", 5, 100000, 90000);

        CatalogFixture stopped = createVariant("ON_SALE", "STOPPED", 10, 120000, null);

        CatalogFixture outOfStock = createVariant("ON_SALE", "ON_SALE", 0, 130000, null);

        long inventoryBefore =
                db.queryForObject(
                        """
                        SELECT quantity_on_hand
                        FROM inventories
                        WHERE product_id=?
                        """,
                        Long.class,
                        active.productId());

        int ledgerBefore =
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM inventory_transactions
                        WHERE product_id=?
                        """,
                        Integer.class,
                        active.productId());

        var added =
                call(
                        "POST",
                        "/api/v1/cart/items",
                        owner.token(),
                        Map.of("product_id", active.productId(), "quantity", 2));

        assertEquals(200, added.status(), added.body());

        long cartItemId = added.data().get("data").get("items").get(0).get("cart_item_id").asLong();

        assertEquals(2, added.data().get("data").get("items").get(0).get("quantity").asInt());

        assertEquals(90000, added.data().get("data").get("items").get(0).get("unit_price").asInt());

        assertEquals(180000, added.data().get("data").get("subtotal").asInt());

        var addedAgain =
                call(
                        "POST",
                        "/api/v1/cart/items",
                        owner.token(),
                        Map.of("product_id", active.productId(), "quantity", 1));

        assertEquals(3, addedAgain.data().get("data").get("items").get(0).get("quantity").asInt());

        var patched =
                call(
                        "PATCH",
                        "/api/v1/cart/items/" + cartItemId,
                        owner.token(),
                        Map.of("quantity", 2));

        assertEquals(200, patched.status());
        assertEquals(2, patched.data().get("data").get("items").get(0).get("quantity").asInt());

        assertEquals(
                400,
                call(
                                "PATCH",
                                "/api/v1/cart/items/" + cartItemId,
                                owner.token(),
                                Map.of("quantity", 0))
                        .status());

        call("GET", "/api/v1/cart", other.token(), null);

        assertEquals(
                404,
                call(
                                "PATCH",
                                "/api/v1/cart/items/" + cartItemId,
                                other.token(),
                                Map.of("quantity", 1))
                        .status());

        assertEquals(
                409,
                call(
                                "POST",
                                "/api/v1/cart/items",
                                owner.token(),
                                Map.of("product_id", stopped.productId(), "quantity", 1))
                        .status());

        var outOfStockAdded = call(
                "POST", "/api/v1/cart/items", owner.token(),
                Map.of("product_id", outOfStock.productId(), "quantity", 1));
        assertEquals(200, outOfStockAdded.status(), outOfStockAdded.body());
        long outOfStockItemId = 0L;
        for (var item : outOfStockAdded.data().get("data").get("items")) {
            if (item.get("product_id").asLong() == outOfStock.productId()) {
                outOfStockItemId = item.get("cart_item_id").asLong();
            }
        }
        assertTrue(outOfStockItemId > 0);
        assertEquals(200, call("DELETE", "/api/v1/cart/items/" + outOfStockItemId,
                owner.token(), null).status());

        assertEquals(
                404,
                call(
                                "POST",
                                "/api/v1/cart/items",
                                owner.token(),
                                Map.of("product_id", Long.MAX_VALUE, "quantity", 1))
                        .status());

        assertEquals(
                inventoryBefore,
                db.queryForObject(
                        """
                        SELECT quantity_on_hand
                        FROM inventories
                        WHERE product_id=?
                        """,
                        Long.class,
                        active.productId()));

        assertEquals(
                ledgerBefore,
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM inventory_transactions
                        WHERE product_id=?
                        """,
                        Integer.class,
                        active.productId()));

        db.update(
                """
                UPDATE products SET selling_price=80000, updated_at=CURRENT_TIMESTAMP WHERE id=?
                """,
                active.productId());

        var repriced = call("GET", "/api/v1/cart", owner.token(), null);

        assertEquals(
                80000, repriced.data().get("data").get("items").get(0).get("unit_price").asInt());

        assertEquals(160000, repriced.data().get("data").get("subtotal").asInt());

        var deleted = call("DELETE", "/api/v1/cart/items/" + cartItemId, owner.token(), null);

        assertEquals(200, deleted.status());
        assertEquals(0, deleted.data().get("data").get("items").size());
        assertEquals(0, deleted.data().get("data").get("subtotal").asInt());

        assertEquals(200, call("DELETE", "/api/v1/cart", owner.token(), null).status());
    }
}
