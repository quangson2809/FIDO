package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.Map;
import org.junit.jupiter.api.Test;

class OrderActionContractHttpTests extends OrderHttpSupport {

    @Test
    void cancelAcceptsOmittedOptionalReason() throws Exception {
        User customer = user();
        User root = superadmin();
        CatalogFixture fixture = createVariant(5, 100000, null);
        long orderId = createOrder(customer, fixture, 1);

        var cancelled = call(
                "POST",
                "/api/v1/admin/orders/" + orderId + "/actions",
                root.token(),
                Map.of("action", "CANCEL")
        );

        assertEquals(200, cancelled.status(), cancelled.body());
        assertEquals(
                "CANCELLED",
                cancelled.data().get("data").get("order_status").asText()
        );
        assertNull(
                db.queryForObject(
                        "SELECT cancel_reason FROM orders WHERE order_id=?",
                        String.class,
                        orderId
                )
        );
        assertEquals(5, stock(fixture.variantId()));
    }

    @Test
    void deliveryFailedAcceptsOmittedOptionalReason() throws Exception {
        User customer = user();
        User root = superadmin();
        CatalogFixture fixture = createVariant(5, 100000, null);
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
                                "shipping_info",
                                Map.of("delivery_mode", "INTERNAL")
                        )
                ).status()
        );
        assertEquals(200, action(root, orderId, "SHIP").status());

        var failed = call(
                "POST",
                "/api/v1/admin/orders/" + orderId + "/actions",
                root.token(),
                Map.of("action", "DELIVERY_FAILED")
        );

        assertEquals(200, failed.status(), failed.body());
        assertEquals(
                "DELIVERY_FAILED",
                failed.data().get("data").get("order_status").asText()
        );
        assertEquals(4, stock(fixture.variantId()));
    }
}
