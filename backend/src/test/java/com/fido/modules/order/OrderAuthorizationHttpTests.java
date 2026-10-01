package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.junit.jupiter.api.Test;

class OrderAuthorizationHttpTests extends OrderHttpSupport {

    @Test
    void orderReadRequiresExplicitCapability() throws Exception {
        User root = superadmin();
        User plainAdmin = plainAdmin();
        User reader = employeeWithPermission("ORDER_READ");
        User editor = employeeWithPermission("ORDER_EDIT");
        long orderId = pendingOrder();

        assertEquals(
                401,
                call(
                        "GET",
                        "/api/v1/admin/orders/" + orderId,
                        null,
                        null
                ).status()
        );

        assertEquals(
                200,
                call(
                        "GET",
                        "/api/v1/admin/orders/" + orderId,
                        root.token(),
                        null
                ).status()
        );

        assertEquals(
                403,
                call(
                        "GET",
                        "/api/v1/admin/orders/" + orderId,
                        plainAdmin.token(),
                        null
                ).status()
        );

        assertEquals(
                200,
                call(
                        "GET",
                        "/api/v1/admin/orders/" + orderId,
                        reader.token(),
                        null
                ).status()
        );

        assertEquals(
                403,
                call(
                        "GET",
                        "/api/v1/admin/orders/" + orderId,
                        editor.token(),
                        null
                ).status()
        );
    }

    @Test
    void orderProcessCapabilityOnlyAllowsConfirmAndPrepare()
            throws Exception {
        User operator = employeeWithPermission("ORDER_PROCESS");
        long orderId = pendingOrder();

        var confirmed = action(
                operator,
                orderId,
                "CONFIRM"
        );

        assertEquals(200, confirmed.status(), confirmed.body());

        assertEquals(
                1,
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM audit_logs
                        WHERE actor_account_id=?
                          AND target_type='ORDER'
                          AND target_id=?
                          AND action='ORDER_CONFIRM'
                        """,
                        Integer.class,
                        operator.accountId(),
                        Long.toString(orderId)
                )
        );

        assertTrue(
                confirmed.data()
                        .get("data")
                        .get("allowed_actions")
                        .toString()
                        .contains("PREPARE")
        );
        assertFalse(
                confirmed.data()
                        .get("data")
                        .get("allowed_actions")
                        .toString()
                        .contains("CANCEL")
        );

        assertEquals(
                200,
                action(operator, orderId, "PREPARE").status()
        );

        for (String denied : new String[] {
                "SHIP",
                "COMPLETE",
                "CANCEL",
                "DELIVERY_FAILED"
        }) {
            assertEquals(
                    403,
                    action(operator, orderId, denied).status(),
                    denied
            );
        }
    }

    @Test
    void orderFulfillmentCapabilityOnlyAllowsFulfillmentActions()
            throws Exception {
        User root = superadmin();
        User operator = employeeWithPermission("ORDER_FULFILLMENT");
        long orderId = pendingOrder();

        assertEquals(200, action(root, orderId, "CONFIRM").status());
        assertEquals(200, action(root, orderId, "PREPARE").status());

        assertEquals(
                403,
                action(operator, orderId, "CONFIRM").status()
        );

        assertEquals(
                200,
                action(operator, orderId, "SHIP").status()
        );

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

        assertEquals(
                200,
                action(root, orderId, "DELIVERY_FAILED").status()
        );

        assertEquals(
                200,
                action(operator, orderId, "RETRY_DELIVERY").status()
        );

        assertEquals(
                200,
                action(operator, orderId, "COMPLETE").status()
        );

        assertEquals(
                403,
                action(operator, orderId, "CANCEL").status()
        );
    }

    @Test
    void orderExceptionCapabilityOnlyAllowsExceptionActions()
            throws Exception {
        User root = superadmin();
        User operator = employeeWithPermission("ORDER_EXCEPTION");

        long cancelledOrder = pendingOrder();
        assertEquals(
                200,
                action(operator, cancelledOrder, "CANCEL").status()
        );

        long failedOrder = pendingOrder();
        assertEquals(200, action(root, failedOrder, "CONFIRM").status());
        assertEquals(200, action(root, failedOrder, "PREPARE").status());
        assertEquals(200, action(root, failedOrder, "SHIP").status());

        for (String denied : new String[] {
                "CONFIRM",
                "SHIP",
                "COMPLETE"
        }) {
            assertEquals(
                    403,
                    action(operator, failedOrder, denied).status(),
                    denied
            );
        }

        assertEquals(
                200,
                action(operator, failedOrder, "DELIVERY_FAILED").status()
        );

        assertEquals(
                200,
                action(operator, failedOrder, "DELIVERY_RETURN_IN").status()
        );
    }

    @Test
    void authorizationPassesBeforeBusinessStateValidation()
            throws Exception {
        User root = superadmin();
        User operator = employeeWithPermission("ORDER_FULFILLMENT");
        long employeeOrder = pendingOrder();
        long rootOrder = pendingOrder();

        assertEquals(
                409,
                action(operator, employeeOrder, "SHIP").status()
        );

        assertEquals(
                409,
                action(root, rootOrder, "SHIP").status()
        );

        assertEquals(
                200,
                action(root, rootOrder, "CONFIRM").status()
        );
    }

    @Test
    void invalidOrderActionFailsAtRequestValidation() throws Exception {
        User root = superadmin();
        long orderId = pendingOrder();

        assertEquals(
                400,
                call(
                        "POST",
                        "/api/v1/admin/orders/"
                                + orderId
                                + "/actions",
                        root.token(),
                        Map.of("action", "ABC")
                ).status()
        );
    }

    private long pendingOrder() throws Exception {
        User customer = user();
        CatalogFixture fixture = createVariant(
                20,
                100000,
                null
        );

        return createOrder(
                customer,
                fixture,
                1
        );
    }
}
