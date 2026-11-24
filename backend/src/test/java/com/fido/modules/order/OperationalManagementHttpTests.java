package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.*;

class OperationalManagementHttpTests extends OrderHttpSupport {
    private final List<Long> pages = new ArrayList<>();

    @AfterEach
    void cleanupPages() {
        for (long id : pages) db.update("DELETE FROM content_pages WHERE id=?", id);
    }

    @Test
    void issuedVoucherTermsAreImmutableAndUsabilityReflectsTimeAndQuota() throws Exception {
        var root = superadmin();
        String code = "OPS-" + UUID.randomUUID();
        var created =
                call(
                        "POST",
                        "/api/v1/admin/vouchers",
                        root.token(),
                        Map.of(
                                "code",
                                code,
                                "discount_type",
                                "FIXED",
                                "discount_value",
                                1000,
                                "minimum_order_value",
                                0,
                                "usage_limit",
                                3));
        assertEquals(201, created.status(), created.body());
        long id = created.data().get("data").get("id").asLong();
        voucherIds.add(id);
        String path = "/api/v1/admin/vouchers/" + id;
        assertEquals(200, call("PATCH", path, root.token(), Map.of("status", "ACTIVE")).status());
        var customer = user();
        var product = createVariant(4, 100000, null);
        long order = createOrder(customer, product, 1, code);
        var rejected = call("PATCH", path, root.token(), Map.of("discount_value", 2000));
        assertEquals(409, rejected.status(), rejected.body());
        assertEquals("VOUCHER_ISSUED_TERMS_IMMUTABLE", rejected.data().get("code").asText());
        assertEquals(
                1000,
                db.queryForObject(
                        "SELECT discount_amount FROM orders WHERE id=?", Integer.class, order));
        assertEquals(
                1000,
                db.queryForObject(
                        "SELECT discount_value FROM vouchers WHERE id=?", Integer.class, id));
        assertEquals(200, call("PATCH", path, root.token(), Map.of("status", "INACTIVE")).status());
        assertEquals(
                1000,
                db.queryForObject(
                        "SELECT discount_amount FROM orders WHERE id=?", Integer.class, order));
        assertEquals(200, call("PATCH", path, root.token(), Map.of("status", "ACTIVE")).status());
        db.update("UPDATE vouchers SET usage_count=3 WHERE id=?", id);
        assertEquals(
                "EXHAUSTED",
                call("GET", path, root.token(), null)
                        .data()
                        .get("data")
                        .get("effective_status")
                        .asText());
        db.update("UPDATE vouchers SET ends_at='2001-01-01 00:00:00' WHERE id=?", id);
        assertEquals(
                "EXPIRED",
                call("GET", path, root.token(), null)
                        .data()
                        .get("data")
                        .get("effective_status")
                        .asText());
    }

    @Test
    void contentDraftPreviewPublishUnpublishAndArchivePreserveAuthorization() throws Exception {
        var root = superadmin();
        var customer = user();
        String slug = "operational-" + UUID.randomUUID();
        var input =
                Map.of(
                        "slug",
                        slug,
                        "title",
                        "Chính sách vận hành",
                        "content",
                        "Nội dung bản nháp");
        assertEquals(
                403, call("POST", "/api/v1/admin/content-pages", customer.token(), input).status());
        var created = call("POST", "/api/v1/admin/content-pages", root.token(), input);
        assertEquals(201, created.status(), created.body());
        long id = created.data().get("data").get("id").asLong();
        pages.add(id);
        String path = "/api/v1/admin/content-pages/" + id;
        String publicPath = "/api/v1/content-pages/" + slug;
        assertEquals(404, call("GET", publicPath, null, null).status());
        assertEquals(200, call("GET", path, root.token(), null).status());
        assertEquals(
                200, call("PATCH", path, root.token(), Map.of("status", "PUBLISHED")).status());
        assertEquals(200, call("GET", publicPath, null, null).status());
        assertEquals(200, call("PATCH", path, root.token(), Map.of("status", "DRAFT")).status());
        assertEquals(404, call("GET", publicPath, null, null).status());
        assertEquals(200, call("PATCH", path, root.token(), Map.of("status", "ARCHIVED")).status());
        assertEquals(
                409, call("PATCH", path, root.token(), Map.of("status", "PUBLISHED")).status());
        assertEquals(
                3,
                db.queryForObject(
                        "SELECT COUNT(*) FROM audit_logs WHERE entity_id=? AND entity_type='CONTENT_PAGE' AND action='CONTENT_UPDATE'",
                        Integer.class,
                        Long.toString(id)));
    }

    @Test
    void operationalMetricsDeclareBasisAndDrillDownToContributingOrders() throws Exception {
        var root = superadmin();
        var customer = user();
        var first = createVariant(5, 100000, null);
        var second = createVariant(5, 200000, null);
        var third = createVariant(5, 300000, null);
        long a = createOrder(customer, first, 1),
                c = createOrder(customer, second, 1),
                d = createOrder(customer, third, 1);
        db.update(
                "UPDATE orders SET created_at='2030-03-02 10:00:00',status='CANCELLED' WHERE id=?",
                a);
        db.update(
                "UPDATE orders SET created_at='2030-03-02 11:00:00',status='DELIVERY_FAILED' WHERE id=?",
                c);
        db.update(
                "UPDATE orders SET created_at='2030-03-02 12:00:00',status='RETURNED' WHERE id=?",
                d);
        String path = "/api/v1/admin/reports/operations?from=2030-03-02&to=2030-03-02";
        assertEquals(403, call("GET", path, customer.token(), null).status());
        var report = call("GET", path, root.token(), null);
        assertEquals(200, report.status(), report.body());
        var metrics = report.data().get("data");
        assertEquals(3, metrics.get("placed_orders").asInt());
        assertEquals(230000, metrics.get("average_order_value").asInt());
        assertEquals("Asia/Ho_Chi_Minh", metrics.get("timezone").asText());
        for (String status : List.of("CANCELLED", "DELIVERY_FAILED", "RETURNED"))
            assertEquals(3333, metrics.get("status_rates_bps").get(status).asInt());
        var rows =
                call(
                        "GET",
                        "/api/v1/admin/reports/operations/orders?from=2030-03-02&to=2030-03-02&status=CANCELLED",
                        root.token(),
                        null);
        assertEquals(200, rows.status(), rows.body());
        assertEquals(1, rows.data().get("meta").get("total").asInt());
        assertEquals(a, rows.data().get("data").get(0).get("order_id").asLong());
    }

    @Test
    void tenDaySlowMovingIncludesUnsoldStockAndExcludesRecentSuccessfulSales() throws Exception {
        var root = superadmin();
        var customer = user();
        var old = createVariant(5, 100000, null);
        var recent = createVariant(5, 100000, null);
        for (var product : List.of(old, recent)) {
            long id = createOrder(customer, product, 1);
            for (String action : List.of("CONFIRM", "START_PREPARING", "DISPATCH"))
                assertEquals(200, action(root, id, action).status());
            assertEquals(
                    200,
                    call(
                                    "POST",
                                    "/api/v1/admin/orders/" + id + "/payment-actions",
                                    root.token(),
                                    Map.of("action", "COMPLETE_DELIVERY_AND_COLLECT_COD"))
                            .status());
            if (product.productId() == old.productId())
                db.update(
                        "UPDATE payments SET collected_at=DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 11 DAY) WHERE order_id=?",
                        id);
        }
        var report =
                call(
                        "GET",
                        "/api/v1/admin/reports/operations/slow-moving?page_size=100",
                        root.token(),
                        null);
        assertEquals(200, report.status(), report.body());
        var ids = new HashSet<Long>();
        for (var row : report.data().get("data")) ids.add(row.get("product_id").asLong());
        assertTrue(ids.contains(old.productId()));
        assertFalse(ids.contains(recent.productId()));
    }
}
