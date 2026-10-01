package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.junit.jupiter.api.Test;

class OrderLifecycleHttpTests extends OrderHttpSupport {

    @Test
    void orderLifecycleSnapshotsCodReturnAndOwnership()
            throws Exception {
        User customer = user();
        User otherCustomer = user();
        User root = superadmin();
        User admin = plainAdmin();

        CatalogFixture fixture = createVariant(
                5,
                100000,
                90000
        );

        assertEquals(
                401,
                call(
                        "POST",
                        "/api/v1/orders",
                        null,
                        Map.of(
                                "recipient_phone", "0900000000",
                                "recipient_address", "Hanoi"
                        )
                ).status()
        );

        long orderId = createOrder(
                customer,
                fixture,
                2
        );

        assertEquals(
                5,
                stock(fixture.variantId())
        );

        assertEquals(
                0,
                movementCount(
                        orderId,
                        "ORDER_CONFIRM_OUT"
                )
        );

        var customerDetail = call(
                "GET",
                "/api/v1/me/orders/" + orderId,
                customer.token(),
                null
        );

        assertEquals(
                200,
                customerDetail.status(),
                customerDetail.body()
        );

        assertEquals(
                "PENDING",
                customerDetail.data()
                        .get("data")
                        .get("order_status")
                        .asText()
        );

        assertEquals(
                "UNPAID",
                customerDetail.data()
                        .get("data")
                        .get("payment")
                        .get("payment_status")
                        .asText()
        );

        assertEquals(
                90000,
                customerDetail.data()
                        .get("data")
                        .get("items")
                        .get(0)
                        .get("unit_price")
                        .asInt()
        );

        assertEquals(
                fixture.sku(),
                customerDetail.data()
                        .get("data")
                        .get("items")
                        .get(0)
                        .get("sku")
                        .asText()
        );

        assertEquals(
                210000,
                customerDetail.data()
                        .get("data")
                        .get("total")
                        .asInt()
        );

        assertEquals(
                404,
                call(
                        "GET",
                        "/api/v1/me/orders/" + orderId,
                        otherCustomer.token(),
                        null
                ).status()
        );

        db.update(
                """
                UPDATE product_variants
                SET override_price=70000,
                    updated_at=CURRENT_TIMESTAMP
                WHERE variant_id=?
                """,
                fixture.variantId()
        );

        var snapshotAfterReprice = call(
                "GET",
                "/api/v1/me/orders/" + orderId,
                customer.token(),
                null
        );

        assertEquals(
                90000,
                snapshotAfterReprice.data()
                        .get("data")
                        .get("items")
                        .get(0)
                        .get("unit_price")
                        .asInt()
        );

        assertEquals(
                403,
                call(
                        "GET",
                        "/api/v1/admin/orders/" + orderId,
                        admin.token(),
                        null
                ).status()
        );

        assertEquals(
                403,
                action(
                        admin,
                        orderId,
                        "CONFIRM"
                ).status()
        );

        assertEquals(
                403,
                call(
                        "PATCH",
                        "/api/v1/admin/orders/" + orderId,
                        admin.token(),
                        Map.of("customer_service_note", "Denied")
                ).status()
        );

        var adminDetail = call(
                "GET",
                "/api/v1/admin/orders/" + orderId,
                root.token(),
                null
        );

        assertEquals(
                200,
                adminDetail.status(),
                adminDetail.body()
        );

        assertTrue(
                adminDetail.data()
                        .get("data")
                        .get("allowed_actions")
                        .toString()
                        .contains("CONFIRM")
        );

        String orderCode = adminDetail.data()
                .get("data")
                .get("order_code")
                .asText();

        var adminList = call(
                "GET",
                "/api/v1/admin/orders"
                        + "?order_code=" + orderCode
                        + "&order_status=PENDING"
                        + "&payment_status=UNPAID",
                root.token(),
                null
        );

        assertEquals(
                200,
                adminList.status(),
                adminList.body()
        );

        assertEquals(
                1,
                adminList.data()
                        .get("meta")
                        .get("total")
                        .asInt()
        );

        assertEquals(
                200,
                call(
                        "PATCH",
                        "/api/v1/me/orders/"
                                + orderId
                                + "/recipient",
                        customer.token(),
                        Map.of(
                                "recipient_phone", "0911111111",
                                "recipient_address", "Dong Da, Hanoi"
                        )
                ).status()
        );

        assertEquals(
                200,
                action(root, orderId, "CONFIRM").status()
        );

        assertEquals(
                3,
                stock(fixture.variantId())
        );

        assertEquals(
                1,
                movementCount(
                        orderId,
                        "ORDER_CONFIRM_OUT"
                )
        );

        assertEquals(
                200,
                action(root, orderId, "CONFIRM").status()
        );

        assertEquals(
                3,
                stock(fixture.variantId())
        );

        assertEquals(
                1,
                movementCount(
                        orderId,
                        "ORDER_CONFIRM_OUT"
                )
        );

        assertEquals(
                200,
                action(root, orderId, "PREPARE").status()
        );

        assertEquals(
                200,
                call(
                        "PATCH",
                        "/api/v1/me/orders/"
                                + orderId
                                + "/recipient",
                        customer.token(),
                        Map.of("recipient_address", "Ba Dinh, Hanoi")
                ).status()
        );

        assertEquals(
                200,
                call(
                        "PATCH",
                        "/api/v1/admin/orders/" + orderId,
                        root.token(),
                        Map.of(
                                "customer_service_note", "Ready to ship",
                                "shipping_info", Map.of(
                                        "delivery_mode", "INTERNAL",
                                        "carrier_name", "FIDO"
                                )
                        )
                ).status()
        );

        assertEquals(
                200,
                action(root, orderId, "SHIP").status()
        );

        assertEquals(
                409,
                call(
                        "PATCH",
                        "/api/v1/me/orders/"
                                + orderId
                                + "/recipient",
                        customer.token(),
                        Map.of("recipient_address", "Locked")
                ).status()
        );

        assertEquals(
                409,
                action(root, orderId, "COMPLETE").status()
        );

        var collected = call(
                "POST",
                "/api/v1/admin/orders/"
                        + orderId
                        + "/payment-actions",
                root.token(),
                Map.of("action", "COLLECT_COD")
        );

        assertEquals(
                200,
                collected.status(),
                collected.body()
        );

        assertEquals(
                "PAID",
                collected.data()
                        .get("data")
                        .get("payment_status")
                        .asText()
        );

        assertEquals(
                210000,
                collected.data()
                        .get("data")
                        .get("amount_received")
                        .asInt()
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
                action(root, orderId, "COMPLETE").status()
        );

        assertEquals(
                501,
                call(
                        "POST",
                        "/api/v1/admin/orders/"
                                + orderId
                                + "/after-sales",
                        root.token(),
                        Map.of(
                                "operation", "EXCHANGE_SIZE",
                                "reason", "Need another size",
                                "source_variant_id", fixture.variantId(),
                                "target_variant_id", fixture.variantId(),
                                "quantity", 1
                        )
                ).status()
        );

        var returned = call(
                "POST",
                "/api/v1/admin/orders/"
                        + orderId
                        + "/after-sales",
                root.token(),
                Map.of(
                        "operation", "RETURN",
                        "reason", "Accepted at store"
                )
        );

        assertEquals(
                200,
                returned.status(),
                returned.body()
        );

        assertEquals(
                "RETURNED",
                returned.data()
                        .get("data")
                        .get("order_status")
                        .asText()
        );

        assertEquals(
                3,
                stock(fixture.variantId())
        );

        assertEquals(
                "PAID",
                returned.data()
                        .get("data")
                        .get("payment")
                        .get("payment_status")
                        .asText()
        );

        var refunded = call(
                "POST",
                "/api/v1/admin/orders/"
                        + orderId
                        + "/payment-actions",
                root.token(),
                Map.of("action", "REFUND")
        );

        assertEquals(
                200,
                refunded.status(),
                refunded.body()
        );

        assertEquals(
                "REFUNDED",
                refunded.data()
                        .get("data")
                        .get("payment_status")
                        .asText()
        );

        assertEquals(
                210000,
                refunded.data()
                        .get("data")
                        .get("amount_refunded")
                        .asInt()
        );

        assertEquals(
                200,
                call(
                        "POST",
                        "/api/v1/admin/orders/"
                                + orderId
                                + "/payment-actions",
                        root.token(),
                        Map.of("action", "REFUND")
                ).status()
        );

        var customerList = call(
                "GET",
                "/api/v1/me/orders?order_status=RETURNED",
                customer.token(),
                null
        );

        assertEquals(
                200,
                customerList.status()
        );

        assertEquals(
                1,
                customerList.data()
                        .get("meta")
                        .get("total")
                        .asInt()
        );

        assertTrue(
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM audit_logs
                        WHERE target_type='ORDER'
                          AND target_id=?
                        """,
                        Integer.class,
                        Long.toString(orderId)
                ) >= 8
        );
    }

}
