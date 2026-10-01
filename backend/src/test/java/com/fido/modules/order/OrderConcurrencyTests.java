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
