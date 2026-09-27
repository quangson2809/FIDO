package com.fido.modules.account;
import com.fido.support.OperationsHttpSupport;
import java.util.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CustomerQueryApiTest extends OperationsHttpSupport {
    private final List<Long> orderIds = new ArrayList<>();
    @AfterEach
    void cleanOrders() {
        for (long id : orderIds) {
            db.update("DELETE FROM payments WHERE order_id=?", id);
            db.update("DELETE FROM orders WHERE order_id=?", id);
        }
    }
    private long order(Long customer, String phone, String date) {
        String code = "ORD-" + UUID.randomUUID();
        db.update("""
            INSERT INTO orders(order_code,customer_account_id,order_status,recipient_phone,recipient_address,
                subtotal_snapshot,discount_snapshot,shipping_fee_snapshot,total_snapshot,created_at,updated_at)
            VALUES (?,?,'PENDING',?,'Test address',100,0,0,100,?,?)
            """, code, customer, phone, date, date);
        long id = db.queryForObject("SELECT order_id FROM orders WHERE order_code=?", Long.class, code);
        orderIds.add(id);
        db.update("INSERT INTO payments(order_id,payment_status,amount_due,amount_received,amount_refunded) VALUES (?,'UNPAID',100,0,0)", id);
        return id;
    }
    @Test
    void accountSearchStatsDetailAndGuestIsolation() throws Exception {
        var root = user("SUPERADMIN"); var customer = user(null); var other = user(null);
        long old = order(customer.id(), customer.phone(), "2026-09-01 12:00:00");
        long recent = order(customer.id(), customer.phone(), "2026-09-20 12:00:00");
        order(other.id(), customer.phone(), "2026-09-21 12:00:00");
        order(null, customer.phone(), "2026-09-22 12:00:00");
        db.update("INSERT INTO addresses(account_id,address_text,created_at) VALUES (?,?,'2026-09-01 12:00:00')", customer.id(), "Customer address");
        String path = "/api/v1/admin/customers";
        var list = call("GET", path + "?q=" + customer.phone() + "&page_size=1", root.token(), null);
        assertEquals(200, list.status());
        assertEquals(1, list.body().get("meta").get("total").asInt());
        var row = list.body().get("data").get(0);
        assertEquals(5, row.size()); assertEquals(2, row.get("order_count").asInt());
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
        var zero = call("GET", path + "?q=" + root.phone(), root.token(), null).body().get("data").get(0);
        assertEquals(0, zero.get("order_count").asInt()); assertTrue(zero.get("last_order_at").isNull());
        assertEquals(0, call("GET", path + "?q=" + customer.phone() + "&page=2&page_size=1", root.token(), null).body().get("data").size());
        assertEquals(404, call("GET", path + "/9223372036854775807", root.token(), null).status());
        assertEquals(400, call("GET", path + "?page_size=101", root.token(), null).status());
    }
    @Test
    void customerPermissionDoesNotGrantOrderAdminAccess() throws Exception {
        var employee = user("ADMIN"); String path = "/api/v1/admin/customers";
        assertEquals(401, call("GET", path, null, null).status());
        assertEquals(403, call("GET", path, employee.token(), null).status());
        assertEquals(403, call("GET", path + "/" + employee.id(), employee.token(), null).status());
        capability(employee, "CUSTOMER_READ");
        assertEquals(200, call("GET", path, employee.token(), null).status());
        assertEquals(200, call("GET", path + "/" + employee.id(), employee.token(), null).status());
        assertEquals(403, call("GET", "/api/v1/admin/orders", employee.token(), null).status());
    }
}
