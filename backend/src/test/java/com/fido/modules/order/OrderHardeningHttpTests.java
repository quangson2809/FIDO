package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.*;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import org.junit.jupiter.api.Test;

class OrderHardeningHttpTests extends OrderHttpSupport {
    @Test
    void adminNamespaceRejectsUnprivilegedAccountsButKeepsCapabilityModel() throws Exception {
        User customer = user();
        User admin = plainAdmin();
        assertEquals(401, call("GET", "/api/v1/admin/unmapped", null, null).status());
        assertEquals(403, call("GET", "/api/v1/admin/unmapped", customer.token(), null).status());
        assertEquals(403, call("GET", "/api/v1/admin/unmapped", admin.token(), null).status());
        User reader = employeeWithPermission("ORDER_READ");
        // Capability authorization must continue to work independently of coarse role membership.
        db.update("DELETE FROM account_roles WHERE account_id=? AND role_id IN (SELECT role_id FROM roles WHERE code='ADMIN')", reader.accountId());
        assertEquals(200, call("GET", "/api/v1/admin/orders", reader.token(), null).status());
        var variant = createVariant(5, 100000, null);
        long orderId = createOrder(customer, variant, 1);
        assertEquals(403, action(reader, orderId, "CONFIRM").status());
    }

    @Test
    void expiredReturnRejectsWithoutStateAuditPaymentOrStockChange() throws Exception {
        User root = superadmin();
        var variant = createVariant(5, 100000, null);
        long orderId = createOrder(user(), variant, 1);
        db.update("UPDATE orders SET order_status='COMPLETED', completed_at=? WHERE order_id=?",
                LocalDateTime.now(ZoneOffset.UTC).minusDays(2).minusSeconds(5), orderId);
        int audits = db.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE target_id=? AND action='ORDER_RETURN_ACCEPT'", Integer.class, Long.toString(orderId));
        var rejected = call("POST", "/api/v1/admin/orders/" + orderId + "/after-sales", root.token(),
                Map.of("operation", "RETURN", "reason", "Received at store"));
        assertEquals(409, rejected.status(), rejected.body());
        assertEquals("COMPLETED", db.queryForObject("SELECT order_status FROM orders WHERE order_id=?", String.class, orderId));
        assertEquals(5, stock(variant.variantId()));
        assertEquals(0, movementCount(orderId, "CUSTOMER_RETURN_IN"));
        assertEquals(audits, db.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE target_id=? AND action='ORDER_RETURN_ACCEPT'", Integer.class, Long.toString(orderId)));
        assertEquals("UNPAID", db.queryForObject("SELECT payment_status FROM payments WHERE order_id=?", String.class, orderId));
    }
}
