package com.fido.modules.account;

import static org.junit.jupiter.api.Assertions.*;

import com.fido.support.OperationsHttpSupport;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

class CustomerQueryApiTest extends OperationsHttpSupport {
    private final List<Long> orderIds = new ArrayList<>();
    private Long productId;
    private Long categoryId;

    private User staff(String role) throws Exception {
        var staff = user(role);
        db.update(
                "DELETE FROM account_roles WHERE account_id=? AND role_id IN (SELECT id FROM roles WHERE code='CUSTOMER')",
                staff.id());
        return staff;
    }

    @AfterEach
    void cleanOrders() {
        for (long id : orderIds) {
            db.update("DELETE FROM order_items WHERE order_id=?", id);
            db.update("DELETE FROM order_addresses WHERE order_id=?", id);
            db.update("DELETE FROM order_voucher_snapshots WHERE order_id=?", id);
            db.update("DELETE FROM payments WHERE order_id=?", id);
            db.update("DELETE FROM orders WHERE id=?", id);
        }
        if (productId != null) db.update("DELETE FROM products WHERE id=?", productId);
        if (categoryId != null) db.update("DELETE FROM categories WHERE id=?", categoryId);
    }

    private void ensureProduct() {
        if (productId != null) return;
        String suffix = UUID.randomUUID().toString().replace("-", "");
        String categorySlug = "customer-report-" + suffix;
        String sku = "CUSTOMER-REPORT-" + suffix;
        db.update(
                "INSERT INTO categories(parent_category_id,name,slug,status) VALUES (NULL,?,?, 'ACTIVE')",
                "Customer query test category",
                categorySlug);
        categoryId =
                db.queryForObject(
                        "SELECT id FROM categories WHERE slug=?", Long.class, categorySlug);
        db.update(
                """
                INSERT INTO products(category_id,name,slug,sku,selling_price,status)
                VALUES (?,?,?,?,100,'ACTIVE')
                """,
                categoryId,
                "Customer query test product",
                "customer-product-" + suffix,
                sku);
        productId = db.queryForObject("SELECT id FROM products WHERE sku=?", Long.class, sku);
    }

    private long order(long accountId, String date) {
        ensureProduct();
        String suffix = UUID.randomUUID().toString().replace("-", "");
        String orderNumber = "CUST-" + suffix.substring(0, 20);
        String idempotencyKey = "customer-query-" + suffix;
        String fingerprint = suffix + suffix;
        db.update(
                """
                INSERT INTO orders(
                    account_id,voucher_id,order_number,idempotency_key,request_fingerprint,status,subtotal,
                    discount_amount,shipping_fee,total_amount,created_at,updated_at
                ) VALUES (?,NULL,?,?,?,'PENDING',100,0,0,100,?,?)
                """,
                accountId,
                orderNumber,
                idempotencyKey,
                fingerprint,
                date,
                date);
        long id =
                db.queryForObject(
                        "SELECT id FROM orders WHERE order_number=?", Long.class, orderNumber);
        orderIds.add(id);
        db.update(
                """
                INSERT INTO payments(order_id,payment_status,amount,refund_amount)
                VALUES (?,'UNPAID',100,0)
                """,
                id);
        db.update(
                """
                INSERT INTO order_items(
                    order_id,product_id,sku_snapshot,product_name_snapshot,attribute_snapshot,
                    image_url_snapshot,quantity,unit_price,discount_amount,line_total)
                VALUES (?,?,'FIXTURE-SKU','Customer order snapshot','{}','',1,100,0,100)
                """,
                id,
                productId);
        db.update(
                """
                INSERT INTO order_addresses(
                    order_id,recipient_name,recipient_phone,province,district,ward,address_line)
                VALUES (?,'Customer Test','0901234567','Hà Nội','Cầu Giấy','Dịch Vọng','Customer address')
                """,
                id);
        return id;
    }

    @Test
    void accountSearchStatsDetailAndAccountIsolation() throws Exception {
        var root = staff("SUPERADMIN");
        var customer = user(null);
        var other = user(null);
        var withoutOrders = user(null);
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
        var list =
                call("GET", path + "?q=" + customer.phone() + "&page_size=1", root.token(), null);
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

        var zero =
                call("GET", path + "?q=" + withoutOrders.phone(), root.token(), null)
                        .body()
                        .get("data")
                        .get(0);
        assertEquals(0, zero.get("order_count").asInt());
        assertTrue(zero.get("last_order_at").isNull());
        assertEquals(
                0,
                call(
                                "GET",
                                path + "?q=" + customer.phone() + "&page=2&page_size=1",
                                root.token(),
                                null)
                        .body()
                        .get("data")
                        .size());
        assertEquals(404, call("GET", path + "/9223372036854775807", root.token(), null).status());
        assertEquals(400, call("GET", path + "?page_size=101", root.token(), null).status());
    }

    @Test
    void customerPermissionDoesNotGrantOrderAdminAccess() throws Exception {
        var employee = staff("ADMIN");
        var customer = user(null);
        String path = "/api/v1/admin/customers";
        assertEquals(401, call("GET", path, null, null).status());
        assertEquals(403, call("GET", path, employee.token(), null).status());
        assertEquals(403, call("GET", path + "/" + employee.id(), employee.token(), null).status());
        capability(employee, "CUSTOMER_READ");
        assertEquals(200, call("GET", path, employee.token(), null).status());
        assertEquals(404, call("GET", path + "/" + employee.id(), employee.token(), null).status());
        assertEquals(200, call("GET", path + "/" + customer.id(), employee.token(), null).status());
        assertEquals(403, call("GET", "/api/v1/admin/orders", employee.token(), null).status());
    }

    @Test
    void customerRoleScopesSearchPaginationAndDetailWithoutDuplicatingAccounts() throws Exception {
        var root = staff("SUPERADMIN");
        var employee = staff("ADMIN");
        String path = "/api/v1/admin/customers";
        int existingCustomers =
                call("GET", path, root.token(), null).body().get("meta").get("total").asInt();
        var customer = user(null);
        var withoutOrders = user(null);
        var lockedCustomer = user(null);
        var deletedCustomer = user(null);
        var unassigned = user(null);
        db.update("DELETE FROM account_roles WHERE account_id=?", unassigned.id());
        db.update("UPDATE accounts SET status='LOCKED' WHERE id=?", lockedCustomer.id());
        db.update(
                "UPDATE accounts SET deleted_at=CURRENT_TIMESTAMP(6) WHERE id=?",
                deletedCustomer.id());
        capability(customer, "CUSTOMER_READ");
        order(employee.id(), "2026-09-20 12:00:00");

        String marker = "customer-scope-" + UUID.randomUUID().toString().replace("-", "");
        for (var account :
                List.of(
                        root,
                        employee,
                        customer,
                        withoutOrders,
                        lockedCustomer,
                        deletedCustomer,
                        unassigned)) {
            db.update(
                    "UPDATE accounts SET email=? WHERE id=?",
                    marker + "-" + account.id() + "@example.test",
                    account.id());
        }

        var all = call("GET", path, root.token(), null);
        assertEquals(200, all.status());
        assertEquals(existingCustomers + 3, all.body().get("meta").get("total").asInt());
        var first = call("GET", path + "?q=" + marker + "&page_size=2", root.token(), null);
        assertEquals(200, first.status());
        assertEquals(3, first.body().get("meta").get("total").asInt());
        assertEquals(2, first.body().get("meta").get("total_pages").asInt());
        assertEquals(2, first.body().get("data").size());
        assertEquals(customer.id(), first.body().get("data").get(0).get("account_id").asLong());
        assertEquals(
                withoutOrders.id(), first.body().get("data").get(1).get("account_id").asLong());
        assertEquals(0, first.body().get("data").get(1).get("order_count").asInt());

        var second = call("GET", path + "?q=" + marker + "&page=2&page_size=2", root.token(), null);
        assertEquals(200, second.status());
        assertEquals(3, second.body().get("meta").get("total").asInt());
        assertEquals(1, second.body().get("data").size());
        assertEquals(
                lockedCustomer.id(), second.body().get("data").get(0).get("account_id").asLong());
        assertEquals(
                200, call("GET", path + "/" + lockedCustomer.id(), root.token(), null).status());

        for (var excluded : List.of(root, employee, deletedCustomer, unassigned)) {
            for (String search :
                    List.of(excluded.phone(), marker + "-" + excluded.id() + "@example.test")) {
                var result = call("GET", path + "?q=" + search, root.token(), null);
                assertEquals(200, result.status());
                assertEquals(0, result.body().get("data").size());
                assertEquals(0, result.body().get("meta").get("total").asInt());
            }
            assertEquals(404, call("GET", path + "/" + excluded.id(), root.token(), null).status());
        }
    }
}
