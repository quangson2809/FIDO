package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class OrderAuditPrivacyHttpTests extends OrderHttpSupport {

    @Test
    void cancellationKeepsBusinessReasonWithoutCopyingItToAuditDescription()
            throws Exception {
        User customer = user();
        User root = superadmin();
        CatalogFixture fixture = createVariant(5, 100000, 90000);
        long orderId = createOrder(customer, fixture, 1);
        String reason = "cancel-private-marker-" + UUID.randomUUID();

        var cancelled = call(
                "POST",
                "/api/v1/admin/orders/" + orderId + "/actions",
                root.token(),
                Map.of(
                        "action", "CANCEL",
                        "reason", reason
                )
        );

        assertEquals(200, cancelled.status(), cancelled.body());
        assertEquals(
                reason,
                db.queryForObject(
                        "SELECT cancel_reason FROM orders WHERE order_id=?",
                        String.class,
                        orderId
                )
        );

        String auditDescription = auditDescription(
                orderId,
                "ORDER_CANCEL"
        );

        assertEquals("PENDING -> CANCELLED", auditDescription);
        assertFalse(auditDescription.contains(reason));
    }

    @Test
    void acceptedReturnDoesNotCopyFreeFormReasonToAuditDescription()
            throws Exception {
        User customer = user();
        User root = superadmin();
        CatalogFixture fixture = createVariant(5, 100000, 90000);
        long orderId = createOrder(customer, fixture, 1);

        assertEquals(200, action(root, orderId, "CONFIRM").status());
        assertEquals(200, action(root, orderId, "PREPARE").status());

        assertEquals(
                200,
                call(
                        "PATCH",
                        "/api/v1/admin/orders/" + orderId,
                        root.token(),
                        Map.of(
                                "shipping_info", Map.of(
                                        "delivery_mode", "INTERNAL",
                                        "carrier_name", "FIDO"
                                )
                        )
                ).status()
        );

        assertEquals(200, action(root, orderId, "SHIP").status());
        assertEquals(
                200,
                call(
                        "POST",
                        "/api/v1/admin/orders/"
                                + orderId
                                + "/payment-actions",
                        root.token(),
                        Map.of("action", "COLLECT_COD")
                ).status()
        );
        assertEquals(200, action(root, orderId, "COMPLETE").status());

        String reason = "return-private-marker-" + UUID.randomUUID();
        var returned = call(
                "POST",
                "/api/v1/admin/orders/" + orderId + "/after-sales",
                root.token(),
                Map.of(
                        "operation", "RETURN",
                        "reason", reason
                )
        );

        assertEquals(200, returned.status(), returned.body());
        assertFalse(
                auditDescription(orderId, "ORDER_RETURN_ACCEPT")
                        .contains(reason)
        );
        assertEquals(
                "COMPLETED -> RETURNED",
                auditDescription(orderId, "ORDER_RETURN_ACCEPT")
        );
    }

    private String auditDescription(
            long orderId,
            String action
    ) {
        return db.queryForObject(
                """
                SELECT description
                FROM audit_logs
                WHERE target_type='ORDER'
                  AND target_id=?
                  AND action=?
                ORDER BY audit_id DESC
                LIMIT 1
                """,
                String.class,
                Long.toString(orderId),
                action
        );
    }
}
