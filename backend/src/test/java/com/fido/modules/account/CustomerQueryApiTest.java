package com.fido.modules.account;

import static org.junit.jupiter.api.Assertions.*;

import com.fido.support.OperationsHttpSupport;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

class CustomerQueryApiTest extends OperationsHttpSupport {
    private final List<Long> orderIds = new ArrayList<>();

    @AfterEach
    void cleanOrders() {
        for (long id : orderIds) {
            db.update("DELETE FROM order_items WHERE order_id=?", id);
            db.update("DELETE FROM order_addresses WHERE order_id=?", id);
            db.update("DELETE FROM order_voucher_snapshots WHERE order_id=?", id);
            db.update("DELETE FROM shipping_infos WHERE order_id=?", id);
            db.update("DELETE FROM payments WHERE order_id=?", id);
            db.update("DELETE FROM orders WHERE id=?", id);
        }
    }

    private long order(long accountId, String date) {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        String orderNumber = "CUST-" + suffix.substring(0, 20);
        String idempotencyKey = "customer-query-" + suffix;
        String fingerprint = suffix + suffix;
        db.update(
                """
                INSERT INTO orders(
                    account_id, voucher_id, order_number, idempotency_key, request_fingerprint,
                    status, subtotal, discount_amount, shipping_fee, total_amount, currency,
                    placed_at, created_at, updated_at
                ) VALUES (?,NULL,?,?,?,'PENDING',100,0,0,100,'VND',?,?,?)
                """,
                accountId, orderNumber, idempotencyKey, fingerprint, date, date, date);
        long id = db.queryForObject(
                "SELECT id FROM orders WHERE order_number=?", Long.class, orderNumber);
        orderIds.add(id);
        db.update(
                """
                INSERT INTO payments(order_id,method,payment_status,amount,currency,refund_amount)
                VALUES (?,'COD','UNPAID',100,'VND',0)
                """,
                id);
        return id;
    }

    @Test
    void accountSearchStatsDetailAndAccountIsolation() throws Exception {
        var root = user("SUPERADMIN");
        var customer = user(null);
        var other = user(null);
        long old = order(customer.id(), "2026-09-01 12:00:00");
        long recent = order(customer.id(), "2026-09-20 12:00:00");
        order(other.id(), "2026-09-21 12:00:00");

        db.update(
                """
                INSERT INTO addresses(
                    account_id,recipient_name,recipient_phone,province,district,ward,
                    address_line,is_default,created_at,updated_at
                ) VALUES (?,'Customer Test','0901234567','Hà Nội','Cầu Giấy',
                    'Dịch Vọng','Customer address',TRUE,'2026-09-01 12:00:00','2026-09-01 12:00:00')
                """,
                customer.id());

        String path = "/api/v1/admin/customers";
        var list = call("GET", path + "?q=" + customer.phone() + "&page_size=1", root.token(), null);
        assertEquals(200, list.status());
        assertEquals(1, list.body().get("meta").get("total").asInt());
        var row = list.body().get("data").get(0);
        assertEquals(5, row.size());
        assertEquals(2, row.get("order_count").asInt());
        assertEquals("2026-09-20T12:00:00", row.get("last_order_at").asText());

        var detail = call("GET", path + "/" + customer.id(), root.token(), null);
        assertEquals(200, detail.status());
        var data = detail.body().get("data");
        assertFalse(data.get("account").has("password_hash"));
        assertEquals(1, data.get("addresses").size());
        assertEquals(2, data.get("orders").size());
        assertEquals(recent, data.get("orders").get(0).get("order_id").asLong());
        assertEquals(old, data.get("orders").get(1).get("order_id").asLong());
        assertEquals("UNPAID", data.get("orders").get(0).get("payment_status").asText());

        var zero = call("GET", path + "?q=" + root.phone(), root.token(), null)
                .body().get("data").get(0);
        assertEquals(0, zero.get("order_count").asInt());
        assertTrue(zero.get("last_order_at").isNull());
        assertEquals(0, call(
                "GET", path + "?q=" + customer.phone() + "&page=2&page_size=1", root.token(), null)
                .body().get("data").size());
        assertEquals(404, call("GET", path + "/9223372036854775807", root.token(), null).status());
        assertEquals(400, call("GET", path + "?page_size=101", root.token(), null).status());
    }

    @Test
    void customerPermissionDoesNotGrantOrderAdminAccess() throws Exception {
        var employee = user("ADMIN");
        String path = "/api/v1/admin/customers";
        assertEquals(401, call("GET", path, null, null).status());
        assertEquals(403, call("GET", path, employee.token(), null).status());
        assertEquals(403, call("GET", path + "/" + employee.id(), employee.token(), null).status());
        capability(employee, "CUSTOMER_READ");
        assertEquals(200, call("GET", path, employee.token(), null).status());
        assertEquals(200, call("GET", path + "/" + employee.id(), employee.token(), null).status());
        assertEquals(403, call("GET", "/api/v1/admin/orders", employee.token(), null).status());
    }
}
