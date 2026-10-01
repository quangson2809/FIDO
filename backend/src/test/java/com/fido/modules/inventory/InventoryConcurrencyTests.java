package com.fido.modules.inventory;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class InventoryConcurrencyTests extends InventoryHttpSupport {

    @Test
    void competingAdjustmentsCannotOversell() throws Exception {
        long readPermission = ensurePermission("INVENTORY_READ");
        long writePermission = ensurePermission("INVENTORY_WRITE");

        Employee reader = employee(
                capabilityRole(readPermission)
        );

        Employee writer = employee(
                capabilityRole(writePermission)
        );

        CatalogFixture fixture = createVariant();
        db.update("UPDATE inventories SET available_quantity=4 WHERE variant_id=?", fixture.variantId());
        var executor = Executors.newFixedThreadPool(2);

        try {
            var gate = new CountDownLatch(1);

            Callable<Result> task = () -> {
                gate.await();

                return call(
                        "POST",
                        "/api/v1/admin/inventory/adjustments",
                        writer.token(),
                        Map.of(
                                "variant_id", fixture.variantId(),
                                "quantity_delta", -3,
                                "reason", "Concurrent adjustment"
                        )
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
                    List.of(201, 409),
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

    }
}
