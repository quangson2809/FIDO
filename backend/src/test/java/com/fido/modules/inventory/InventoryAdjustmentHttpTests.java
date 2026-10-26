package com.fido.modules.inventory;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import java.util.Map;

class InventoryAdjustmentHttpTests extends InventoryHttpSupport {

    @Test
    void adjustmentsPreserveNonNegativeStockAndLedger() throws Exception {
        long readPermission = ensurePermission("INVENTORY_READ");
        long writePermission = ensurePermission("INVENTORY_WRITE");
        Employee reader = employee(capabilityRole(readPermission));
        Employee writer = employee(capabilityRole(writePermission));

        CatalogFixture fixture = createProduct();
        db.update("UPDATE inventories SET quantity_on_hand=5 WHERE product_id=?", fixture.productId());

        String inventoryPath = "/api/v1/admin/inventory?product_id=" + fixture.productId()
                + "&warehouse_id=" + fixture.warehouseId() + "&sku=" + fixture.sku();
        var inventory = call("GET", inventoryPath, reader.token(), null);
        assertEquals(200, inventory.status(), inventory.body());
        assertEquals(1, inventory.data().get("meta").get("total").asInt());
        assertEquals(5, inventory.data().get("data").get(0).get("available_quantity").asInt());

        var increase = call("POST", "/api/v1/admin/inventory/adjustments", writer.token(),
                Map.of("warehouse_id", fixture.warehouseId(), "product_id", fixture.productId(),
                        "quantity_delta", 2, "reason", "Cycle count correction"));
        assertEquals(201, increase.status(), increase.body());
        assertEquals("ADJUSTMENT", increase.data().get("data").get("transaction_type").asText());
        assertEquals(7, stock(fixture.productId()));

        var decrease = call("POST", "/api/v1/admin/inventory/adjustments", writer.token(),
                Map.of("warehouse_id", fixture.warehouseId(), "product_id", fixture.productId(),
                        "quantity_delta", -3, "reason", "Damaged stock"));
        assertEquals(201, decrease.status(), decrease.body());
        assertEquals("ADJUSTMENT", decrease.data().get("data").get("transaction_type").asText());
        assertEquals(-3, decrease.data().get("data").get("quantity_delta").asInt());
        assertEquals("Damaged stock", decrease.data().get("data").get("reason").asText());
        assertEquals(4, stock(fixture.productId()));

        int movementCountBeforeFailure = db.queryForObject(
                "SELECT COUNT(*) FROM inventory_transactions WHERE product_id=?",
                Integer.class, fixture.productId());

        assertEquals(409, call("POST", "/api/v1/admin/inventory/adjustments", writer.token(),
                Map.of("warehouse_id", fixture.warehouseId(), "product_id", fixture.productId(),
                        "quantity_delta", -5, "reason", "Would become negative")).status());
        assertEquals(4, stock(fixture.productId()));
        assertEquals(movementCountBeforeFailure, db.queryForObject(
                "SELECT COUNT(*) FROM inventory_transactions WHERE product_id=?",
                Integer.class, fixture.productId()));

        assertEquals(400, call("POST", "/api/v1/admin/inventory/adjustments", writer.token(),
                Map.of("warehouse_id", fixture.warehouseId(), "product_id", fixture.productId(),
                        "quantity_delta", 0, "reason", "No movement")).status());

        var movementPage = call("GET", "/api/v1/admin/inventory/transactions"
                + "?product_id=" + fixture.productId() + "&transaction_type=ADJUSTMENT",
                reader.token(), null);
        assertEquals(200, movementPage.status(), movementPage.body());
        assertEquals(2, movementPage.data().get("meta").get("total").asInt());
        assertEquals(fixture.productId(),
                movementPage.data().get("data").get(0).get("product_id").asLong());
        assertEquals(fixture.productId(),
                movementPage.data().get("data").get(1).get("product_id").asLong());
    }
}
