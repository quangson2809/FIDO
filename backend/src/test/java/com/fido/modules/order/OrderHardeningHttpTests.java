package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;

class OrderHardeningHttpTests extends OrderHttpSupport {
    @Test
    void adminNamespaceRejectsUnprivilegedAccountsButKeepsCapabilityModel() throws Exception {
        User customer = user();
        User admin = plainAdmin();
        assertEquals(401, call("GET", "/api/v1/admin/unmapped", null, null).status());
        assertEquals(403, call("GET", "/api/v1/admin/unmapped", customer.token(), null).status());
        assertEquals(403, call("GET", "/api/v1/admin/unmapped", admin.token(), null).status());

        User reader = employeeWithPermission("ORDER_READ");
        db.update("DELETE FROM account_roles WHERE account_id=? AND role_id IN " +
                "(SELECT id FROM roles WHERE code='ADMIN')", reader.accountId());
        assertEquals(200, call("GET", "/api/v1/admin/orders", reader.token(), null).status());

        CatalogFixture product = createVariant(5, 100000, null);
        long orderId = createOrder(customer, product, 1);
        assertEquals(403, action(reader, orderId, "CONFIRM").status());
    }

    @Test
    void expiredReturnRejectsWithoutStateAuditPaymentOrStockChange() throws Exception {
        User customer = user();
        User root = superadmin();
        CatalogFixture product = createVariant(5, 100000, null);
        long orderId = createOrder(customer, product, 1);
        LocalDateTime deliveredAt = LocalDateTime.now(ZoneOffset.UTC).minusDays(2).minusSeconds(5);
        db.update("UPDATE orders SET status='COMPLETED' WHERE id=?", orderId);
        db.update("UPDATE shipping_infos SET shipping_status='DELIVERED', shipped_at=?, delivered_at=? WHERE order_id=?",
                deliveredAt, deliveredAt, orderId);
        db.update("UPDATE payments SET payment_status='PAID', collected_by_account_id=?, collected_at=? WHERE order_id=?",
                root.accountId(), deliveredAt, orderId);

        int auditsBefore = db.queryForObject(
                "SELECT COUNT(*) FROM audit_logs WHERE entity_id=? AND action='ORDER_RETURN_ACCEPT'",
                Integer.class, Long.toString(orderId));
        var rejected = call("POST", "/api/v1/admin/orders/" + orderId + "/after-sales",
                root.token(), Map.of("action", "RETURN_AND_REFUND_FULL", "reason", "Received at store"));

        assertEquals(409, rejected.status(), rejected.body());
        assertEquals("COMPLETED", db.queryForObject("SELECT status FROM orders WHERE id=?",
                String.class, orderId));
        assertEquals(5, stock(product.productId()));
        assertEquals(0, movementCount(orderId, "RETURN_RESTOCK"));
        assertEquals(auditsBefore, db.queryForObject(
                "SELECT COUNT(*) FROM audit_logs WHERE entity_id=? AND action='ORDER_RETURN_ACCEPT'",
                Integer.class, Long.toString(orderId)));
        assertEquals("PAID", db.queryForObject("SELECT payment_status FROM payments WHERE order_id=?",
                String.class, orderId));
    }
}
