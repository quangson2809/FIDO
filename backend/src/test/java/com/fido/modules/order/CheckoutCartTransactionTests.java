package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.*;

import com.fido.modules.order.dto.request.CreateOrderRequest;
import com.fido.modules.order.service.OrderCreationService;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

class CheckoutCartTransactionTests extends OrderHttpSupport {
    private static final Map<String, Object> REQUEST = Map.of(
            "recipient_phone", "0900000000", "recipient_address", "Hanoi");

    @Autowired OrderCreationService creation;
    @Autowired PlatformTransactionManager transactions;

    @Test
    void successConsumesCartAndRepeatCannotPurchaseItAgainButNewPurchaseCan() throws Exception {
        User customer = user();
        var variant = createVariant(10, 100000, null);
        add(customer, variant, 2);
        var result = place(customer);
        assertEquals(201, result.status(), result.body());
        long firstId = remember(result);
        assertEquals("PENDING", result.data().get("data").get("order_status").asText());
        assertEquals(2, orderedQuantity(firstId));
        assertEquals(0, cartQuantity(customer));
        assertEquals(409, place(customer).status());
        assertEquals(10, stock(variant.variantId()));
        assertEquals(0, movementCount(firstId, "ORDER_CONFIRM_OUT"));
        assertEquals(1, count("payments", customer));

        add(customer, variant, 1);
        var second = place(customer);
        assertEquals(201, second.status(), second.body());
        long secondId = remember(second);
        assertNotEquals(firstId, secondId);
        assertEquals(1, orderedQuantity(secondId));
        assertEquals(0, cartQuantity(customer));
        assertEquals(2, count("orders", customer));
    }

    @Test
    void rejectedCreationPreservesCartAndDoesNotPersistOrder() throws Exception {
        User customer = user();
        var variant = createVariant(2, 100000, null);
        add(customer, variant, 2);
        db.update("UPDATE inventories SET available_quantity=1 WHERE variant_id=?", variant.variantId());
        assertEquals(409, place(customer).status());
        assertEquals(2, cartQuantity(customer));
        assertEquals(0, count("orders", customer));
        var voucher = call("POST", "/api/v1/orders", customer.token(), Map.of(
                "recipient_phone", "0900000000", "recipient_address", "Hanoi", "voucher_code", "UNAPPROVED"));
        assertEquals(501, voucher.status());
        assertEquals(2, cartQuantity(customer));
    }

    @Test
    void databaseFailureRollsBackOrderPaymentAuditAndCartConsumptionTogether() throws Exception {
        User customer = user();
        var variant = createVariant(10, 100000, null);
        add(customer, variant, 2);
        assertThrows(DataIntegrityViolationException.class, () ->
                new TransactionTemplate(transactions).executeWithoutResult(status -> {
                    creation.create(customer.accountId(), new CreateOrderRequest("0900000000", null, "Hanoi", null));
                    assertEquals(0, db.queryForObject("""
                            SELECT COUNT(*) FROM cart_items ci JOIN carts c ON c.cart_id=ci.cart_id
                            WHERE c.account_id=?
                            """, Integer.class, customer.accountId()));
                    // Force a real database constraint failure after all checkout writes.
                    db.update("""
                            INSERT INTO payments(order_id,payment_status,amount_due,amount_received,amount_refunded)
                            SELECT p.order_id,p.payment_status,p.amount_due,p.amount_received,p.amount_refunded
                            FROM payments p JOIN orders o ON o.order_id=p.order_id WHERE o.customer_account_id=?
                            """, customer.accountId());
                }));
        assertEquals(2, cartQuantity(customer));
        assertEquals(0, count("orders", customer));
        assertEquals(0, count("payments", customer));
        assertEquals(0, db.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE actor_account_id=? AND action='ORDER_CREATE'", Integer.class, customer.accountId()));
        assertEquals(10, stock(variant.variantId()));
    }

    @Test
    void concurrentSubmissionsConsumeTheSameCartOnlyOnce() throws Exception {
        User customer = user();
        var variant = createVariant(10, 100000, null);
        add(customer, variant, 2);
        var results = concurrently(() -> place(customer), () -> place(customer));
        for (var result : results) if (result.status() == 201) remember(result);
        assertEquals(List.of(201, 409), results.stream().map(Result::status).sorted().toList());
        assertEquals(1, count("orders", customer));
        assertEquals(0, cartQuantity(customer));
        assertEquals(10, stock(variant.variantId()));
    }

    @Test
    void concurrentAddIsEitherPurchasedOrRemainsInCartWithoutLoss() throws Exception {
        User customer = user();
        var variant = createVariant(10, 100000, null);
        add(customer, variant, 1);
        var results = concurrently(() -> place(customer), () -> call("POST", "/api/v1/cart/items", customer.token(),
                Map.of("variant_id", variant.variantId(), "quantity", 2)));
        assertEquals(201, results.get(0).status(), results.get(0).body());
        long orderId = remember(results.get(0));
        assertEquals(200, results.get(1).status(), results.get(1).body());
        int purchased = orderedQuantity(orderId);
        assertTrue(purchased == 1 || purchased == 3);
        assertEquals(3, purchased + cartQuantity(customer));
        assertEquals(10, stock(variant.variantId()));
    }

    @Test
    void concurrentQuantityReplacementCannotRevivePurchasedCartItem() throws Exception {
        User customer = user();
        var variant = createVariant(10, 100000, null);
        add(customer, variant, 1);
        var cart = call("GET", "/api/v1/cart", customer.token(), null);
        long itemId = cart.data().get("data").get("items").get(0).get("cart_item_id").asLong();
        var results = concurrently(() -> place(customer), () -> call("PATCH", "/api/v1/cart/items/" + itemId,
                customer.token(), Map.of("quantity", 3)));
        assertEquals(201, results.get(0).status(), results.get(0).body());
        long orderId = remember(results.get(0));
        int updatedStatus = results.get(1).status();
        assertTrue(updatedStatus == 200 || updatedStatus == 404, results.get(1).body());
        assertEquals(updatedStatus == 200 ? 3 : 1, orderedQuantity(orderId));
        assertEquals(0, cartQuantity(customer));
    }

    private void add(User customer, CatalogFixture variant, int quantity) throws Exception {
        var result = call("POST", "/api/v1/cart/items", customer.token(),
                Map.of("variant_id", variant.variantId(), "quantity", quantity));
        assertEquals(200, result.status(), result.body());
    }

    private Result place(User customer) throws Exception {
        return call("POST", "/api/v1/orders", customer.token(), REQUEST);
    }

    private long remember(Result result) {
        long id = result.data().get("data").get("order_id").asLong();
        orderIds.add(id);
        return id;
    }

    private int cartQuantity(User customer) throws Exception {
        var cart = call("GET", "/api/v1/cart", customer.token(), null);
        assertEquals(200, cart.status(), cart.body());
        int quantity = 0;
        for (var item : cart.data().get("data").get("items")) quantity += item.get("quantity").asInt();
        return quantity;
    }

    private int orderedQuantity(long orderId) {
        return db.queryForObject("SELECT SUM(quantity) FROM order_items WHERE order_id=?", Integer.class, orderId);
    }

    private int count(String table, User customer) {
        String sql = switch (table) {
            case "orders" -> "SELECT COUNT(*) FROM orders WHERE customer_account_id=?";
            case "payments" -> "SELECT COUNT(*) FROM payments p JOIN orders o ON o.order_id=p.order_id WHERE o.customer_account_id=?";
            default -> throw new IllegalArgumentException(table);
        };
        return db.queryForObject(sql, Integer.class, customer.accountId());
    }

    private List<Result> concurrently(Callable<Result> first, Callable<Result> second) throws Exception {
        var executor = Executors.newFixedThreadPool(2);
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        try {
            var futures = List.of(first, second).stream().map(operation -> executor.submit(() -> {
                ready.countDown();
                if (!start.await(10, TimeUnit.SECONDS)) throw new AssertionError("Start timed out");
                return operation.call();
            })).toList();
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            return List.of(futures.get(0).get(30, TimeUnit.SECONDS), futures.get(1).get(30, TimeUnit.SECONDS));
        } finally {
            executor.shutdownNow();
        }
    }
}
