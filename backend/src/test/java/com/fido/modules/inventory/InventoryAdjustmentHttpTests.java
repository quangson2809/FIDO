package com.fido.modules.inventory;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Map;
import org.junit.jupiter.api.Test;

class InventoryAdjustmentHttpTests extends InventoryHttpSupport {

    @Test
    void adjustmentsPreserveNonNegativeStockAndLedger() throws Exception {
        long readPermission = ensurePermission("INVENTORY_READ");
        long writePermission = ensurePermission("INVENTORY_WRITE");

        Employee reader = employee(
                capabilityRole(readPermission)
        );

        Employee writer = employee(
                capabilityRole(writePermission)
        );

        CatalogFixture fixture = createVariant();
        db.update("UPDATE inventories SET available_quantity=5 WHERE variant_id=?", fixture.variantId());
        String inventoryPath =
                "/api/v1/admin/inventory"
                        + "?variant_id=" + fixture.variantId()
                        + "&sku=" + fixture.sku()
                        + "&product_id=" + fixture.productId()
                        + "&size_value_id=" + fixture.sizeValueId()
                        + "&color_id=" + fixture.colorId();

        var inventory = call(
                "GET",
                inventoryPath,
                reader.token(),
                null
        );

        assertEquals(
                200,
                inventory.status(),
                inventory.body()
        );

        assertEquals(
                1,
                inventory.data()
                        .get("meta")
                        .get("total")
                        .asInt()
        );

        assertEquals(
                5,
                inventory.data()
                        .get("data")
                        .get(0)
                        .get("available_quantity")
                        .asInt()
        );

        var increase = call(
                "POST",
                "/api/v1/admin/inventory/adjustments",
                writer.token(),
                Map.of(
                        "variant_id", fixture.variantId(),
                        "quantity_delta", 2,
                        "reason", "Cycle count correction"
                )
        );

        assertEquals(
                201,
                increase.status(),
                increase.body()
        );

        assertEquals(
                "ADJUSTMENT_IN",
                increase.data()
                        .get("data")
                        .get("transaction_type")
                        .asText()
        );

        assertEquals(
                7,
                stock(fixture.variantId())
        );

        var decrease = call(
                "POST",
                "/api/v1/admin/inventory/adjustments",
                writer.token(),
                Map.of(
                        "variant_id", fixture.variantId(),
                        "quantity_delta", -3,
                        "reason", "Damaged stock"
                )
        );

        assertEquals(
                201,
                decrease.status(),
                decrease.body()
        );

        assertEquals(
                "ADJUSTMENT_OUT",
                decrease.data()
                        .get("data")
                        .get("transaction_type")
                        .asText()
        );

        assertEquals(
                "Damaged stock",
                decrease.data()
                        .get("data")
                        .get("reason")
                        .asText()
        );

        assertEquals(
                4,
                stock(fixture.variantId())
        );

        int movementCountBeforeFailure = db.queryForObject(
                """
                SELECT COUNT(*)
                FROM inventory_transactions
                WHERE variant_id=?
                """,
                Integer.class,
                fixture.variantId()
        );

        assertEquals(
                409,
                call(
                        "POST",
                        "/api/v1/admin/inventory/adjustments",
                        writer.token(),
                        Map.of(
                                "variant_id", fixture.variantId(),
                                "quantity_delta", -5,
                                "reason", "Would become negative"
                        )
                ).status()
        );

        assertEquals(
                4,
                stock(fixture.variantId())
        );

        assertEquals(
                movementCountBeforeFailure,
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM inventory_transactions
                        WHERE variant_id=?
                        """,
                        Integer.class,
                        fixture.variantId()
                )
        );

        assertEquals(
                400,
                call(
                        "POST",
                        "/api/v1/admin/inventory/adjustments",
                        writer.token(),
                        Map.of(
                                "variant_id", fixture.variantId(),
                                "quantity_delta", 0,
                                "reason", "No movement"
                        )
                ).status()
        );

        var movementPage = call(
                "GET",
                "/api/v1/admin/inventory/transactions"
                        + "?variant_id=" + fixture.variantId()
                        + "&transaction_type=ADJUSTMENT_OUT",
                reader.token(),
                null
        );

        assertEquals(
                200,
                movementPage.status()
        );

        assertEquals(
                1,
                movementPage.data()
                        .get("meta")
                        .get("total")
                        .asInt()
        );

    }
}
