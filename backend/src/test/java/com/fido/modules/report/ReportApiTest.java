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
}
