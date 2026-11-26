package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fido.modules.audit.service.*;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.util.*;
import java.util.concurrent.*;

class OperationalCompletionHttpTests extends OrderHttpSupport {
    @MockitoBean AccountMailService mail;
    @MockitoSpyBean AuditWriteService audit;
    private static final Map<String, Object> CHECKOUT =
            Map.of(
                    "recipient_name",
                    "Test Recipient",
                    "recipient_phone",
                    "0900000000",
                    "province",
                    "Hanoi",
                    "district",
                    "Cau Giay",
                    "ward",
                    "Dich Vong",
                    "address_line",
                    "Test address");

    @AfterEach
    void removeNewFacts() {
        for (long id : orderIds) {
            db.update(
                    "DELETE FROM order_return_receipt_items WHERE return_receipt_id IN (SELECT id FROM order_return_receipts WHERE order_id=?)",
                    id);
            db.update("DELETE FROM order_return_receipts WHERE order_id=?", id);
        }
        for (long id : accounts)
            db.update("DELETE FROM account_recovery_tokens WHERE account_id=?", id);
    }

    @Test
    void changedQuoteCannotCommitUntilFreshConsent() throws Exception {
        var customer = user();
        var product = createVariant(5, 100000, null);
        assertEquals(
                200,
                call(
                                "POST",
                                "/api/v1/cart/items",
                                customer.token(),
                                Map.of("product_id", product.productId(), "quantity", 1))
                        .status());
        var accepted = withConsent(customer.token(), CHECKOUT);
        db.update("UPDATE products SET selling_price=120000 WHERE id=?", product.productId());
        var rejected = call("POST", "/api/v1/orders", customer.token(), accepted);
        assertEquals(409, rejected.status(), rejected.body());
        assertEquals("CHECKOUT_RECONFIRMATION_REQUIRED", rejected.data().get("code").asText());
        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM orders WHERE account_id=?",
                        Integer.class,
                        customer.accountId()));
        assertEquals(
                1,
                call("GET", "/api/v1/cart", customer.token(), null)
                        .data()
                        .get("data")
                        .get("items")
                        .size());
        var created = call("POST", "/api/v1/orders", customer.token(), CHECKOUT);
        assertEquals(201, created.status(), created.body());
        orderIds.add(created.data().get("data").get("order_id").asLong());
        assertEquals(150000, created.data().get("data").get("total").asInt());
        assertEquals(5, stock(product.productId()));
    }

    @Test
    void unavailableAndDeletedLinesRemainReadableAndRemovable() throws Exception {
        var customer = user();
        var good = createVariant(4, 100000, null);
        var inactive = createVariant(4, 200000, null);
        var deleted = createVariant(4, 300000, null);
        for (var product : List.of(good, inactive, deleted))
            assertEquals(
                    200,
                    call(
                                    "POST",
                                    "/api/v1/cart/items",
                                    customer.token(),
                                    Map.of("product_id", product.productId(), "quantity", 1))
                            .status());
        db.update("UPDATE products SET status='INACTIVE' WHERE id=?", inactive.productId());
        db.update(
                "UPDATE products SET deleted_at=CURRENT_TIMESTAMP WHERE id=?", deleted.productId());
        var cart = call("GET", "/api/v1/cart", customer.token(), null);
        assertEquals(200, cart.status(), cart.body());
        assertEquals(3, cart.data().get("data").get("items").size());
        assertEquals(100000, cart.data().get("data").get("subtotal").asInt());
        for (var line : cart.data().get("data").get("items"))
            if (line.get("product_id").asLong() != good.productId()) {
                assertFalse(line.get("purchasable").asBoolean());
                assertEquals("PRODUCT_NOT_AVAILABLE", line.get("unavailable_reason").asText());
                assertEquals(
                        200,
                        call(
                                        "DELETE",
                                        "/api/v1/cart/items/" + line.get("cart_item_id").asLong(),
                                        customer.token(),
                                        null)
                                .status());
            }
        var created = call("POST", "/api/v1/orders", customer.token(), CHECKOUT);
        assertEquals(201, created.status(), created.body());
        orderIds.add(created.data().get("data").get("order_id").asLong());
    }

    @Test
    void inactiveCategoryBlocksNewPurchasesWhileOldObligationsRemainManageable() throws Exception {
        var customer = user();
        var root = superadmin();
        var product = createVariant(5, 100000, null);
        assertEquals(
                409,
                call("DELETE", "/api/v1/admin/products/" + product.productId(), root.token(), null)
                        .status());
        long order = createOrder(customer, product, 2);
        assertEquals(
                200,
                call(
                                "PATCH",
                                "/api/v1/admin/categories/" + product.categoryId(),
                                root.token(),
                                Map.of("status", "INACTIVE"))
                        .status());
        assertEquals(
                404,
                call("GET", "/api/v1/catalog/products/" + product.productId(), null, null)
                        .status());
        var adminMetadata = call("GET", "/api/v1/admin/catalog/meta", root.token(), null);
        assertEquals(200, adminMetadata.status(), adminMetadata.body());
        assertTrue(
                java.util.stream.StreamSupport.stream(
                                adminMetadata.data().get("data").get("categories").spliterator(),
                                false)
                        .anyMatch(
                                c ->
                                        c.get("category_id").asLong() == product.categoryId()
                                                && "INACTIVE".equals(c.get("status").asText())));
        var publicMetadata = call("GET", "/api/v1/catalog/meta", null, null);
        assertFalse(
                java.util.stream.StreamSupport.stream(
                                publicMetadata.data().get("data").get("categories").spliterator(),
                                false)
                        .anyMatch(c -> c.get("category_id").asLong() == product.categoryId()));
        assertEquals(
                409,
                call(
                                "POST",
                                "/api/v1/cart/items",
                                customer.token(),
                                Map.of("product_id", product.productId(), "quantity", 1))
                        .status());
        assertEquals(200, action(root, order, "CONFIRM").status());
        assertEquals(3, stock(product.productId()));
        assertEquals(200, action(root, order, "CANCEL").status());
        assertEquals(5, stock(product.productId()));
        db.update(
                "UPDATE products SET deleted_at=CURRENT_TIMESTAMP WHERE id=?", product.productId());
        var adjustment =
                call(
                        "POST",
                        "/api/v1/admin/inventory/adjustments",
                        root.token(),
                        Map.of(
                                "product_id",
                                product.productId(),
                                "quantity_delta",
                                -1,
                                "reason_code",
                                "DAMAGE",
                                "source_operation_id",
                                UUID.randomUUID().toString()));
        assertEquals(201, adjustment.status(), adjustment.body());
        assertEquals(4, stock(product.productId()));
    }

    @Test
    void stoppingSalesPreservesOpenOrdersAndRetiredSourceCanStillReceiveReturns() throws Exception {
        var root = superadmin();
        var customer = user();
        var product = createVariant(2, 100000, null);
        long order = createOrder(customer, product, 2);
        String productPath = "/api/v1/admin/products/" + product.productId();
        assertEquals(
                200,
                call("PATCH", productPath, root.token(), Map.of("status", "INACTIVE")).status());
        var stocked = call("DELETE", productPath, root.token(), null);
        assertEquals(409, stocked.status(), stocked.body());
        assertEquals("PRODUCT_HAS_STOCK", stocked.data().get("code").asText());
        assertEquals(200, action(root, order, "CONFIRM").status());
        assertEquals(0, stock(product.productId()));
        var processing = call("DELETE", productPath, root.token(), null);
        assertEquals(409, processing.status(), processing.body());
        assertEquals("PRODUCT_HAS_OPEN_ORDERS", processing.data().get("code").asText());
        for (String action :
                List.of("START_PREPARING", "DISPATCH", "MARK_DELIVERY_FAILED", "CANCEL"))
            assertEquals(200, action(root, order, action).status());
        assertEquals(0, stock(product.productId()));
        assertEquals(204, call("DELETE", productPath, root.token(), null).status());
        long item =
                db.queryForObject("SELECT id FROM order_items WHERE order_id=?", Long.class, order);
        var received =
                call(
                        "POST",
                        "/api/v1/admin/orders/" + order + "/return-receipts",
                        root.token(),
                        physical(item, 2, 2, UUID.randomUUID().toString()));
        assertEquals(200, received.status(), received.body());
        assertEquals(2, stock(product.productId()));
        assertEquals(
                200, call("GET", "/api/v1/me/orders/" + order, customer.token(), null).status());
        assertEquals(
                404,
                call("GET", "/api/v1/catalog/products/" + product.productId(), null, null)
                        .status());
    }

    long failedCancelled(User root, User customer, CatalogFixture product) throws Exception {
        long order = createOrder(customer, product, 2);
        for (String action :
                List.of("CONFIRM", "START_PREPARING", "DISPATCH", "MARK_DELIVERY_FAILED", "CANCEL"))
            assertEquals(200, action(root, order, action).status());
        return order;
    }

    Map<String, Object> physical(long item, int received, int sellable, String key) {
        return Map.of(
                "source_operation_id",
                key,
                "reason",
                "Đã kiểm tra hàng thực tế",
                "items",
                List.of(
                        Map.of(
                                "order_item_id",
                                item,
                                "received_quantity",
                                received,
                                "sellable_quantity",
                                sellable)));
    }

    @Test
    void physicalReceiptRestocksOnlySellableGoodsAndDeduplicates() throws Exception {
        var root = superadmin();
        var customer = user();
        var product = createVariant(5, 100000, null);
        long order = failedCancelled(root, customer, product);
        assertEquals(3, stock(product.productId()));
        assertEquals(0, movementCount(order, "ORDER_CANCEL_REVERSAL"));
        long item =
                db.queryForObject("SELECT id FROM order_items WHERE order_id=?", Long.class, order);
        String path = "/api/v1/admin/orders/" + order + "/return-receipts";
        var request = physical(item, 2, 1, UUID.randomUUID().toString());
        assertEquals(403, call("POST", path, customer.token(), request).status());
        var first = call("POST", path, root.token(), request);
        assertEquals(200, first.status(), first.body());
        assertEquals(4, stock(product.productId()));
        assertEquals(1, movementCount(order, "RETURN_RESTOCK"));
        assertEquals(200, call("POST", path, root.token(), request).status());
        assertEquals(
                409,
                call("POST", path, root.token(), physical(item, 1, 1, UUID.randomUUID().toString()))
                        .status());
        assertEquals(4, stock(product.productId()));
        var history = call("GET", "/api/v1/admin/orders/" + order + "/history", root.token(), null);
        assertEquals(200, history.status());
        assertTrue(history.body().contains("P3.16 test reason"));
        assertTrue(history.body().contains("actor_account_id"));
    }

    @Test
    void receiptAuditFailureRollsBackFactsBalanceLedgerAndVersion() throws Exception {
        var root = superadmin();
        var customer = user();
        var product = createVariant(5, 100000, null);
        long order = failedCancelled(root, customer, product);
        long item =
                db.queryForObject("SELECT id FROM order_items WHERE order_id=?", Long.class, order);
        int version =
                db.queryForObject(
                        "SELECT version FROM inventories WHERE product_id=?",
                        Integer.class,
                        product.productId());
        doThrow(new IllegalStateException("injected audit failure"))
                .when(
                        (AuditWriteService)
                                org.springframework.test.util.AopTestUtils.getUltimateTargetObject(
                                        audit))
                .record(
                        argThat(
                                e ->
                                        e != null
                                                && e.action()
                                                        == AuditAction.ORDER_DELIVERY_RETURN_IN));
        assertEquals(
                500,
                call(
                                "POST",
                                "/api/v1/admin/orders/" + order + "/return-receipts",
                                root.token(),
                                physical(item, 2, 2, UUID.randomUUID().toString()))
                        .status());
        assertEquals(3, stock(product.productId()));
        assertEquals(0, movementCount(order, "RETURN_RESTOCK"));
        assertEquals(
                version,
                db.queryForObject(
                        "SELECT version FROM inventories WHERE product_id=?",
                        Integer.class,
                        product.productId()));
        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM order_return_receipts WHERE order_id=?",
                        Integer.class,
                        order));
    }

    @Test
    void racingPhysicalReceiptsCannotReceiveRemainingUnitsTwice() throws Exception {
        var root = superadmin();
        var customer = user();
        var product = createVariant(5, 100000, null);
        long order = failedCancelled(root, customer, product);
        long item =
                db.queryForObject("SELECT id FROM order_items WHERE order_id=?", Long.class, order);
        String path = "/api/v1/admin/orders/" + order + "/return-receipts";
        var executor = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);
        try {
            var a =
                    executor.submit(
                            () -> {
                                start.await();
                                return call(
                                                "POST",
                                                path,
                                                root.token(),
                                                physical(item, 2, 2, UUID.randomUUID().toString()))
                                        .status();
                            });
            var c =
                    executor.submit(
                            () -> {
                                start.await();
                                return call(
                                                "POST",
                                                path,
                                                root.token(),
                                                physical(item, 2, 2, UUID.randomUUID().toString()))
                                        .status();
                            });
            start.countDown();
            assertEquals(
                    List.of(200, 409),
                    java.util.stream.Stream.of(
                                    a.get(30, TimeUnit.SECONDS), c.get(30, TimeUnit.SECONDS))
                            .sorted()
                            .toList());
            assertEquals(5, stock(product.productId()));
            assertEquals(1, movementCount(order, "RETURN_RESTOCK"));
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void passwordChangeRequiresCurrentPasswordAndRevokesOldTokens() throws Exception {
        var customer = user();
        String phone =
                db.queryForObject(
                        "SELECT phone FROM accounts WHERE id=?",
                        String.class,
                        customer.accountId());
        assertEquals(
                400,
                call(
                                "POST",
                                "/api/v1/me/password",
                                customer.token(),
                                Map.of(
                                        "current_password",
                                        "incorrect",
                                        "new_password",
                                        "New-password-456"))
                        .status());
        assertEquals(200, call("GET", "/api/v1/me", customer.token(), null).status());
        assertEquals(
                204,
                call(
                                "POST",
                                "/api/v1/me/password",
                                customer.token(),
                                Map.of(
                                        "current_password",
                                        PASSWORD,
                                        "new_password",
                                        "New-password-456"))
                        .status());
        assertEquals(401, call("GET", "/api/v1/me", customer.token(), null).status());
        assertEquals(
                401,
                call(
                                "POST",
                                "/api/v1/auth/login",
                                null,
                                Map.of("phone", phone, "password", PASSWORD))
                        .status());
        assertEquals(
                200,
                call(
                                "POST",
                                "/api/v1/auth/login",
                                null,
                                Map.of("phone", phone, "password", "New-password-456"))
                        .status());
    }

    @Test
    void recoveryRequiresVerifiedEmailWithHashedSingleUseCapabilities() throws Exception {
        var customer = user();
        String email = "recovery-" + UUID.randomUUID() + "@example.test";
        assertEquals(
                200,
                call("PATCH", "/api/v1/me", customer.token(), Map.of("email", email)).status());
        assertEquals(
                202,
                call("POST", "/api/v1/auth/password-reset/request", null, Map.of("email", email))
                        .status());
        verify(mail, never()).sendLink(anyString(), eq("PASSWORD_RESET"), anyString());
        assertEquals(
                202,
                call("POST", "/api/v1/me/email/verification", customer.token(), null).status());
        var verification = ArgumentCaptor.forClass(String.class);
        verify(mail).sendLink(eq(email), eq("EMAIL_VERIFY"), verification.capture());
        assertEquals(
                204,
                call(
                                "POST",
                                "/api/v1/auth/email/verify",
                                null,
                                Map.of("token", verification.getValue()))
                        .status());
        assertEquals(
                400,
                call(
                                "POST",
                                "/api/v1/auth/email/verify",
                                null,
                                Map.of("token", verification.getValue()))
                        .status());
        assertEquals(
                202,
                call("POST", "/api/v1/auth/password-reset/request", null, Map.of("email", email))
                        .status());
        var resetToken = ArgumentCaptor.forClass(String.class);
        verify(mail).sendLink(eq(email), eq("PASSWORD_RESET"), resetToken.capture());
        String stored =
                db.queryForObject(
                        "SELECT token_hash FROM account_recovery_tokens WHERE account_id=? AND purpose='PASSWORD_RESET'",
                        String.class,
                        customer.accountId());
        assertNotEquals(resetToken.getValue(), stored);
        assertEquals(64, stored.length());
        assertEquals(
                400,
                call(
                                "POST",
                                "/api/v1/auth/password-reset/confirm",
                                null,
                                Map.of(
                                        "token",
                                        "x".repeat(43),
                                        "new_password",
                                        "Recovered-password-1"))
                        .status());
        assertEquals(
                204,
                call(
                                "POST",
                                "/api/v1/auth/password-reset/confirm",
                                null,
                                Map.of(
                                        "token",
                                        resetToken.getValue(),
                                        "new_password",
                                        "Recovered-password-1"))
                        .status());
        assertEquals(401, call("GET", "/api/v1/me", customer.token(), null).status());
        assertEquals(
                400,
                call(
                                "POST",
                                "/api/v1/auth/password-reset/confirm",
                                null,
                                Map.of(
                                        "token",
                                        resetToken.getValue(),
                                        "new_password",
                                        "Recovered-password-2"))
                        .status());
    }

    @Test
    void lockingCustomerPreservesOrdersAndUnlockDoesNotReviveOldTokens() throws Exception {
        var root = superadmin();
        var customer = user();
        var product = createVariant(5, 100000, null);
        long order = createOrder(customer, product, 1);
        String path = "/api/v1/admin/customers/" + customer.accountId() + "/status";
        assertEquals(
                403,
                call(
                                "PATCH",
                                path,
                                customer.token(),
                                Map.of("status", "LOCKED", "reason", "vi phạm"))
                        .status());
        assertEquals(
                200,
                call("PATCH", path, root.token(), Map.of("status", "LOCKED", "reason", "Đối chiếu"))
                        .status());
        assertEquals(401, call("GET", "/api/v1/me", customer.token(), null).status());
        assertEquals(
                200,
                call(
                                "PATCH",
                                path,
                                root.token(),
                                Map.of("status", "ACTIVE", "reason", "Đã đối chiếu"))
                        .status());
        assertEquals(401, call("GET", "/api/v1/me", customer.token(), null).status());
        assertEquals(
                1,
                db.queryForObject("SELECT COUNT(*) FROM orders WHERE id=?", Integer.class, order));
        assertEquals(
                409,
                call(
                                "PATCH",
                                "/api/v1/admin/customers/" + root.accountId() + "/status",
                                root.token(),
                                Map.of("status", "LOCKED", "reason", "Không khóa quản trị ở đây"))
                        .status());
    }

    @Test
    void changedEmailAndExpiredRecoveryLinkCannotTakeOverAnAccount() throws Exception {
        var customer = user();
        String email = "expiry-" + UUID.randomUUID() + "@example.test";
        assertEquals(
                200,
                call("PATCH", "/api/v1/me", customer.token(), Map.of("email", email)).status());
        assertEquals(
                202,
                call("POST", "/api/v1/me/email/verification", customer.token(), null).status());
        var verification = ArgumentCaptor.forClass(String.class);
        verify(mail).sendLink(eq(email), eq("EMAIL_VERIFY"), verification.capture());
        assertEquals(
                200,
                call("PATCH", "/api/v1/me", customer.token(), Map.of("email", "changed-" + email))
                        .status());
        assertEquals(
                400,
                call(
                                "POST",
                                "/api/v1/auth/email/verify",
                                null,
                                Map.of("token", verification.getValue()))
                        .status());
        db.update(
                "UPDATE accounts SET email=?,email_verified_at=CURRENT_TIMESTAMP WHERE id=?",
                email,
                customer.accountId());
        assertEquals(
                202,
                call("POST", "/api/v1/auth/password-reset/request", null, Map.of("email", email))
                        .status());
        var token = ArgumentCaptor.forClass(String.class);
        verify(mail).sendLink(eq(email), eq("PASSWORD_RESET"), token.capture());
        db.update(
                "UPDATE account_recovery_tokens SET created_at=DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 2 HOUR),expires_at=DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 1 MINUTE) WHERE account_id=? AND purpose='PASSWORD_RESET'",
                customer.accountId());
        assertEquals(
                400,
                call(
                                "POST",
                                "/api/v1/auth/password-reset/confirm",
                                null,
                                Map.of(
                                        "token",
                                        token.getValue(),
                                        "new_password",
                                        "Must-not-apply-456"))
                        .status());
        assertEquals(200, call("GET", "/api/v1/me", customer.token(), null).status());
    }
}
