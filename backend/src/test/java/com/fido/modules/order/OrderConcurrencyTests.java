package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class OrderConcurrencyTests extends OrderHttpSupport {

    @Test
    void reversedItemOrderConfirmsBothOrdersWithoutDeadlockOrLostStock() throws Exception {
        User root = superadmin();
        User firstCustomer = user();
        User secondCustomer = user();
        var firstVariant = createVariant(10, 100000, null);
        var secondVariant = createVariant(10, 100000, null);
        assertEquals(200, call("POST", "/api/v1/cart/items", firstCustomer.token(),
                java.util.Map.of("variant_id", secondVariant.variantId(), "quantity", 1)).status());
        long firstOrder = createOrder(firstCustomer, firstVariant, 1);
        assertEquals(200, call("POST", "/api/v1/cart/items", secondCustomer.token(),
                java.util.Map.of("variant_id", firstVariant.variantId(), "quantity", 1)).status());
        long secondOrder = createOrder(secondCustomer, secondVariant, 1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var ready = new CountDownLatch(2);
            var start = new CountDownLatch(1);
            var tasks = new java.util.ArrayList<java.util.concurrent.Future<Result>>();
            for (long orderId : List.of(firstOrder, secondOrder)) {
                tasks.add(executor.submit(() -> {
                    ready.countDown();
                    if (!start.await(10, TimeUnit.SECONDS)) throw new AssertionError("Start timed out");
                    return action(root, orderId, "CONFIRM");
                }));
            }
            org.junit.jupiter.api.Assertions.assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            for (var task : tasks) {
                var result = task.get(30, TimeUnit.SECONDS);
                assertEquals(200, result.status(), result.body());
            }
        } finally {
            executor.shutdownNow();
        }
        assertEquals(8, stock(firstVariant.variantId()));
        assertEquals(8, stock(secondVariant.variantId()));
        for (long orderId : List.of(firstOrder, secondOrder)) {
            assertEquals(2, movementCount(orderId, "ORDER_CONFIRM_OUT"));
            var appliedOrder = db.queryForList("SELECT variant_id FROM inventory_transactions WHERE order_id=? AND transaction_type='ORDER_CONFIRM_OUT' ORDER BY txn_id", Long.class, orderId);
            assertEquals(List.of(firstVariant.variantId(), secondVariant.variantId()), appliedOrder);
        }
    }

    @Test
    void concurrentConfirmDeductsStockExactlyOnce()
            throws Exception {
        User customer = user();
        User root = superadmin();

        CatalogFixture fixture = createVariant(
                2,
                100000,
                null
        );

        long orderId = createOrder(
                customer,
                fixture,
                1
        );

        var executor = Executors.newFixedThreadPool(2);

        try {
            var gate = new CountDownLatch(1);

            Callable<Result> task = () -> {
                gate.await();

                return action(
                        root,
                        orderId,
                        "CONFIRM"
                );
            };

            var first = executor.submit(task);
            var second = executor.submit(task);

            gate.countDown();

            var results = List.of(
                    first.get(30, TimeUnit.SECONDS),
                    second.get(30, TimeUnit.SECONDS)
            );

            assertEquals(
                    List.of(200, 200),
                    results.stream()
                            .map(Result::status)
                            .sorted()
                            .toList()
            );
        } finally {
            executor.shutdownNow();
        }

        assertEquals(
                1,
                stock(fixture.variantId())
        );

        assertEquals(
                1,
                movementCount(
                        orderId,
                        "ORDER_CONFIRM_OUT"
                )
        );

        assertEquals(
                "CONFIRMED",
                db.queryForObject(
                        """
                        SELECT order_status
                        FROM orders
                        WHERE order_id=?
                        """,
                        String.class,
                        orderId
                )
        );
    }

}
