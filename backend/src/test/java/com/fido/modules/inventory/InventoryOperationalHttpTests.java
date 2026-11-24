package com.fido.modules.inventory;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fido.modules.audit.service.*;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.util.*;
import java.util.concurrent.*;

class InventoryOperationalHttpTests extends InventoryHttpSupport {
    @MockitoSpyBean AuditWriteService audit;

    Employee writer() throws Exception {
        long role = capabilityRole(ensurePermission("INVENTORY_WRITE"));
        db.update(
                "INSERT INTO role_permissions(role_id,permission_id) VALUES (?,?)",
                role,
                ensurePermission("INVENTORY_READ"));
        return employee(role);
    }

    @AfterEach
    void cleanupOperations() {
        for (long actor : accounts) {
            db.update(
                    "DELETE FROM stocktake_items WHERE stocktake_id IN(SELECT id FROM stocktakes WHERE created_by=?)",
                    actor);
            db.update("DELETE FROM stocktakes WHERE created_by=?", actor);
            db.update(
                    "DELETE FROM goods_receipt_correction_items WHERE correction_id IN(SELECT id FROM goods_receipt_corrections WHERE created_by=?)",
                    actor);
            db.update("DELETE FROM goods_receipt_corrections WHERE created_by=?", actor);
        }
    }

    Map<String, Object> count(CatalogFixture product, int quantity, int version) {
        return Map.of(
                "source_operation_id",
                UUID.randomUUID().toString(),
                "reason",
                "Đã đếm thực tế và đối chiếu",
                "items",
                List.of(
                        Map.of(
                                "product_id",
                                product.productId(),
                                "counted_quantity",
                                quantity,
                                "expected_version",
                                version)));
    }

    @Test
    void stocktakeSavesCountBeforePostingAndConfirmsOnlyOnceUnderRace() throws Exception {
        var writer = writer();
        var product = createProduct();
        var request = count(product, 3, 0);
        var created = call("POST", "/api/v1/admin/stocktakes", writer.token(), request);
        assertEquals(200, created.status(), created.body());
        long id = created.data().get("data").get("id").asLong();
        assertEquals(0, stock(product.productId()));
        var replay = call("POST", "/api/v1/admin/stocktakes", writer.token(), request);
        assertEquals(200, replay.status());
        assertEquals(id, replay.data().get("data").get("id").asLong());
        String path = "/api/v1/admin/stocktakes/" + id + "/actions";
        var executor = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);
        try {
            var a =
                    executor.submit(
                            () -> {
                                start.await();
                                return call(
                                                "POST",
                                                path,
                                                writer.token(),
                                                Map.of("action", "CONFIRM"))
                                        .status();
                            });
            var c =
                    executor.submit(
                            () -> {
                                start.await();
                                return call(
                                                "POST",
                                                path,
                                                writer.token(),
                                                Map.of("action", "CONFIRM"))
                                        .status();
                            });
            start.countDown();
            assertEquals(
                    List.of(200, 409),
                    java.util.stream.Stream.of(
                                    a.get(30, TimeUnit.SECONDS), c.get(30, TimeUnit.SECONDS))
                            .sorted()
                            .toList());
        } finally {
            executor.shutdownNow();
        }
        assertEquals(3, stock(product.productId()));
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT COUNT(*) FROM inventory_transactions WHERE product_id=?",
                        Integer.class,
                        product.productId()));
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT version FROM inventories WHERE product_id=?",
                        Integer.class,
                        product.productId()));
    }

    @Test
    void interveningMovementMakesCountStaleAndFailedAuditRollsBackEverything() throws Exception {
        var writer = writer();
        var product = createProduct();
        var created =
                call("POST", "/api/v1/admin/stocktakes", writer.token(), count(product, 3, 0));
        long id = created.data().get("data").get("id").asLong();
        assertEquals(
                201,
                call(
                                "POST",
                                "/api/v1/admin/inventory/adjustments",
                                writer.token(),
                                Map.of(
                                        "product_id",
                                        product.productId(),
                                        "quantity_delta",
                                        1,
                                        "reason_code",
                                        "FOUND",
                                        "source_operation_id",
                                        UUID.randomUUID().toString()))
                        .status());
        assertEquals(
                409,
                call(
                                "POST",
                                "/api/v1/admin/stocktakes/" + id + "/actions",
                                writer.token(),
                                Map.of("action", "CONFIRM"))
                        .status());
        assertEquals(1, stock(product.productId()));
        var fresh = call("POST", "/api/v1/admin/stocktakes", writer.token(), count(product, 4, 1));
        long freshId = fresh.data().get("data").get("id").asLong();
        doThrow(new IllegalStateException("injected audit failure"))
                .when(
                        (AuditWriteService)
                                org.springframework.test.util.AopTestUtils.getUltimateTargetObject(
                                        audit))
                .record(argThat(e -> e != null && e.action() == AuditAction.STOCKTAKE_CONFIRM));
        assertEquals(
                500,
                call(
                                "POST",
                                "/api/v1/admin/stocktakes/" + freshId + "/actions",
                                writer.token(),
                                Map.of("action", "CONFIRM"))
                        .status());
        assertEquals(1, stock(product.productId()));
        assertEquals(
                "DRAFT",
                db.queryForObject(
                        "SELECT status FROM stocktakes WHERE id=?", String.class, freshId));
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT COUNT(*) FROM inventory_transactions WHERE product_id=?",
                        Integer.class,
                        product.productId()));
    }

    @Test
    void receiptCorrectionPreservesOriginalAndUsesEffectivePriorFactsAndValue() throws Exception {
        var writer = writer();
        var product = createProduct();
        long supplier = createSupplier(writer.token(), "ACTIVE");
        long receipt = createReceipt(writer.token(), supplier, product, 5);
        assertEquals(
                200,
                call(
                                "POST",
                                "/api/v1/admin/goods-receipts/" + receipt + "/actions",
                                writer.token(),
                                Map.of("action", "CONFIRM"))
                        .status());
        long item =
                db.queryForObject(
                        "SELECT id FROM goods_receipt_items WHERE goods_receipt_id=?",
                        Long.class,
                        receipt);
        String path = "/api/v1/admin/goods-receipts/" + receipt + "/corrections";
        var input = new HashMap<String, Object>();
        input.put("source_operation_id", UUID.randomUUID().toString());
        input.put("reason", "Sửa số lượng và giá vốn ghi sai");
        input.put(
                "items",
                List.of(
                        Map.of(
                                "receipt_item_id",
                                item,
                                "corrected_quantity",
                                3,
                                "corrected_unit_cost",
                                1000)));
        var corrected = call("POST", path, writer.token(), input);
        assertEquals(200, corrected.status(), corrected.body());
        long id = corrected.data().get("data").get("id").asLong();
        assertEquals(3, stock(product.productId()));
        assertEquals(
                3000, corrected.data().get("data").get("items").get(0).get("value_delta").asInt());
        assertEquals(200, call("POST", path, writer.token(), input).status());
        assertEquals(3, stock(product.productId()));
        input.put("source_operation_id", UUID.randomUUID().toString());
        input.put(
                "items",
                List.of(
                        Map.of(
                                "receipt_item_id",
                                item,
                                "corrected_quantity",
                                4,
                                "corrected_unit_cost",
                                900)));
        assertEquals(409, call("POST", path, writer.token(), input).status());
        input.put("expected_correction_id", id);
        var next = call("POST", path, writer.token(), input);
        assertEquals(200, next.status(), next.body());
        assertEquals(4, stock(product.productId()));
        assertEquals(600, next.data().get("data").get("items").get(0).get("value_delta").asInt());
        assertEquals(
                5,
                db.queryForObject(
                        "SELECT quantity_received FROM goods_receipt_items WHERE id=?",
                        Integer.class,
                        item));
        assertEquals(
                0,
                db.queryForObject(
                        "SELECT unit_cost FROM goods_receipt_items WHERE id=?",
                        Integer.class,
                        item));
        assertEquals(
                3,
                db.queryForObject(
                        "SELECT COUNT(*) FROM inventory_transactions WHERE product_id=?",
                        Integer.class,
                        product.productId()));
    }

    @Test
    void correctionFailureCannotLeaveFactsStockOrLedgerPartiallyCommitted() throws Exception {
        var writer = writer();
        var product = createProduct();
        long receipt =
                createReceipt(writer.token(), createSupplier(writer.token(), "ACTIVE"), product, 5);
        assertEquals(
                200,
                call(
                                "POST",
                                "/api/v1/admin/goods-receipts/" + receipt + "/actions",
                                writer.token(),
                                Map.of("action", "CONFIRM"))
                        .status());
        long item =
                db.queryForObject(
                        "SELECT id FROM goods_receipt_items WHERE goods_receipt_id=?",
                        Long.class,
                        receipt);
        assertEquals(
                201,
                call(
                                "POST",
                                "/api/v1/admin/inventory/adjustments",
                                writer.token(),
                                Map.of(
                                        "product_id",
                                        product.productId(),
                                        "quantity_delta",
                                        -4,
                                        "reason_code",
                                        "LOSS",
                                        "source_operation_id",
                                        UUID.randomUUID().toString()))
                        .status());
        String path = "/api/v1/admin/goods-receipts/" + receipt + "/corrections";
        var input = new HashMap<String, Object>();
        input.put("source_operation_id", UUID.randomUUID().toString());
        input.put("reason", "Sửa chứng từ sau khi đã xuất kho");
        input.put(
                "items",
                List.of(
                        Map.of(
                                "receipt_item_id",
                                item,
                                "corrected_quantity",
                                0,
                                "corrected_unit_cost",
                                1000)));
        var insufficient = call("POST", path, writer.token(), input);
        assertEquals(409, insufficient.status(), insufficient.body());
        assertEquals(1, stock(product.productId()));
        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM goods_receipt_corrections WHERE goods_receipt_id=?",
                        Integer.class,
                        receipt));
        doThrow(new IllegalStateException("injected audit failure"))
                .when(
                        (AuditWriteService)
                                org.springframework.test.util.AopTestUtils.getUltimateTargetObject(
                                        audit))
                .record(argThat(e -> e != null && e.action() == AuditAction.GOODS_RECEIPT_CORRECT));
        input.put("source_operation_id", UUID.randomUUID().toString());
        input.put(
                "items",
                List.of(
                        Map.of(
                                "receipt_item_id",
                                item,
                                "corrected_quantity",
                                6,
                                "corrected_unit_cost",
                                1000)));
        assertEquals(500, call("POST", path, writer.token(), input).status());
        assertEquals(1, stock(product.productId()));
        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM goods_receipt_corrections WHERE goods_receipt_id=?",
                        Integer.class,
                        receipt));
        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM goods_receipt_correction_items WHERE goods_receipt_item_id=?",
                        Integer.class,
                        item));
        assertEquals(
                2,
                db.queryForObject(
                        "SELECT COUNT(*) FROM inventory_transactions WHERE product_id=?",
                        Integer.class,
                        product.productId()));
        assertEquals(
                2,
                db.queryForObject(
                        "SELECT version FROM inventories WHERE product_id=?",
                        Integer.class,
                        product.productId()));
        assertEquals(
                5,
                db.queryForObject(
                        "SELECT quantity_received FROM goods_receipt_items WHERE id=?",
                        Integer.class,
                        item));
    }

    @Test
    void competingReceiptCorrectionsCannotBothConsumeTheSamePriorVersion() throws Exception {
        var writer = writer();
        var product = createProduct();
        long receipt =
                createReceipt(writer.token(), createSupplier(writer.token(), "ACTIVE"), product, 5);
        assertEquals(
                200,
                call(
                                "POST",
                                "/api/v1/admin/goods-receipts/" + receipt + "/actions",
                                writer.token(),
                                Map.of("action", "CONFIRM"))
                        .status());
        long item =
                db.queryForObject(
                        "SELECT id FROM goods_receipt_items WHERE goods_receipt_id=?",
                        Long.class,
                        receipt);
        String path = "/api/v1/admin/goods-receipts/" + receipt + "/corrections";
        var executor = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);
        try {
            var futures = new ArrayList<Future<Integer>>();
            for (int quantity : List.of(6, 7)) {
                var request =
                        Map.of(
                                "source_operation_id",
                                UUID.randomUUID().toString(),
                                "reason",
                                "Đối chiếu lại chứng từ",
                                "items",
                                List.of(
                                        Map.of(
                                                "receipt_item_id",
                                                item,
                                                "corrected_quantity",
                                                quantity,
                                                "corrected_unit_cost",
                                                1000)));
                futures.add(
                        executor.submit(
                                () -> {
                                    start.await();
                                    return call("POST", path, writer.token(), request).status();
                                }));
            }
            start.countDown();
            var statuses = new ArrayList<Integer>();
            for (var future : futures) statuses.add(future.get(30, TimeUnit.SECONDS));
            assertEquals(List.of(200, 409), statuses.stream().sorted().toList());
        } finally {
            executor.shutdownNow();
        }
        assertTrue(Set.of(6, 7).contains(stock(product.productId())));
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT COUNT(*) FROM goods_receipt_corrections WHERE goods_receipt_id=?",
                        Integer.class,
                        receipt));
        assertEquals(
                2,
                db.queryForObject(
                        "SELECT COUNT(*) FROM inventory_transactions WHERE product_id=?",
                        Integer.class,
                        product.productId()));
    }

    @Test
    void wrongAdjustmentSignsCannotCommit() throws Exception {
        var writer = writer();
        var product = createProduct();
        for (String reason : List.of("DAMAGE", "LOSS"))
            assertEquals(
                    400,
                    call(
                                    "POST",
                                    "/api/v1/admin/inventory/adjustments",
                                    writer.token(),
                                    Map.of(
                                            "product_id",
                                            product.productId(),
                                            "quantity_delta",
                                            1,
                                            "reason_code",
                                            reason,
                                            "source_operation_id",
                                            UUID.randomUUID().toString()))
                            .status());
        assertEquals(
                400,
                call(
                                "POST",
                                "/api/v1/admin/inventory/adjustments",
                                writer.token(),
                                Map.of(
                                        "product_id",
                                        product.productId(),
                                        "quantity_delta",
                                        -1,
                                        "reason_code",
                                        "FOUND",
                                        "source_operation_id",
                                        UUID.randomUUID().toString()))
                        .status());
        assertEquals(0, stock(product.productId()));
        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM inventory_transactions WHERE product_id=?",
                        Integer.class,
                        product.productId()));
    }
}
