package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.UUID;

class OrderAuditPrivacyHttpTests extends OrderHttpSupport {
    @Autowired ObjectMapper json;

    @Test
    void cancellationReasonDoesNotLeakIntoAuditPayload() throws Exception {
        User customer = user();
        User root = superadmin();
        CatalogFixture product = createVariant(5, 100000, null);
        long orderId = createOrder(customer, product, 1);
        String reason = "cancel-private-marker-" + UUID.randomUUID();

        var cancelled = call("POST", "/api/v1/admin/orders/" + orderId + "/actions",
                root.token(), Map.of("action", "CANCEL", "reason", reason));
        assertEquals(200, cancelled.status(), cancelled.body());

        String afterData = auditAfterData(orderId, "ORDER_CANCEL");
        assertFalse(afterData.contains(reason));
        assertTrue(afterData.contains("CANCELLED"));
        assertEquals(5, stock(product.productId()));
    }

    @Test
    void refundReasonIsBusinessDataButNeverCopiedIntoAuditPayload() throws Exception {
        User customer = user();
        User root = superadmin();
        CatalogFixture product = createVariant(5, 100000, null);
        long orderId = createOrder(customer, product, 1);
        assertEquals(200, action(root, orderId, "CONFIRM").status());
        assertEquals(200, action(root, orderId, "START_PREPARING").status());
        assertEquals(200, action(root, orderId, "DISPATCH").status());
        assertEquals(200, call("POST", "/api/v1/admin/orders/" + orderId + "/payment-actions",
                root.token(), Map.of("action", "COMPLETE_DELIVERY_AND_COLLECT_COD")).status());

        String reason = "return-private-marker-" + UUID.randomUUID();
        var returned = call("POST", "/api/v1/admin/orders/" + orderId + "/after-sales",
                root.token(), Map.of("action", "RETURN_AND_REFUND_FULL", "reason", reason));
        assertEquals(200, returned.status(), returned.body());
        assertEquals(reason, db.queryForObject("SELECT refund_reason FROM payments WHERE order_id=?",
                String.class, orderId));
        assertFalse(auditAfterData(orderId, "ORDER_RETURN_ACCEPT").contains(reason));
        assertFalse(auditAfterData(orderId, "ORDER_REFUND").contains(reason));
        assertEquals(4, stock(product.productId()));
        assertEquals(0, movementCount(orderId, "RETURN_RESTOCK"));
    }

    private String auditAfterData(long orderId, String action) {
        return db.queryForObject("""
                SELECT CAST(after_data AS CHAR)
                FROM audit_logs
                WHERE entity_id=? AND action=?
                ORDER BY id DESC LIMIT 1
                """, String.class, Long.toString(orderId), action);
    }
}
