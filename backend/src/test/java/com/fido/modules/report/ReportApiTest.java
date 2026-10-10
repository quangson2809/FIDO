package com.fido.modules.report;

import com.fido.support.OperationsHttpSupport;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import static org.junit.jupiter.api.Assertions.*;

class ReportApiTest extends OperationsHttpSupport {

    private static final String PATH = "/api/v1/admin/reports/overview";
    private final List<Long> orders = new ArrayList<>();

    @AfterEach
    void cleanupOrders() {
        for (long id : orders) {
            db.update("DELETE FROM payments WHERE order_id=?", id);
            db.update("DELETE FROM orders WHERE order_id=?", id);
        }
    }

    private long order(String status, String created, String completed,
            String subtotal, String discount, String shipping, boolean paid) {
        BigDecimal total = new BigDecimal(subtotal).subtract(new BigDecimal(discount))
                .add(new BigDecimal(shipping));
        String code = "ORD-" + UUID.randomUUID();
        db.update("""
                INSERT INTO orders(order_code,order_status,recipient_phone,recipient_address,
                    subtotal_snapshot,discount_snapshot,shipping_fee_snapshot,total_snapshot,
                    created_at,updated_at,completed_at)
                VALUES (?,?,'0900000000','Report fixture',?,?,?,?,?,?,?)
                """, code, status, new BigDecimal(subtotal), new BigDecimal(discount),
                new BigDecimal(shipping), total, created, created, completed);
        long id = db.queryForObject("SELECT order_id FROM orders WHERE order_code=?", Long.class, code);
        orders.add(id);
        db.update("""
                INSERT INTO payments(order_id,payment_status,amount_due,amount_received,amount_refunded)
                VALUES (?,?,?,?,0)
                """, id, paid ? "PAID" : "UNPAID", total, paid ? total : BigDecimal.ZERO);
        return id;
    }

    private JsonNode report(String token, String from, String to) throws Exception {
        var result = call("GET", PATH + "?from=" + from + "&to=" + to, token, null);
        assertEquals(200, result.status(), String.valueOf(result.body()));
        return result.body().get("data");
    }

    private void money(JsonNode result, String field, String expected) {
        assertEquals(0, new BigDecimal(expected).compareTo(result.get(field).decimalValue()), field);
    }

    @Test
    void returnsRestateCompletionPeriodIncludingShippingRegardlessOfRefundTiming() throws Exception {
        var root = user("SUPERADMIN");
        order("COMPLETED", "2025-09-01 02:00:00", "2025-09-10 02:00:00", "100", "0", "20", true);
        long returned = order("COMPLETED", "2025-08-20 02:00:00", "2025-09-20 02:00:00", "250", "30", "15.50", true);
        order("SHIPPING", "2025-09-22 02:00:00", null, "999", "0", "0", true);
        order("PENDING", "2025-09-23 02:00:00", null, "888", "0", "0", false);
        order("CANCELLED", "2025-09-24 02:00:00", null, "777", "0", "0", false);
        order("COMPLETED", "2025-10-01 02:00:00", "2025-10-02 02:00:00", "50", "0", "10", true);

        var beforeReturn = report(root.token(), "2025-09-01", "2025-09-30");
        money(beforeReturn, "completed_sales", "355.50");
        money(beforeReturn, "returned_adjustment", "0");
        money(beforeReturn, "net_sales", "355.50");

        db.update("UPDATE orders SET order_status='RETURNED',returned_at='2025-10-01 02:00:00' WHERE order_id=?", returned);
        var september = report(root.token(), "2025-09-01", "2025-09-30");
        assertEquals(6, september.size());
        assertEquals("2025-09-01", september.get("from").asText());
        assertEquals("2025-09-30", september.get("to").asText());
        money(september, "completed_sales", "355.50");
        money(september, "returned_adjustment", "235.50");
        money(september, "net_sales", "120");
        var counts = september.get("orders_by_status");
        assertEquals(8, counts.size());
        for (String state : List.of("COMPLETED", "PENDING", "CANCELLED", "SHIPPING")) {
            assertEquals(1, counts.get(state).asInt(), state);
        }
        assertEquals(0, counts.get("RETURNED").asInt());
        var august = report(root.token(), "2025-08-01", "2025-08-31");
        assertEquals(1, august.get("orders_by_status").get("RETURNED").asInt());
        money(august, "completed_sales", "0");

        var october = report(root.token(), "2025-10-01", "2025-10-31");
        money(october, "completed_sales", "60");
        money(october, "returned_adjustment", "0");
        money(october, "net_sales", "60");
        db.update("UPDATE payments SET payment_status='REFUNDED',amount_refunded=amount_received WHERE order_id=?", returned);
        assertEquals(september, report(root.token(), "2025-09-01", "2025-09-30"));
        assertEquals(september, report(root.token(), "2025-09-01", "2025-09-30"));
    }

    @Test
    void vietnamDatesIncludeStartAndLastMicrosecondButExcludeNextMidnight() throws Exception {
        var root = user("SUPERADMIN");
        order("COMPLETED", "2025-03-09 16:59:59.999999", "2025-03-09 16:59:59.999999", "100", "0", "0", true);
        order("COMPLETED", "2025-03-09 17:00:00", "2025-03-09 17:00:00", "10.10", "0", "0", true);
        order("COMPLETED", "2025-03-10 16:59:59.999999", "2025-03-10 16:59:59.999999", "20.20", "0", "0", true);
        order("COMPLETED", "2025-03-10 17:00:00", "2025-03-10 17:00:00", "40.40", "0", "0", true);
        var result = report(root.token(), "2025-03-10", "2025-03-10");
        money(result, "completed_sales", "30.30");
        money(result, "net_sales", "30.30");
        assertEquals(2, result.get("orders_by_status").get("COMPLETED").asInt());
    }

    @Test
    void onlySuperadminCanReadAndDatesAreRequiredAndValidated() throws Exception {
        var customer = user(null);
        var employee = user("ADMIN");
        var root = user("SUPERADMIN");
        String valid = PATH + "?from=2024-01-01&to=2024-01-31";
        assertEquals(401, call("GET", valid, null, null).status());
        assertEquals(403, call("GET", valid, customer.token(), null).status());
        capability(employee, "ORDER_READ");
        assertEquals(403, call("GET", valid, employee.token(), null).status());
        for (String query : List.of("", "?from=2025-01-01", "?to=2025-01-01",
                "?from=bad&to=2025-01-01", "?from=2025-02-30&to=2025-03-01",
                "?from=2025-02-01&to=2025-01-31")) {
            assertEquals(400, call("GET", PATH + query, root.token(), null).status(), query);
        }
        var empty = report(root.token(), "2024-01-01", "2024-01-31");
        money(empty, "completed_sales", "0");
        money(empty, "returned_adjustment", "0");
        money(empty, "net_sales", "0");
        empty.get("orders_by_status").forEach(count -> assertEquals(0, count.asLong()));
    }

    private JsonNode analytics(String token, String endpoint, String query) throws Exception {
        var result = call("GET", "/api/v1/admin/reports/" + endpoint + query, token, null);
        assertEquals(200, result.status(), String.valueOf(result.body()));
        assertEquals(1, result.body().size());
        return result.body().get("data");
    }

    @Test
    void allEndpointsRequireAdminAndCapabilityAndObserveRevocationOnSameToken() throws Exception {
        var root = user("SUPERADMIN");
        var staff = user("ADMIN");
        var customer = user("CUSTOMER");
        capability(customer, "REPORT_READ");
        String dates = "?from=2024-01-01&to=2024-01-02";
        for (String endpoint : List.of("overview", "sales-trend", "orders-trend", "product-performance")) {
            String path = "/api/v1/admin/reports/" + endpoint + dates;
            assertEquals(401, call("GET", path, null, null).status());
            assertEquals(403, call("GET", path, staff.token(), null).status());
            assertEquals(403, call("GET", path, customer.token(), null).status());
            assertEquals(200, call("GET", path, root.token(), null).status());
        }
        capability(staff, "REPORT_READ");
        for (String endpoint : List.of("overview", "sales-trend", "orders-trend", "product-performance")) {
            assertEquals(200, call("GET", "/api/v1/admin/reports/" + endpoint + dates, staff.token(), null).status());
        }
        db.update("""
                DELETE FROM role_permissions WHERE permission_id=(SELECT permission_id FROM permissions WHERE code='REPORT_READ')
                AND role_id IN (SELECT role_id FROM account_roles WHERE account_id=?)
                """, staff.id());
        for (String endpoint : List.of("overview", "sales-trend", "orders-trend", "product-performance")) {
            assertEquals(403, call("GET", "/api/v1/admin/reports/" + endpoint + dates, staff.token(), null).status());
        }
    }

    @Test
    void dailyWeeklyMonthlySalesReconcileWithOverviewAndClampPartialBuckets() throws Exception {
        var root = user("SUPERADMIN");
        order("COMPLETED", "2023-01-31 17:00:00", "2023-01-31 17:00:00", "100", "10", "20", true);
        long returned = order("RETURNED", "2023-02-05 00:00:00", "2023-02-05 17:00:00", "200", "20", "15.50", true);
        db.update("UPDATE orders SET returned_at='2023-03-01 00:00:00' WHERE order_id=?", returned);
        order("SHIPPING", "2023-02-06 00:00:00", null, "999", "0", "0", true);
        order("COMPLETED", "2023-02-10 17:00:00", "2023-02-10 17:00:00", "900", "0", "0", true);
        var overview = report(root.token(), "2023-02-01", "2023-02-10");
        for (String granularity : List.of("DAY", "WEEK", "MONTH")) {
            var result = analytics(root.token(), "sales-trend", "?from=2023-02-01&to=2023-02-10&granularity=" + granularity);
            assertEquals("Asia/Ho_Chi_Minh", result.get("timezone").asText());
            assertEquals(granularity, result.get("granularity").asText());
            for (String field : List.of("completed_sales", "returned_adjustment", "net_sales")) {
                BigDecimal sum = BigDecimal.ZERO;
                for (var point : result.get("points")) sum = sum.add(point.get(field).decimalValue());
                assertEquals(0, sum.compareTo(overview.get(field).decimalValue()), field);
            }
            assertEquals(granularity.equals("DAY") ? 10 : granularity.equals("WEEK") ? 2 : 1, result.get("points").size());
            if (granularity.equals("WEEK")) assertEquals("2023-01-30", result.get("points").get(0).get("period_start").asText());
            if (granularity.equals("DAY")) money(result.get("points").get(1), "net_sales", "0");
        }
        var defaultDay = analytics(root.token(), "sales-trend", "?from=2023-02-01&to=2023-02-01");
        assertEquals("DAY", defaultDay.get("granularity").asText());
        money(defaultDay.get("points").get(0), "net_sales", "110");
    }

    @Test
    void orderTrendsUseCreationDateCurrentStateAndAllEightZeroFilledCounts() throws Exception {
        var root = user("SUPERADMIN");
        for (String status : List.of("PENDING", "CONFIRMED", "PREPARING", "SHIPPING", "COMPLETED", "DELIVERY_FAILED", "CANCELLED", "RETURNED")) {
            order(status, "2022-12-31 17:00:00", "2023-04-01 00:00:00", "10", "0", "0", true);
        }
        order("PENDING", "2023-01-01 17:00:00", null, "10", "0", "0", false);
        order("PENDING", "2022-12-31 16:59:59.999999", null, "10", "0", "0", false);
        var overview = report(root.token(), "2023-01-01", "2023-01-02");
        for (String granularity : List.of("DAY", "WEEK", "MONTH")) {
            var points = analytics(root.token(), "orders-trend", "?from=2023-01-01&to=2023-01-02&granularity=" + granularity).get("points");
            long total = 0;
            var counts = new java.util.HashMap<String, Long>();
            for (var point : points) {
                assertEquals(8, point.get("orders_by_status").size());
                long bucketTotal = 0;
                var fields = point.get("orders_by_status").properties();
                for (var entry : fields) {
                    bucketTotal += entry.getValue().asLong();
                    counts.merge(entry.getKey(), entry.getValue().asLong(), Long::sum);
                }
                assertEquals(bucketTotal, point.get("total_orders").asLong());
                total += bucketTotal;
            }
            assertEquals(9, total);
            for (var entry : counts.entrySet()) assertEquals(overview.get("orders_by_status").get(entry.getKey()).asLong(), entry.getValue());
        }
        var empty = analytics(root.token(), "orders-trend", "?from=2021-02-01&to=2021-02-03");
        assertEquals(3, empty.get("points").size());
        empty.get("points").forEach(point -> assertEquals(0, point.get("total_orders").asLong()));
    }

    @Test
    void analyticsRejectInvalidDatesGranularityAndLimit() throws Exception {
        var root = user("SUPERADMIN");
        for (String endpoint : List.of("sales-trend", "orders-trend", "product-performance")) {
            for (String dates : List.of("", "?from=2024-01-01", "?from=bad&to=2024-01-02", "?from=2024-02-30&to=2024-03-01", "?from=2024-02-01&to=2024-01-01")) {
                assertEquals(400, call("GET", "/api/v1/admin/reports/" + endpoint + dates, root.token(), null).status());
            }
        }
        for (String endpoint : List.of("sales-trend", "orders-trend")) {
            assertEquals(400, call("GET", "/api/v1/admin/reports/" + endpoint + "?from=2024-01-01&to=2024-01-02&granularity=YEAR", root.token(), null).status());
        }
        for (String limit : List.of("0", "101", "bad")) {
            assertEquals(400, call("GET", "/api/v1/admin/reports/product-performance?from=2024-01-01&to=2024-01-02&limit=" + limit, root.token(), null).status());
        }
    }
}
