package com.fido.modules.inventory;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

import tools.jackson.databind.JsonNode;

class InventoryReconciliationHttpTests extends InventoryHttpSupport {
    @Test
    void nativeMysqlFlagsSerializeAsBooleansAndReportMismatchesWithoutRepair() throws Exception {
        Employee reader = employee(capabilityRole(ensurePermission("INVENTORY_READ")));
        CatalogFixture fixture = createProduct();
        long sibling = createSiblingProduct(fixture);
        db.update("INSERT INTO inventory_transactions(warehouse_id,product_id,transaction_type,quantity_delta,idempotency_key) "
                        + "VALUES (?,?,'OPENING',5,?)",
                fixture.warehouseId(), fixture.productId(), "reconcile-" + fixture.sku());
        db.update("UPDATE inventories SET quantity_on_hand=5,version=1 WHERE warehouse_id=? AND product_id=?",
                fixture.warehouseId(), fixture.productId());
        db.update("UPDATE inventories SET quantity_on_hand=7,version=2 WHERE warehouse_id=? AND product_id=?",
                fixture.warehouseId(), sibling);
        var response = call("GET", "/api/v1/admin/inventory/reconciliation?page_size=100", reader.token(), null);
        assertEquals(200, response.status(), response.body());
        JsonNode matched = null;
        JsonNode mismatched = null;
        for (JsonNode row : response.data().get("data")) {
            if (row.get("product_id").asLong() == fixture.productId()) matched = row;
            if (row.get("product_id").asLong() == sibling) mismatched = row;
        }
        assertNotNull(matched);
        assertNotNull(mismatched);
        for (String flag : new String[]{"quantity_matches", "version_matches", "consistent"}) {
            assertTrue(matched.get(flag).isBoolean());
            assertTrue(matched.get(flag).asBoolean());
            assertTrue(mismatched.get(flag).isBoolean());
            assertFalse(mismatched.get(flag).asBoolean());
        }
        assertEquals(5, matched.get("ledger_quantity").asLong());
        assertEquals(1, matched.get("movement_count").asLong());
        assertEquals(7, stock(sibling), "Reconciliation must not repair data");
    }
}
