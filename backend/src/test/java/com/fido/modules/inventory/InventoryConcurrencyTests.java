package com.fido.modules.inventory;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

class InventoryConcurrencyTests extends InventoryHttpSupport {

    @Test
    void competingAdjustmentsCannotOversell() throws Exception {
        Employee writer = employee(capabilityRole(ensurePermission("INVENTORY_WRITE")));
        CatalogFixture fixture = createProduct();
        db.update("UPDATE inventories SET quantity_on_hand=4, version=0 WHERE product_id=?", fixture.productId());
        var executor = Executors.newFixedThreadPool(2);

        try {
            var gate = new CountDownLatch(1);
            Callable<Result> task = () -> {
                gate.await();
                return call("POST", "/api/v1/admin/inventory/adjustments", writer.token(),
                        Map.of("product_id", fixture.productId(), "quantity_delta", -3,
                                "reason", "Concurrent adjustment"));
            };
            var first = executor.submit(task);
            var second = executor.submit(task);
            gate.countDown();
            var results = List.of(first.get(30, TimeUnit.SECONDS), second.get(30, TimeUnit.SECONDS));
            assertEquals(List.of(201, 409), results.stream().map(Result::status).sorted().toList());
        } finally {
            executor.shutdownNow();
        }
        assertEquals(1, stock(fixture.productId()));
        assertEquals(1, db.queryForObject("SELECT version FROM inventories WHERE warehouse_id=? AND product_id=?",
                Integer.class, fixture.warehouseId(), fixture.productId()));
        assertEquals(1, db.queryForObject("SELECT COUNT(*) FROM inventory_transactions WHERE product_id=?",
                Integer.class, fixture.productId()));
    }

    @Test
    void concurrentIncrementsBothApplyAndAdvanceVersionOnceEach() throws Exception {
        Employee writer = employee(capabilityRole(ensurePermission("INVENTORY_WRITE")));
        CatalogFixture fixture = createProduct();
        var executor = Executors.newFixedThreadPool(2);

        try {
            var gate = new CountDownLatch(1);
            Callable<Result> task = () -> {
                gate.await();
                return call("POST", "/api/v1/admin/inventory/adjustments", writer.token(),
                        Map.of("product_id", fixture.productId(), "quantity_delta", 3,
                                "reason", "Concurrent positive movement"));
            };
            var first = executor.submit(task);
            var second = executor.submit(task);
            gate.countDown();
            var results = List.of(first.get(30, TimeUnit.SECONDS), second.get(30, TimeUnit.SECONDS));
            assertEquals(List.of(201, 201), results.stream().map(Result::status).sorted().toList(),
                    () -> "Concurrent increment responses: "
                            + results.stream().map(result -> result.status() + " " + result.body()).toList());
        } finally {
            executor.shutdownNow();
        }

        assertEquals(6, stock(fixture.productId()));
        assertEquals(2, db.queryForObject("SELECT version FROM inventories WHERE warehouse_id=? AND product_id=?",
                Integer.class, fixture.warehouseId(), fixture.productId()));
        assertEquals(2, db.queryForObject("SELECT COUNT(*) FROM inventory_transactions WHERE product_id=?",
                Integer.class, fixture.productId()));
    }
}
