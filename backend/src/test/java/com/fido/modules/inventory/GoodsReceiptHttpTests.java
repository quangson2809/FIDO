package com.fido.modules.inventory;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.argThat;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditWriteService;
import org.mockito.Mockito;
import org.springframework.test.util.AopTestUtils;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

class GoodsReceiptHttpTests extends InventoryHttpSupport {
    @MockitoSpyBean
    private AuditWriteService auditWriter;

    @Test
    void receiptLifecyclePreservesStockAndHistoricalSupplier() throws Exception {
        long readPermission = ensurePermission("INVENTORY_READ");
        long writePermission = ensurePermission("INVENTORY_WRITE");
        Employee reader = employee(capabilityRole(readPermission));
        Employee writer = employee(capabilityRole(writePermission));

        CatalogFixture fixture = createProduct();
        long supplierId = createSupplier(writer.token(), "ACTIVE");

        assertEquals(200,
                call("GET", "/api/v1/admin/suppliers/" + supplierId, reader.token(), null).status());
        var supplierPage = call("GET", "/api/v1/admin/suppliers?q=Supplier&usage_status=ACTIVE",
                reader.token(), null);
        assertEquals(200, supplierPage.status(), supplierPage.body());
        assertTrue(supplierPage.data().get("meta").get("total").asInt() >= 1);

        long receiptId = createReceipt(writer.token(), supplierId, fixture, 3);
        assertEquals(0, stock(fixture.productId()));

        var receiptDetail = call("GET", "/api/v1/admin/goods-receipts/" + receiptId,
                reader.token(), null);
        assertEquals(200, receiptDetail.status(), receiptDetail.body());
        assertEquals("DRAFT", receiptDetail.data().get("data").get("receipt_status").asText());
        assertTrue(receiptDetail.data().get("data").get("receipt_code").asText().startsWith("GR-"));

        assertEquals(200, call("PATCH", "/api/v1/admin/goods-receipts/" + receiptId, writer.token(),
                Map.of("items", List.of(Map.of("product_id", fixture.productId(),
                        "quantity_received", 5, "unit_cost", 0)))).status());
        assertEquals(0, stock(fixture.productId()));

        var confirmed = call("POST", "/api/v1/admin/goods-receipts/" + receiptId + "/actions",
                writer.token(), Map.of("action", "CONFIRM"));
        assertEquals(200, confirmed.status(), confirmed.body());
        assertEquals("CONFIRMED", confirmed.data().get("data").get("receipt_status").asText());
        assertEquals(writer.id(), confirmed.data().get("data").get("confirmed_by_account_id").asLong());
        assertEquals(5, stock(fixture.productId()));

        assertEquals(200, call("POST", "/api/v1/admin/goods-receipts/" + receiptId + "/actions",
                writer.token(), Map.of("action", "CONFIRM")).status());
        assertEquals(5, stock(fixture.productId()));
        assertEquals(1, db.queryForObject(
                "SELECT COUNT(*) FROM inventory_transactions WHERE goods_receipt_item_id IN "
                        + "(SELECT id FROM goods_receipt_items WHERE goods_receipt_id=?) "
                        + "AND transaction_type='GOODS_RECEIPT'",
                Integer.class, receiptId));
        long postedItemId = db.queryForObject(
                "SELECT id FROM goods_receipt_items WHERE goods_receipt_id=?",
                Long.class, receiptId);
        assertEquals("goods-receipt-item:" + postedItemId + ":GOODS_RECEIPT",
                db.queryForObject(
                        "SELECT idempotency_key FROM inventory_transactions WHERE goods_receipt_item_id=?",
                        String.class, postedItemId));
        assertEquals(1, db.queryForObject(
                "SELECT version FROM inventories WHERE warehouse_id=? AND product_id=?",
                Integer.class, fixture.warehouseId(), fixture.productId()));
        assertEquals(stock(fixture.productId()), db.queryForObject(
                "SELECT COALESCE(SUM(quantity_delta),0) FROM inventory_transactions WHERE warehouse_id=? AND product_id=?",
                Integer.class, fixture.warehouseId(), fixture.productId()));

        assertEquals(409, call("PATCH", "/api/v1/admin/goods-receipts/" + receiptId, writer.token(),
                Map.of("items", List.of(Map.of("product_id", fixture.productId(),
                        "quantity_received", 1, "unit_cost", 0)))).status());
        var receiptPage = call("GET", "/api/v1/admin/goods-receipts?receipt_status=CONFIRMED",
                reader.token(), null);
        assertEquals(200, receiptPage.status());
        assertTrue(receiptPage.data().get("meta").get("total").asInt() >= 1);

        db.update("UPDATE suppliers SET status='INACTIVE' WHERE id=?", supplierId);

        assertEquals(409, call("POST", "/api/v1/admin/goods-receipts", writer.token(),
                Map.of("supplier_id", supplierId,
                        "items", List.of(Map.of("product_id", fixture.productId(),
                                "quantity_received", 1, "unit_cost", 0)))).status());

        assertEquals(200, call("GET", "/api/v1/admin/goods-receipts/" + receiptId,
                reader.token(), null).status());
        db.update("UPDATE suppliers SET status='ACTIVE' WHERE id=?", supplierId);

        call("POST", "/api/v1/admin/inventory/adjustments", writer.token(),
                Map.of("product_id", fixture.productId(),
                        "quantity_delta", -1, "reason", "Cancellation test precondition"));
        long cancelledReceiptId = createReceipt(writer.token(), supplierId, fixture, 2);

        assertEquals(200, call("POST", "/api/v1/admin/goods-receipts/" + cancelledReceiptId + "/actions",
                writer.token(), Map.of("action", "CANCEL")).status());
        assertEquals(4, stock(fixture.productId()));
        assertEquals(200, call("POST", "/api/v1/admin/goods-receipts/" + cancelledReceiptId + "/actions",
                writer.token(), Map.of("action", "CANCEL")).status());
        assertEquals(4, stock(fixture.productId()));
        assertEquals(409, call("PATCH", "/api/v1/admin/goods-receipts/" + cancelledReceiptId, writer.token(),
                Map.of("items", List.of(Map.of("product_id", fixture.productId(),
                        "quantity_received", 1, "unit_cost", 0)))).status());

        assertTrue(db.queryForObject(
                "SELECT COUNT(*) FROM audit_logs WHERE actor_account_id=? "
                        + "AND (action LIKE 'GOODS_RECEIPT_%' OR action='INVENTORY_ADJUST')",
                Integer.class, writer.id()) >= 5);
    }
 
    @Test
    void concurrentConfirmationsPostEachReceiptItemOnlyOnce() throws Exception {
        Employee writer = employee(capabilityRole(ensurePermission("INVENTORY_WRITE")));
        CatalogFixture fixture = createProduct();
        long supplierId = createSupplier(writer.token(), "ACTIVE");
        long receiptId = createReceipt(writer.token(), supplierId, fixture, 4);
        String actionPath = "/api/v1/admin/goods-receipts/" + receiptId + "/actions";

        var executor = Executors.newFixedThreadPool(2);
        try {
            CountDownLatch start = new CountDownLatch(1);
            Callable<Result> confirm = () -> {
                start.await();
                return call("POST", actionPath, writer.token(), Map.of("action", "CONFIRM"));
            };
            var first = executor.submit(confirm);
            var second = executor.submit(confirm);
            start.countDown();
            var results = List.of(first.get(30, TimeUnit.SECONDS), second.get(30, TimeUnit.SECONDS));
            assertEquals(List.of(200, 200),
                    results.stream().map(Result::status).sorted().toList(),
                    () -> results.stream().map(result -> result.status() + " " + result.body()).toList().toString());
        } finally {
            executor.shutdownNow();
        }

        assertEquals(4, stock(fixture.productId()));
        assertEquals(1, db.queryForObject(
                "SELECT version FROM inventories WHERE warehouse_id=? AND product_id=?",
                Integer.class, fixture.warehouseId(), fixture.productId()));
        assertEquals(1, db.queryForObject(
                "SELECT COUNT(*) FROM inventory_transactions WHERE goods_receipt_item_id IN "
                        + "(SELECT id FROM goods_receipt_items WHERE goods_receipt_id=?) "
                        + "AND transaction_type='GOODS_RECEIPT'",
                Integer.class, receiptId));
        assertEquals(1, db.queryForObject(
                "SELECT COUNT(*) FROM audit_logs WHERE actor_account_id=? "
                        + "AND action='GOODS_RECEIPT_CONFIRM' AND entity_id=?",
                Integer.class, writer.id(), Long.toString(receiptId)));
        assertEquals(stock(fixture.productId()), db.queryForObject(
                "SELECT COALESCE(SUM(quantity_delta),0) FROM inventory_transactions WHERE warehouse_id=? AND product_id=?",
                Integer.class, fixture.warehouseId(), fixture.productId()));
    }

    @Test
    void failureOnLaterReceiptLineRollsBackEarlierBalanceLedgerAndAudit() throws Exception {
        Employee writer = employee(capabilityRole(ensurePermission("INVENTORY_WRITE")));
        CatalogFixture fixture = createProduct();
        long secondProductId = createSiblingProduct(fixture);
        db.update("UPDATE inventories SET quantity_on_hand=?, version=0 WHERE warehouse_id=? AND product_id=?",
                Integer.MAX_VALUE, fixture.warehouseId(), secondProductId);
        long supplierId = createSupplier(writer.token(), "ACTIVE");

        var draft = call("POST", "/api/v1/admin/goods-receipts", writer.token(),
                Map.of("supplier_id", supplierId, 
                        "items", List.of(
                                Map.of("product_id", fixture.productId(), "quantity_received", 2, "unit_cost", 0),
                                Map.of("product_id", secondProductId, "quantity_received", 1, "unit_cost", 0))));
        assertEquals(201, draft.status(), draft.body());
        long receiptId = draft.data().get("data").get("receipt_id").asLong();
        receipts.add(receiptId);

        var confirm = call("POST", "/api/v1/admin/goods-receipts/" + receiptId + "/actions",
                writer.token(), Map.of("action", "CONFIRM"));
        assertEquals(409, confirm.status(), confirm.body());
        assertEquals("DRAFT", db.queryForObject(
                "SELECT status FROM goods_receipts WHERE id=?", String.class, receiptId));
        assertEquals(0, stock(fixture.productId()));
        assertEquals(0, db.queryForObject(
                "SELECT version FROM inventories WHERE warehouse_id=? AND product_id=?",
                Integer.class, fixture.warehouseId(), fixture.productId()));
        assertEquals(Integer.MAX_VALUE, db.queryForObject(
                "SELECT quantity_on_hand FROM inventories WHERE warehouse_id=? AND product_id=?",
                Integer.class, fixture.warehouseId(), secondProductId));
        assertEquals(0, db.queryForObject(
                "SELECT COUNT(*) FROM inventory_transactions WHERE goods_receipt_item_id IN "
                        + "(SELECT id FROM goods_receipt_items WHERE goods_receipt_id=?)",
                Integer.class, receiptId));
        assertEquals(0, db.queryForObject(
                "SELECT COUNT(*) FROM audit_logs WHERE actor_account_id=? "
                        + "AND action='GOODS_RECEIPT_CONFIRM' AND entity_id=?",
                Integer.class, writer.id(), Long.toString(receiptId)));
    }

    @Test
    void auditFailureRollsBackReceiptConfirmationAndStockPosting() throws Exception {
        Employee writer = employee(capabilityRole(ensurePermission("INVENTORY_WRITE")));
        CatalogFixture fixture = createProduct();
        long supplierId = createSupplier(writer.token(), "ACTIVE");
        long receiptId = createReceipt(writer.token(), supplierId, fixture, 3);

        AuditWriteService auditTarget = AopTestUtils.getUltimateTargetObject(auditWriter);
        try {
            Mockito.doThrow(new IllegalStateException("Simulated audit write failure"))
                    .when(auditTarget)
                    .record(argThat(event -> event.action() == AuditAction.GOODS_RECEIPT_CONFIRM));

            var failed = call("POST", "/api/v1/admin/goods-receipts/" + receiptId + "/actions",
                    writer.token(), Map.of("action", "CONFIRM"));
            assertEquals(500, failed.status(), failed.body());
            assertEquals("DRAFT", db.queryForObject(
                    "SELECT status FROM goods_receipts WHERE id=?", String.class, receiptId));
            assertEquals(0, stock(fixture.productId()));
            assertEquals(0, db.queryForObject(
                    "SELECT COUNT(*) FROM inventory_transactions WHERE goods_receipt_item_id IN "
                            + "(SELECT id FROM goods_receipt_items WHERE goods_receipt_id=?)",
                    Integer.class, receiptId));
            assertEquals(0, db.queryForObject(
                    "SELECT COUNT(*) FROM audit_logs WHERE actor_account_id=? "
                            + "AND action='GOODS_RECEIPT_CONFIRM' AND entity_id=?",
                    Integer.class, writer.id(), Long.toString(receiptId)));
        } finally {
            Mockito.reset(auditTarget);
        }
    }

}
