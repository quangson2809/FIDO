package com.fido.modules.inventory;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

class InventoryAdjustmentHttpTests extends InventoryHttpSupport {

    @Test
    void adjustmentsPreserveNonNegativeStockAndLedger() throws Exception {
        long readPermission = ensurePermission("INVENTORY_READ");
        long writePermission = ensurePermission("INVENTORY_WRITE");
        Employee reader = employee(capabilityRole(readPermission));
        Employee writer = employee(capabilityRole(writePermission));

        CatalogFixture fixture = createProduct();
        db.update("UPDATE inventories SET quantity_on_hand=5, version=0 WHERE warehouse_id=? AND product_id=?",
                fixture.warehouseId(), fixture.productId());

        var inventory = call("GET", "/api/v1/admin/inventory?product_id=" + fixture.productId()
                + "&sku=" + fixture.sku(), reader.token(), null);
        assertEquals(200, inventory.status(), inventory.body());
        assertEquals(1, inventory.data().get("meta").get("total").asInt());
        assertEquals(5, inventory.data().get("data").get(0).get("available_quantity").asInt());
        assertEquals(0, inventory.data().get("data").get(0).get("version").asInt());

        var increase = call("POST", "/api/v1/admin/inventory/adjustments", writer.token(),
                Map.of("product_id", fixture.productId(), "quantity_delta", 2, "reason_code", "COUNT_CORRECTION", "source_operation_id", "test-" + UUID.randomUUID()));
        assertEquals(201, increase.status(), increase.body());
        assertEquals("ADJUSTMENT", increase.data().get("data").get("transaction_type").asText());
        assertEquals(7, stock(fixture.productId()));
        assertEquals(1, version(fixture));

        var decrease = call("POST", "/api/v1/admin/inventory/adjustments", writer.token(),
                Map.of("product_id", fixture.productId(), "quantity_delta", -3, "reason_code", "DAMAGE", "source_operation_id", "test-" + UUID.randomUUID()));
        assertEquals(201, decrease.status(), decrease.body());
        assertEquals("ADJUSTMENT", decrease.data().get("data").get("transaction_type").asText());
        assertEquals(-3, decrease.data().get("data").get("quantity_delta").asInt());
        assertEquals("DAMAGE", decrease.data().get("data").get("reason_code").asText());
        assertEquals(4, stock(fixture.productId()));
        assertEquals(2, version(fixture));

        int movementCountBeforeFailure = movements(fixture.productId());
        assertEquals(409, call("POST", "/api/v1/admin/inventory/adjustments", writer.token(),
                Map.of("product_id", fixture.productId(), "quantity_delta", -5,
                        "reason_code", "COUNT_CORRECTION", "source_operation_id", "test-" + UUID.randomUUID())).status());
        assertEquals(4, stock(fixture.productId()));
        assertEquals(2, version(fixture));
        assertEquals(movementCountBeforeFailure, movements(fixture.productId()));

        assertEquals(400, call("POST", "/api/v1/admin/inventory/adjustments", writer.token(),
                Map.of("product_id", fixture.productId(), "quantity_delta", 0, "reason_code", "COUNT_CORRECTION", "source_operation_id", "test-" + UUID.randomUUID())).status());

        var movementPage = call("GET", "/api/v1/admin/inventory/transactions"
                + "?product_id=" + fixture.productId() + "&transaction_type=ADJUSTMENT", reader.token(), null);
        assertEquals(200, movementPage.status(), movementPage.body());
        assertEquals(2, movementPage.data().get("meta").get("total").asInt());
        assertEquals(fixture.productId(), movementPage.data().get("data").get(0).get("product_id").asLong());
        assertEquals(fixture.productId(), movementPage.data().get("data").get(1).get("product_id").asLong());
    }

    @Test
    void missingBalanceReadsZeroRejectsUnderflowAndCreatesOnPositiveMovement() throws Exception {
        long readPermission = ensurePermission("INVENTORY_READ");
        long writePermission = ensurePermission("INVENTORY_WRITE");
        long role = capabilityRole(writePermission);
        db.update("INSERT INTO role_permissions(role_id,permission_id) VALUES (?,?)", role, readPermission);
        Employee writer = employee(role);
        CatalogFixture fixture = createProduct();
        db.update("DELETE FROM inventories WHERE warehouse_id=? AND product_id=?",
                fixture.warehouseId(), fixture.productId());

        var before = call("GET", "/api/v1/admin/inventory?product_id=" + fixture.productId(),
                writer.token(), null);
        assertEquals(200, before.status(), before.body());
        assertEquals(1, before.data().get("meta").get("total").asInt());
        assertEquals(0, before.data().get("data").get(0).get("available_quantity").asInt());
        assertEquals(0, before.data().get("data").get(0).get("version").asInt());

        assertEquals(409, call("POST", "/api/v1/admin/inventory/adjustments", writer.token(),
                Map.of("product_id", fixture.productId(), "quantity_delta", -1,
                        "reason_code", "COUNT_CORRECTION", "source_operation_id", "test-" + UUID.randomUUID())).status());
        assertEquals(0, db.queryForObject(
                "SELECT COUNT(*) FROM inventories WHERE warehouse_id=? AND product_id=?",
                Integer.class, fixture.warehouseId(), fixture.productId()));
        assertEquals(0, movements(fixture.productId()));

        var increase = call("POST", "/api/v1/admin/inventory/adjustments", writer.token(),
                Map.of("product_id", fixture.productId(), "quantity_delta", 4,
                        "reason_code", "COUNT_CORRECTION", "source_operation_id", "test-" + UUID.randomUUID()));
        assertEquals(201, increase.status(), increase.body());
        assertEquals(fixture.warehouseId(), increase.data().get("data").get("warehouse_id").asLong());
        assertEquals(4, stock(fixture.productId()));
        assertEquals(1, version(fixture));
    }

    @Test
    void quantityAndVersionOverflowAreRejectedWithoutWritingMovements() throws Exception {
        Employee writer = employee(capabilityRole(ensurePermission("INVENTORY_WRITE")));
        CatalogFixture fixture = createProduct();

        db.update("UPDATE inventories SET quantity_on_hand=?, version=0 WHERE warehouse_id=? AND product_id=?",
                Integer.MAX_VALUE, fixture.warehouseId(), fixture.productId());
        assertEquals(409, call("POST", "/api/v1/admin/inventory/adjustments", writer.token(),
                Map.of("product_id", fixture.productId(), "quantity_delta", 1, "reason_code", "COUNT_CORRECTION", "source_operation_id", "test-" + UUID.randomUUID())).status());
        assertEquals(Integer.MAX_VALUE, stock(fixture.productId()));
        assertEquals(0, version(fixture));

        db.update("UPDATE inventories SET quantity_on_hand=0, version=? WHERE warehouse_id=? AND product_id=?",
                Integer.MAX_VALUE, fixture.warehouseId(), fixture.productId());
        assertEquals(409, call("POST", "/api/v1/admin/inventory/adjustments", writer.token(),
                Map.of("product_id", fixture.productId(), "quantity_delta", 1, "reason_code", "COUNT_CORRECTION", "source_operation_id", "test-" + UUID.randomUUID())).status());
        assertEquals(0, stock(fixture.productId()));
        assertEquals(Integer.MAX_VALUE, version(fixture));
        assertEquals(0, movements(fixture.productId()));
    }

    @Test
    void warehouseResolutionFailsClosedWhenZeroOrMultipleWarehousesAreActive() throws Exception {
        Employee writer = employee(capabilityRole(ensurePermission("INVENTORY_WRITE")));
        CatalogFixture fixture = createProduct();
        String suffix = UUID.randomUUID().toString().replace("-", "");
        db.update("INSERT INTO warehouses(code,name,status) VALUES (?,?,'ACTIVE')",
                "INV-AMB-" + suffix, "Ambiguous operational warehouse");
        long extraWarehouse = db.queryForObject(
                "SELECT id FROM warehouses WHERE code=?", Long.class, "INV-AMB-" + suffix);

        try {
            var ambiguous = call("POST", "/api/v1/admin/inventory/adjustments", writer.token(),
                    Map.of("product_id", fixture.productId(), "quantity_delta", 1,
                            "reason_code", "COUNT_CORRECTION", "source_operation_id", "test-" + UUID.randomUUID()));
            assertEquals(500, ambiguous.status(), ambiguous.body());

            db.update("UPDATE warehouses SET status='INACTIVE' WHERE id=?", extraWarehouse);
            db.update("UPDATE warehouses SET status='INACTIVE' WHERE id=?", fixture.warehouseId());
            var missing = call("POST", "/api/v1/admin/inventory/adjustments", writer.token(),
                    Map.of("product_id", fixture.productId(), "quantity_delta", 1,
                            "reason_code", "COUNT_CORRECTION", "source_operation_id", "test-" + UUID.randomUUID()));
            assertEquals(500, missing.status(), missing.body());
            assertEquals(0, movements(fixture.productId()));
        } finally {
            db.update("UPDATE warehouses SET status='ACTIVE' WHERE id=?", fixture.warehouseId());
            db.update("DELETE FROM warehouses WHERE id=?", extraWarehouse);
        }
    }

    private int version(CatalogFixture fixture) {
        return db.queryForObject(
                "SELECT version FROM inventories WHERE warehouse_id=? AND product_id=?",
                Integer.class, fixture.warehouseId(), fixture.productId());
    }

    private int movements(long productId) {
        return db.queryForObject(
                "SELECT COUNT(*) FROM inventory_transactions WHERE product_id=?",
                Integer.class, productId);
    }
}
