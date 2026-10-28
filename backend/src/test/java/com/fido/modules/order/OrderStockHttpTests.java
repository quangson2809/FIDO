package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import java.util.Map;

class OrderStockHttpTests extends OrderHttpSupport {
    @Test
    void confirmationIsAtomicWhenAnyOrderLineHasInsufficientStock() throws Exception {
        User customer = user();
        User root = superadmin();
        CatalogFixture first = createVariant(5, 100000, null);
        CatalogFixture second = createVariant(5, 120000, null);
        assertEquals(200, call("POST", "/api/v1/cart/items", customer.token(),
                Map.of("product_id", second.productId(), "quantity", 2)).status());

        long orderId = createOrder(customer, first, 2);
        var pendingDetail = call(
                "GET", "/api/v1/admin/orders/" + orderId, root.token(), null);
        assertEquals(200, pendingDetail.status(), pendingDetail.body());
        assertTrue(pendingDetail.data().get("data").get("allowed_actions").toString().contains("CONFIRM"));
        db.update("UPDATE inventories SET quantity_on_hand=1 WHERE product_id=?", second.productId());

        var rejected = action(root, orderId, "CONFIRM");
        assertEquals(409, rejected.status(), rejected.body());
        assertEquals(5, stock(first.productId()));
        assertEquals(1, stock(second.productId()));
        assertEquals(0, movementCount(orderId, "ORDER"));
        assertEquals("PENDING", db.queryForObject("SELECT status FROM orders WHERE id=?",
                String.class, orderId));
    }

    @Test
    void cancellationReversesEachConfirmedMovementExactlyOnce() throws Exception {
        User customer = user();
        User root = superadmin();
        CatalogFixture product = createVariant(5, 100000, null);
        long orderId = createOrder(customer, product, 2);

        assertEquals(200, action(root, orderId, "CONFIRM").status());
        assertEquals(3, stock(product.productId()));
        assertEquals(1, movementCount(orderId, "ORDER"));

        assertEquals(200, action(root, orderId, "CANCEL").status());
        assertEquals(5, stock(product.productId()));
        assertEquals(1, movementCount(orderId, "ORDER_CANCEL_REVERSAL"));

        assertEquals(409, action(root, orderId, "CANCEL").status());
        assertEquals(5, stock(product.productId()));
        assertEquals(1, movementCount(orderId, "ORDER_CANCEL_REVERSAL"));
    }

    @Test
    void failedDeliveryRetryAndFinalCancellationNeverDoubleMoveStock() throws Exception {
        User customer = user();
        User root = superadmin();
        CatalogFixture product = createVariant(5, 100000, null);
        long orderId = createOrder(customer, product, 1);

        assertEquals(200, action(root, orderId, "CONFIRM").status());
        assertEquals(200, action(root, orderId, "START_PREPARING").status());
        assertEquals(200, call("POST", "/api/v1/admin/orders/" + orderId + "/actions",
                root.token(), Map.of("action", "DISPATCH")).status());
        assertEquals(4, stock(product.productId()));

        assertEquals(200, action(root, orderId, "MARK_DELIVERY_FAILED").status());
        assertEquals(4, stock(product.productId()));
        assertEquals(0, movementCount(orderId, "RETURN_RESTOCK"));

        assertEquals(200, action(root, orderId, "RETRY_DELIVERY").status());
        assertEquals(4, stock(product.productId()));
        assertEquals(0, movementCount(orderId, "RETURN_RESTOCK"));

        assertEquals(200, action(root, orderId, "MARK_DELIVERY_FAILED").status());
        assertEquals(200, action(root, orderId, "CANCEL").status());
        assertEquals(5, stock(product.productId()));
        assertEquals(1, movementCount(orderId, "ORDER_CANCEL_REVERSAL"));
        assertEquals(0, movementCount(orderId, "RETURN_RESTOCK"));
        assertEquals(409, action(root, orderId, "CANCEL").status());
    }
}
