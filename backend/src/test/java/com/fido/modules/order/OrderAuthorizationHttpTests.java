package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import java.util.Map;

class OrderAuthorizationHttpTests extends OrderHttpSupport {
    @Test
    void orderReadRequiresExplicitCapability() throws Exception {
        User root = superadmin();
        User plainAdmin = plainAdmin();
        User reader = employeeWithPermission("ORDER_READ");
        User editor = employeeWithPermission("ORDER_EDIT");
        long orderId = pendingOrder();

        assertEquals(401, call("GET", "/api/v1/admin/orders/" + orderId, null, null).status());
        assertEquals(200, call("GET", "/api/v1/admin/orders/" + orderId, root.token(), null).status());
        assertEquals(403, call("GET", "/api/v1/admin/orders/" + orderId, plainAdmin.token(), null).status());
        assertEquals(200, call("GET", "/api/v1/admin/orders/" + orderId, reader.token(), null).status());
        assertEquals(403, call("GET", "/api/v1/admin/orders/" + orderId, editor.token(), null).status());
        assertEquals(403, action(reader, orderId, "CONFIRM").status());
        assertEquals(200, action(editor, orderId, "CONFIRM").status());
    }

    @Test
    void legacyFulfillmentPermissionsDoNotGrantOrderEdit() throws Exception {
        User root = superadmin();
        User oldPermission = employeeWithPermission("ORDER_FULFILLMENT");
        long orderId = pendingOrder();
        assertEquals(403, action(oldPermission, orderId, "CONFIRM").status());
        assertEquals(200, action(root, orderId, "CONFIRM").status());
        assertEquals(200, action(root, orderId, "START_PREPARING").status());
        assertEquals(403, action(oldPermission, orderId, "DISPATCH").status());
        assertEquals(200, action(root, orderId, "DISPATCH").status());
        assertEquals(403, call("POST", "/api/v1/admin/orders/" + orderId + "/payment-actions",
                oldPermission.token(), Map.of("action", "COMPLETE_DELIVERY_AND_COLLECT_COD")).status());
        assertEquals(200, call("POST", "/api/v1/admin/orders/" + orderId + "/payment-actions",
                root.token(), Map.of("action", "COMPLETE_DELIVERY_AND_COLLECT_COD")).status());
    }

    @Test
    void afterSalesRequiresBothAfterSalesAndPaymentCapabilities() throws Exception {
        User root = superadmin();
        User afterSalesOnly = employeeWithPermission("ORDER_AFTER_SALES");
        CatalogFixture product = createVariant(5, 100000, null);
        long orderId = createOrder(user(), product, 1);
        assertEquals(200, action(root, orderId, "CONFIRM").status());
        assertEquals(200, action(root, orderId, "START_PREPARING").status());
        assertEquals(200, action(root, orderId, "DISPATCH").status());
        assertEquals(200, call("POST", "/api/v1/admin/orders/" + orderId + "/payment-actions",
                root.token(), Map.of("action", "COMPLETE_DELIVERY_AND_COLLECT_COD")).status());
        assertEquals(403, call("POST", "/api/v1/admin/orders/" + orderId + "/after-sales",
                afterSalesOnly.token(), Map.of("action", "RETURN_AND_REFUND_FULL", "reason", "Returned")).status());
        assertEquals(200, call("POST", "/api/v1/admin/orders/" + orderId + "/after-sales",
                root.token(), Map.of("action", "RETURN_AND_REFUND_FULL", "reason", "Returned")).status());
    }

    private long pendingOrder() throws Exception {
        User customer = user();
        CatalogFixture product = createVariant(5, 100000, null);
        return createOrder(customer, product, 1);
    }
}
