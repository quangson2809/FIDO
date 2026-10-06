package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Map;
import org.junit.jupiter.api.Test;

class OrderStockHttpTests extends OrderHttpSupport {

    @Test
    void confirmationRollbackCancellationAndDeliveryReturnAreStockSafe()
            throws Exception {
        User customer = user();
        User root = superadmin();

        CatalogFixture first = createVariant(
                5,
                100000,
                null
        );

        CatalogFixture second = createVariant(
                5,
                120000,
                null
        );

        call(
                "POST",
                "/api/v1/cart/items",
                customer.token(),
                Map.of(
                        "variant_id", first.variantId(),
                        "quantity", 2
                )
        );

        call(
                "POST",
                "/api/v1/cart/items",
                customer.token(),
                Map.of(
                        "variant_id", second.variantId(),
                        "quantity", 2
                )
        );

        var created = call(
                "POST",
                "/api/v1/orders",
                customer.token(),
                Map.of(
                        "recipient_phone", "0900000000",
                        "recipient_address", "Hanoi"
                )
        );

        assertEquals(
                201,
                created.status(),
                created.body()
        );

        long rollbackOrderId = created.data()
                .get("data")
                .get("order_id")
                .asLong();

        orderIds.add(rollbackOrderId);

        call(
                "DELETE",
                "/api/v1/cart",
                customer.token(),
                null
        );

        db.update(
                """
                UPDATE inventories
                SET available_quantity=1,
                    updated_at=CURRENT_TIMESTAMP
                WHERE variant_id=?
                """,
                second.variantId()
        );

        assertEquals(
                409,
                action(
                        root,
                        rollbackOrderId,
                        "CONFIRM"
                ).status()
        );

        assertEquals(
                5,
                stock(first.variantId())
        );

        assertEquals(
                1,
                stock(second.variantId())
        );

        assertEquals(
                0,
                movementCount(
                        rollbackOrderId,
                        "ORDER_CONFIRM_OUT"
                )
        );

        assertEquals(
                "PENDING",
                db.queryForObject(
                        """
                        SELECT order_status
                        FROM orders
                        WHERE order_id=?
                        """,
                        String.class,
                        rollbackOrderId
                )
        );

        db.update(
                """
                UPDATE inventories
                SET available_quantity=5,
                    updated_at=CURRENT_TIMESTAMP
                WHERE variant_id=?
                """,
                second.variantId()
        );

        long cancelOrderId = createOrder(
                customer,
                first,
                2
        );

        assertEquals(
                200,
                action(root, cancelOrderId, "CONFIRM").status()
        );

        assertEquals(
                3,
                stock(first.variantId())
        );

        assertEquals(
                200,
                action(root, cancelOrderId, "CANCEL").status()
        );

        assertEquals(
                5,
                stock(first.variantId())
        );

        assertEquals(
                1,
                movementCount(
                        cancelOrderId,
                        "ORDER_CANCEL_IN"
                )
        );

        assertEquals(
                200,
                action(root, cancelOrderId, "CANCEL").status()
        );

        assertEquals(
                5,
                stock(first.variantId())
        );

        assertEquals(
                1,
                movementCount(
                        cancelOrderId,
                        "ORDER_CANCEL_IN"
                )
        );

        long failedOrderId = createOrder(
                customer,
                first,
                1
        );

        assertEquals(
                200,
                action(root, failedOrderId, "CONFIRM").status()
        );

        assertEquals(
                4,
                stock(first.variantId())
        );

        assertEquals(
                200,
                action(root, failedOrderId, "PREPARE").status()
        );

        assertEquals(
                200,
                action(root, failedOrderId, "SHIP").status()
        );

        assertEquals(
                200,
                action(
                        root,
                        failedOrderId,
                        "DELIVERY_FAILED"
                ).status()
        );

        assertEquals(
                4,
                stock(first.variantId())
        );

        assertEquals(
                0,
                movementCount(
                        failedOrderId,
                        "DELIVERY_RETURN_IN"
                )
        );

        assertEquals(
                200,
                action(
                        root,
                        failedOrderId,
                        "DELIVERY_RETURN_IN"
                ).status()
        );

        assertEquals(
                5,
                stock(first.variantId())
        );

        assertEquals(
                1,
                movementCount(
                        failedOrderId,
                        "DELIVERY_RETURN_IN"
                )
        );

        assertEquals(
                200,
                action(
                        root,
                        failedOrderId,
                        "DELIVERY_RETURN_IN"
                ).status()
        );

        assertEquals(
                5,
                stock(first.variantId())
        );

        assertEquals(
                409,
                action(
                        root,
                        failedOrderId,
                        "RETRY_DELIVERY"
                ).status()
        );

        assertEquals(
                200,
                action(root, failedOrderId, "CANCEL").status()
        );

        assertEquals(
                5,
                stock(first.variantId())
        );

        assertEquals(
                0,
                movementCount(
                        failedOrderId,
                        "ORDER_CANCEL_IN"
                )
        );

        long failedCancelOrderId = createOrder(
                customer,
                first,
                1
        );

        assertEquals(
                200,
                action(root, failedCancelOrderId, "CONFIRM").status()
        );

        assertEquals(
                4,
                stock(first.variantId())
        );

        assertEquals(
                200,
                action(root, failedCancelOrderId, "PREPARE").status()
        );

        assertEquals(
                200,
                action(root, failedCancelOrderId, "SHIP").status()
        );

        assertEquals(
                200,
                action(
                        root,
                        failedCancelOrderId,
                        "DELIVERY_FAILED"
                ).status()
        );

        assertEquals(
                4,
                stock(first.variantId())
        );

        assertEquals(
                200,
                call(
                        "POST",
                        "/api/v1/admin/orders/"
                                + failedCancelOrderId
                                + "/actions",
                        root.token(),
                        Map.of("action", "CANCEL")
                ).status()
        );

        assertEquals(
                5,
                stock(first.variantId())
        );

        assertEquals(
                1,
                movementCount(
                        failedCancelOrderId,
                        "ORDER_CANCEL_IN"
                )
        );

        assertEquals(
                200,
                action(
                        root,
                        failedCancelOrderId,
                        "CANCEL"
                ).status()
        );

        assertEquals(
                5,
                stock(first.variantId())
        );

        assertEquals(
                1,
                movementCount(
                        failedCancelOrderId,
                        "ORDER_CANCEL_IN"
                )
        );

        assertEquals(
                200,
                action(
                        root,
                        failedCancelOrderId,
                        "CANCEL"
                ).status()
        );

        assertEquals(
                5,
                stock(first.variantId())
        );

        long pendingCancelOrderId = createOrder(
                customer,
                first,
                1
        );

        assertEquals(
                200,
                action(
                        root,
                        pendingCancelOrderId,
                        "CANCEL"
                ).status()
        );

        assertEquals(
                5,
                stock(first.variantId())
        );

        assertEquals(
                0,
                movementCount(
                        pendingCancelOrderId,
                        "ORDER_CANCEL_IN"
                )
        );

        assertEquals(
                501,
                call(
                        "POST",
                        "/api/v1/orders",
                        customer.token(),
                        Map.of(
                                "recipient_phone", "0900000000",
                                "recipient_address", "Hanoi",
                                "voucher_code", "TBD"
                        )
                ).status()
        );
    }

}
