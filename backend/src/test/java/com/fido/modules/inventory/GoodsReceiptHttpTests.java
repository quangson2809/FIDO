package com.fido.modules.inventory;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class GoodsReceiptHttpTests extends InventoryHttpSupport {

    @Test
    void receiptLifecyclePreservesStockAndHistoricalSupplier() throws Exception {
        long readPermission = ensurePermission("INVENTORY_READ");
        long writePermission = ensurePermission("INVENTORY_WRITE");

        Employee reader = employee(
                capabilityRole(readPermission)
        );

        Employee writer = employee(
                capabilityRole(writePermission)
        );

        CatalogFixture fixture = createVariant();
        long supplierId = createSupplier(
                writer.token(),
                "ACTIVE"
        );

        assertEquals(
                200,
                call(
                        "GET",
                        "/api/v1/admin/suppliers/" + supplierId,
                        reader.token(),
                        null
                ).status()
        );

        var supplierPage = call(
                "GET",
                "/api/v1/admin/suppliers?q=Supplier&usage_status=ACTIVE",
                reader.token(),
                null
        );

        assertEquals(
                200,
                supplierPage.status(),
                supplierPage.body()
        );

        assertTrue(
                supplierPage.data()
                        .get("meta")
                        .get("total")
                        .asInt() >= 1
        );

        long receiptId = createReceipt(
                writer.token(),
                supplierId,
                fixture.variantId(),
                3
        );

        assertEquals(
                0,
                stock(fixture.variantId())
        );

        var receiptDetail = call(
                "GET",
                "/api/v1/admin/goods-receipts/" + receiptId,
                reader.token(),
                null
        );

        assertEquals(
                200,
                receiptDetail.status()
        );

        assertEquals(
                "DRAFT",
                receiptDetail.data()
                        .get("data")
                        .get("receipt_status")
                        .asText()
        );

        assertTrue(
                receiptDetail.data()
                        .get("data")
                        .get("receipt_code")
                        .asText()
                        .startsWith("GR-")
        );

        assertEquals(
                200,
                call(
                        "PATCH",
                        "/api/v1/admin/goods-receipts/" + receiptId,
                        writer.token(),
                        Map.of(
                                "note", "quantity updated",
                                "items", List.of(
                                        Map.of(
                                                "variant_id",
                                                fixture.variantId(),
                                                "quantity",
                                                5
                                        )
                                )
                        )
                ).status()
        );

        assertEquals(
                0,
                stock(fixture.variantId())
        );

        var confirmed = call(
                "POST",
                "/api/v1/admin/goods-receipts/"
                        + receiptId
                        + "/actions",
                writer.token(),
                Map.of("action", "CONFIRM")
        );

        assertEquals(
                200,
                confirmed.status(),
                confirmed.body()
        );

        assertEquals(
                "CONFIRMED",
                confirmed.data()
                        .get("data")
                        .get("receipt_status")
                        .asText()
        );

        assertEquals(
                writer.id(),
                confirmed.data()
                        .get("data")
                        .get("confirmed_by_account_id")
                        .asLong()
        );

        assertEquals(
                5,
                stock(fixture.variantId())
        );

        assertEquals(
                200,
                call(
                        "POST",
                        "/api/v1/admin/goods-receipts/"
                                + receiptId
                                + "/actions",
                        writer.token(),
                        Map.of("action", "CONFIRM")
                ).status()
        );

        assertEquals(
                5,
                stock(fixture.variantId())
        );

        assertEquals(
                1,
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM inventory_transactions
                        WHERE goods_receipt_id=?
                          AND transaction_type='RECEIPT_IN'
                        """,
                        Integer.class,
                        receiptId
                )
        );

        assertEquals(
                409,
                call(
                        "PATCH",
                        "/api/v1/admin/goods-receipts/" + receiptId,
                        writer.token(),
                        Map.of("note", "must not mutate")
                ).status()
        );

        var receiptPage = call(
                "GET",
                "/api/v1/admin/goods-receipts?receipt_status=CONFIRMED",
                reader.token(),
                null
        );

        assertEquals(
                200,
                receiptPage.status()
        );

        assertTrue(
                receiptPage.data()
                        .get("meta")
                        .get("total")
                        .asInt() >= 1
        );

        var inactivePatch = new HashMap<String, Object>();
        inactivePatch.put("usage_status", "INACTIVE");
        inactivePatch.put("phone", null);
        inactivePatch.put("note", "Historical supplier only");

        assertEquals(
                200,
                call(
                        "PATCH",
                        "/api/v1/admin/suppliers/" + supplierId,
                        writer.token(),
                        inactivePatch
                ).status()
        );

        assertEquals(
                409,
                call(
                        "POST",
                        "/api/v1/admin/goods-receipts",
                        writer.token(),
                        Map.of(
                                "supplier_id", supplierId,
                                "receipt_date", LocalDate.now().toString(),
                                "items", List.of(
                                        Map.of(
                                                "variant_id",
                                                fixture.variantId(),
                                                "quantity",
                                                1
                                        )
                                )
                        )
                ).status()
        );

        assertEquals(
                200,
                call(
                        "GET",
                        "/api/v1/admin/goods-receipts/" + receiptId,
                        reader.token(),
                        null
                ).status()
        );

        assertEquals(
                200,
                call(
                        "PATCH",
                        "/api/v1/admin/suppliers/" + supplierId,
                        writer.token(),
                        Map.of("usage_status", "ACTIVE")
                ).status()
        );

        // Match the original cancellation precondition independently of adjustment tests.
        call("POST", "/api/v1/admin/inventory/adjustments", writer.token(),
                Map.of("variant_id", fixture.variantId(), "quantity_delta", -1,
                        "reason", "Cancellation test precondition"));
        long cancelledReceiptId = createReceipt(
                writer.token(),
                supplierId,
                fixture.variantId(),
                2
        );

        assertEquals(
                200,
                call(
                        "POST",
                        "/api/v1/admin/goods-receipts/"
                                + cancelledReceiptId
                                + "/actions",
                        writer.token(),
                        Map.of("action", "CANCEL")
                ).status()
        );

        assertEquals(
                4,
                stock(fixture.variantId())
        );

        assertEquals(
                200,
                call(
                        "POST",
                        "/api/v1/admin/goods-receipts/"
                                + cancelledReceiptId
                                + "/actions",
                        writer.token(),
                        Map.of("action", "CANCEL")
                ).status()
        );

        assertEquals(
                409,
                call(
                        "PATCH",
                        "/api/v1/admin/goods-receipts/" + cancelledReceiptId,
                        writer.token(),
                        Map.of("note", "cannot edit cancelled")
                ).status()
        );

        assertTrue(
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM audit_logs
                        WHERE actor_account_id=?
                          AND (
                              action LIKE 'GOODS_RECEIPT_%'
                              OR action='INVENTORY_ADJUST'
                          )
                        """,
                        Integer.class,
                        writer.id()
                ) >= 5
        );
    }
}
