package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import java.util.Map;

class OrderActionContractHttpTests extends OrderHttpSupport {
    @Test
    void pendingCancellationNeedsNoReasonAndDoesNotMoveStock() throws Exception {
        User customer = user();
        User root = superadmin();
        CatalogFixture fixture = createVariant(5, 100000, null);
        long orderId = createOrder(customer, fixture, 1);

        var cancelled = call("POST", "/api/v1/admin/orders/" + orderId + "/actions",
                root.token(), Map.of("action", "CANCEL"));

        assertEquals(200, cancelled.status(), cancelled.body());
        assertEquals("CANCELLED", cancelled.data().get("data").get("order_status").asText());
        assertEquals(5, stock(fixture.productId()));
        assertEquals(0, movementCount(orderId, "ORDER"));
        assertEquals(0, movementCount(orderId, "ORDER_CANCEL_REVERSAL"));
    }

    @Test
    void deliveryFailureAcceptsOmittedReasonAndKeepsConfirmedStockDeduction() throws Exception {
        User customer = user();
        User root = superadmin();
        CatalogFixture fixture = createVariant(5, 100000, null);
        long orderId = createOrder(customer, fixture, 1);

        assertEquals(200, action(root, orderId, "CONFIRM").status());
        assertEquals(200, action(root, orderId, "START_PREPARING").status());
        assertEquals(200, call("POST", "/api/v1/admin/orders/" + orderId + "/actions",
                root.token(), Map.of("action", "DISPATCH", "carrier_name", "FIDO")).status());

        var failed = call("POST", "/api/v1/admin/orders/" + orderId + "/actions",
                root.token(), Map.of("action", "MARK_DELIVERY_FAILED"));

        assertEquals(200, failed.status(), failed.body());
        assertEquals("DELIVERY_FAILED", failed.data().get("data").get("order_status").asText());
        assertEquals("FAILED", failed.data().get("data").get("shipping_info")
                .get("shipping_status").asText());
        assertEquals(4, stock(fixture.productId()));
        assertEquals(1, movementCount(orderId, "ORDER"));
        assertEquals(0, movementCount(orderId, "ORDER_CANCEL_REVERSAL"));
    }
}
