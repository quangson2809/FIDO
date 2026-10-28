package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import java.util.Map;

class OrderLifecycleHttpTests extends OrderHttpSupport {
    @Test
    void orderLifecycleSnapshotsCodReturnAndOwnership() throws Exception {
        User customer = user();
        User otherCustomer = user();
        User root = superadmin();
        User admin = plainAdmin();
        CatalogFixture product = createVariant(5, 100000, 90000);

        assertEquals(401, call("POST", "/api/v1/orders", null, Map.of(
                "recipient_name", "Test Recipient", "recipient_phone", "0900000000",
                "province", "Hanoi", "district", "Cau Giay", "ward", "Dich Vong",
                "address_line", "Test address")).status());

        long orderId = createOrder(customer, product, 2);
        assertEquals(5, stock(product.productId()));
        assertEquals(0, movementCount(orderId, "ORDER"));

        var customerDetail = call("GET", "/api/v1/me/orders/" + orderId, customer.token(), null);
        assertEquals(200, customerDetail.status(), customerDetail.body());
        assertEquals("PENDING", customerDetail.data().get("data").get("order_status").asText());
        assertEquals("UNPAID", customerDetail.data().get("data").get("payment").get("payment_status").asText());
        assertEquals(90000, customerDetail.data().get("data").get("items").get(0).get("unit_price").asInt());
        assertEquals(product.sku(), customerDetail.data().get("data").get("items").get(0).get("sku").asText());
        assertEquals(210000, customerDetail.data().get("data").get("total").asInt());
        assertEquals(404, call("GET", "/api/v1/me/orders/" + orderId, otherCustomer.token(), null).status());

        db.update("UPDATE products SET selling_price=70000 WHERE id=?", product.productId());
        var snapshotAfterReprice = call("GET", "/api/v1/me/orders/" + orderId, customer.token(), null);
        assertEquals(90000, snapshotAfterReprice.data().get("data").get("items").get(0).get("unit_price").asInt());

        assertEquals(403, call("GET", "/api/v1/admin/orders/" + orderId, admin.token(), null).status());
        assertEquals(403, action(admin, orderId, "CONFIRM").status());

        var adminDetail = call("GET", "/api/v1/admin/orders/" + orderId, root.token(), null);
        assertEquals(200, adminDetail.status(), adminDetail.body());
        assertTrue(adminDetail.data().get("data").get("allowed_actions").toString().contains("CONFIRM"));
        String orderCode = adminDetail.data().get("data").get("order_code").asText();
        var adminList = call("GET", "/api/v1/admin/orders?order_code=" + orderCode
                + "&order_status=PENDING&payment_status=UNPAID", root.token(), null);
        assertEquals(200, adminList.status(), adminList.body());
        assertEquals(1, adminList.data().get("meta").get("total").asInt());

        assertEquals(200, action(root, orderId, "CONFIRM").status());
        assertEquals(3, stock(product.productId()));
        assertEquals(1, movementCount(orderId, "ORDER"));
        assertEquals(409, action(root, orderId, "CONFIRM").status());
        assertEquals(3, stock(product.productId()));
        assertEquals(200, action(root, orderId, "START_PREPARING").status());
        assertEquals(200, call("POST", "/api/v1/admin/orders/" + orderId + "/actions",
                root.token(), Map.of("action", "DISPATCH", "carrier_name", "FIDO",
                        "tracking_number", "TRACK-001")).status());

        var collected = call("POST", "/api/v1/admin/orders/" + orderId + "/payment-actions",
                root.token(), Map.of("action", "COMPLETE_DELIVERY_AND_COLLECT_COD"));
        assertEquals(200, collected.status(), collected.body());
        assertEquals("COMPLETED", collected.data().get("data").get("order_status").asText());
        assertEquals("PAID", collected.data().get("data").get("payment").get("payment_status").asText());
        assertEquals(210000, collected.data().get("data").get("payment").get("amount_received").asLong());
        assertEquals(409, call("POST", "/api/v1/admin/orders/" + orderId + "/payment-actions",
                root.token(), Map.of("action", "COMPLETE_DELIVERY_AND_COLLECT_COD")).status());

        var returned = call("POST", "/api/v1/admin/orders/" + orderId + "/after-sales",
                root.token(), Map.of("action", "RETURN_AND_REFUND_FULL", "reason", "Accepted at store"));
        assertEquals(200, returned.status(), returned.body());
        assertEquals("RETURNED", returned.data().get("data").get("order_status").asText());
        assertEquals("REFUNDED", returned.data().get("data").get("payment").get("payment_status").asText());
        assertEquals(210000, returned.data().get("data").get("payment").get("amount_refunded").asLong());
        assertEquals(3, stock(product.productId()));
        assertEquals(0, movementCount(orderId, "RETURN_RESTOCK"));
        assertEquals(409, call("POST", "/api/v1/admin/orders/" + orderId + "/after-sales",
                root.token(), Map.of("action", "RETURN_AND_REFUND_FULL", "reason", "repeat")).status());

        var customerList = call("GET", "/api/v1/me/orders?order_status=RETURNED", customer.token(), null);
        assertEquals(200, customerList.status(), customerList.body());
        assertEquals(1, customerList.data().get("meta").get("total").asInt());
    }
}
