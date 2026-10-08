package com.fido.modules.cart;

import static org.junit.jupiter.api.Assertions.*;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class CartConcurrencyTests extends CartHttpSupport {
    @Test
    void concurrentFirstAndSubsequentAddsKeepOneCartOneItemAndAllQuantities() throws Exception {
        User owner = user();
        var variant = createVariant("ON_SALE", "ON_SALE", 20, 100000, null);
        var executor = Executors.newFixedThreadPool(2);
        try {
            for (int round = 0; round < 3; round++) {
                var ready = new CountDownLatch(2);
                var start = new CountDownLatch(1);
                java.util.concurrent.Callable<Result> task = () -> {
                    ready.countDown();
                    assertTrue(start.await(10, TimeUnit.SECONDS));
                    return call("POST", "/api/v1/cart/items", owner.token(), Map.of("variant_id", variant.variantId(), "quantity", 1));
                };
                var first = executor.submit(task);
                var second = executor.submit(task);
                assertTrue(ready.await(10, TimeUnit.SECONDS));
                start.countDown();
                for (var future : List.of(first, second)) {
                    var response = future.get(30, TimeUnit.SECONDS);
                    assertEquals(200, response.status(), response.body());
                }
            }
        } finally {
            executor.shutdownNow();
        }
        assertEquals(1, db.queryForObject("SELECT COUNT(*) FROM carts WHERE account_id=?", Integer.class, owner.accountId()));
        var result = call("GET", "/api/v1/cart", owner.token(), null).data().get("data").get("items");
        assertEquals(1, result.size());
        assertEquals(6, result.get(0).get("quantity").asInt());
        assertEquals(20, db.queryForObject("SELECT available_quantity FROM inventories WHERE variant_id=?", Integer.class, variant.variantId()));
        assertEquals(0, db.queryForObject("SELECT COUNT(*) FROM inventory_transactions WHERE variant_id=?", Integer.class, variant.variantId()));
    }

    @Test
    void quantityUpdateRejectsStoppedOrUnavailableVariantsWithoutChangingItem() throws Exception {
        User owner = user();
        var variant = createVariant("ON_SALE", "ON_SALE", 5, 100000, null);
        var added = call("POST", "/api/v1/cart/items", owner.token(), Map.of("variant_id", variant.variantId(), "quantity", 2));
        long itemId = added.data().get("data").get("items").get(0).get("cart_item_id").asLong();
        db.update("UPDATE product_variants SET sale_status='STOPPED' WHERE variant_id=?", variant.variantId());
        assertEquals(409, call("PATCH", "/api/v1/cart/items/" + itemId, owner.token(), Map.of("quantity", 3)).status());
        db.update("UPDATE product_variants SET sale_status='ON_SALE' WHERE variant_id=?", variant.variantId());
        db.update("UPDATE inventories SET available_quantity=0 WHERE variant_id=?", variant.variantId());
        assertEquals(409, call("PATCH", "/api/v1/cart/items/" + itemId, owner.token(), Map.of("quantity", 3)).status());
        assertEquals(2, db.queryForObject("SELECT quantity FROM cart_items WHERE cart_item_id=?", Integer.class, itemId));
        assertEquals(200, call("DELETE", "/api/v1/cart/items/" + itemId, owner.token(), null).status());
    }
}
