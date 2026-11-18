package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditWriteService;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.util.AopTestUtils;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

class CustomerOrderCancellationHttpTests extends OrderHttpSupport {
    @MockitoSpyBean AuditWriteService auditWriter;

    private String cancelPath(long id) {
        return "/api/v1/me/orders/" + id + "/cancel";
    }

    private Result cancel(User user, long id) throws Exception {
        return call("POST", cancelPath(id), user.token(), null);
    }

    private String voucher() {
        String code = "SELF-CANCEL-" + UUID.randomUUID();
        db.update(
                "INSERT INTO vouchers(code,discount_type,discount_value,usage_limit,status) VALUES (?,'FIXED',1000,1,'ACTIVE')",
                code);
        voucherIds.add(db.queryForObject("SELECT id FROM vouchers WHERE code=?", Long.class, code));
        return code;
    }

    private int uses(String code) {
        return db.queryForObject(
                "SELECT usage_count FROM vouchers WHERE code=?", Integer.class, code);
    }

    private int cancellations(long id) {
        return db.queryForObject(
                "SELECT COUNT(*) FROM audit_logs WHERE entity_type='ORDER' AND entity_id=? AND action='ORDER_CANCEL'",
                Integer.class,
                Long.toString(id));
    }

    private void assertNoStockMovement(long id, CatalogFixture product) {
        assertEquals(5, stock(product.productId()));
        assertEquals(0, movementCount(id, "ORDER"));
        assertEquals(0, movementCount(id, "ORDER_CANCEL_REVERSAL"));
    }

    @Test
    void ownerCancelsPendingOrderOnceAndRetainsMoneyAndSnapshots() throws Exception {
        User customer = user();
        var product = createVariant(5, 100000, null);
        String code = voucher();
        long id = createOrder(customer, product, 1, code);
        var before =
                call("GET", "/api/v1/me/orders/" + id, customer.token(), null).data().get("data");
        assertEquals("[\"CANCEL\"]", before.get("allowed_actions").toString());
        assertEquals(1, uses(code));
        var cancelled = cancel(customer, id);
        assertEquals(200, cancelled.status(), cancelled.body());
        var data = cancelled.data().get("data");
        assertEquals("CANCELLED", data.get("order_status").asText());
        assertEquals("UNPAID", data.get("payment").get("payment_status").asText());
        assertEquals(0, data.get("allowed_actions").size());
        assertFalse(data.has("customer_account_id"));
        for (String field :
                List.of(
                        "items",
                        "recipient",
                        "subtotal",
                        "discount",
                        "shipping_fee",
                        "total",
                        "created_at")) {
            assertEquals(before.get(field), data.get(field), field);
        }
        assertEquals(0, uses(code));
        assertEquals(1, cancellations(id));
        assertEquals(
                customer.accountId(),
                db.queryForObject(
                        "SELECT actor_account_id FROM audit_logs WHERE entity_type='ORDER' AND entity_id=? AND action='ORDER_CANCEL'",
                        Long.class,
                        Long.toString(id)));
        assertNoStockMovement(id, product);
        assertEquals(409, cancel(customer, id).status());
        assertEquals(0, uses(code));
        assertEquals(1, cancellations(id));
        assertNoStockMovement(id, product);
        var list = call("GET", "/api/v1/me/orders?order_status=CANCELLED", customer.token(), null);
        assertEquals(id, list.data().get("data").get(0).get("order_id").asLong());
        assertEquals(403, action(customer, id, "CONFIRM").status());
    }

    @Test
    void authenticationAndOwnershipCannotBeBypassedByBodyOrAdminRole() throws Exception {
        User customer = user(), other = user(), root = superadmin();
        var product = createVariant(5, 100000, null);
        long id = createOrder(customer, product, 1);
        assertEquals(401, call("POST", cancelPath(id), null, null).status());
        assertEquals(
                404,
                call(
                                "POST",
                                cancelPath(id),
                                other.token(),
                                Map.of("account_id", customer.accountId(), "action", "CANCEL"))
                        .status());
        assertEquals(404, cancel(root, id).status());
        assertEquals(404, cancel(customer, Long.MAX_VALUE).status());
        assertEquals(
                "PENDING",
                db.queryForObject("SELECT status FROM orders WHERE id=?", String.class, id));
        assertEquals(0, cancellations(id));
        assertNoStockMovement(id, product);
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "CONFIRMED",
                "PREPARING",
                "SHIPPING",
                "DELIVERY_FAILED",
                "COMPLETED",
                "CANCELLED",
                "RETURNED"
            })
    void customerCannotCancelAnyNonPendingState(String status) throws Exception {
        User customer = user();
        var product = createVariant(5, 100000, null);
        long id = createOrder(customer, product, 1);
        db.update("UPDATE orders SET status=? WHERE id=?", status, id);
        assertEquals(409, cancel(customer, id).status());
        assertEquals(
                status,
                db.queryForObject("SELECT status FROM orders WHERE id=?", String.class, id));
        var detail = call("GET", "/api/v1/me/orders/" + id, customer.token(), null);
        assertEquals(0, detail.data().get("data").get("allowed_actions").size());
        assertNoStockMovement(id, product);
        assertEquals(0, cancellations(id));
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "UPDATE payments SET payment_status='PAID' WHERE order_id=?",
                "UPDATE payments SET amount=amount+1 WHERE order_id=?",
                "UPDATE payments SET collected_at=CURRENT_TIMESTAMP(6) WHERE order_id=?"
            })
    void invalidPaymentFactsFailClosed(String mutation) throws Exception {
        User customer = user();
        var product = createVariant(5, 100000, null);
        long id = createOrder(customer, product, 1);
        db.update(mutation, id);
        var detail = call("GET", "/api/v1/me/orders/" + id, customer.token(), null);
        assertEquals(0, detail.data().get("data").get("allowed_actions").size());
        assertEquals(409, cancel(customer, id).status());
        assertEquals(
                "PENDING",
                db.queryForObject("SELECT status FROM orders WHERE id=?", String.class, id));
        assertNoStockMovement(id, product);
    }

    @Test
    void pendingOrderWithAnExistingDeductionCannotBeSelfCancelled() throws Exception {
        User customer = user(), root = superadmin();
        var product = createVariant(5, 100000, null);
        long id = createOrder(customer, product, 1);
        assertEquals(200, action(root, id, "CONFIRM").status());
        db.update("UPDATE orders SET status='PENDING' WHERE id=?", id);
        assertEquals(409, cancel(customer, id).status());
        assertEquals(4, stock(product.productId()));
        assertEquals(1, movementCount(id, "ORDER"));
        assertEquals(0, movementCount(id, "ORDER_CANCEL_REVERSAL"));
    }

    @Test
    void auditFailureRollsBackOrderShippingAndVoucherBeforeRetry() throws Exception {
        User customer = user();
        var product = createVariant(5, 100000, null);
        String code = voucher();
        long id = createOrder(customer, product, 1, code);
        AuditWriteService target = AopTestUtils.getUltimateTargetObject(auditWriter);
        try {
            doThrow(new IllegalStateException("forced cancellation audit failure"))
                    .when(target)
                    .record(argThat(event -> event.action() == AuditAction.ORDER_CANCEL));
            assertEquals(500, cancel(customer, id).status());
            assertEquals(
                    "PENDING",
                    db.queryForObject("SELECT status FROM orders WHERE id=?", String.class, id));
            assertEquals(1, uses(code));
            assertEquals(0, cancellations(id));
            assertNoStockMovement(id, product);
        } finally {
            reset(target);
        }
        assertEquals(200, cancel(customer, id).status());
        assertEquals(0, uses(code));
        assertEquals(1, cancellations(id));
    }

    private List<Result> race(Callable<Result> first, Callable<Result> second) throws Exception {
        var executor = Executors.newFixedThreadPool(2);
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        try {
            var futures =
                    List.of(first, second).stream()
                            .map(
                                    task ->
                                            executor.submit(
                                                    () -> {
                                                        ready.countDown();
                                                        assertTrue(
                                                                start.await(10, TimeUnit.SECONDS));
                                                        return task.call();
                                                    }))
                            .toList();
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            return List.of(
                    futures.get(0).get(30, TimeUnit.SECONDS),
                    futures.get(1).get(30, TimeUnit.SECONDS));
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void simultaneousCancellationsReleaseVoucherAndWriteAuditOnlyOnce() throws Exception {
        User customer = user();
        var product = createVariant(5, 100000, null);
        String code = voucher();
        long id = createOrder(customer, product, 1, code);
        var results = race(() -> cancel(customer, id), () -> cancel(customer, id));
        assertEquals(List.of(200, 409), results.stream().map(Result::status).sorted().toList());
        assertEquals(0, uses(code));
        assertEquals(1, cancellations(id));
        assertNoStockMovement(id, product);
    }

    @Test
    void cancellationRacingAdminConfirmationHasExactlyOneWinner() throws Exception {
        User customer = user(), root = superadmin();
        var product = createVariant(5, 100000, null);
        String code = voucher();
        long id = createOrder(customer, product, 1, code);
        var results = race(() -> cancel(customer, id), () -> action(root, id, "CONFIRM"));
        assertEquals(List.of(200, 409), results.stream().map(Result::status).sorted().toList());
        String state = db.queryForObject("SELECT status FROM orders WHERE id=?", String.class, id);
        if ("CANCELLED".equals(state)) {
            assertEquals(0, uses(code));
            assertEquals(1, cancellations(id));
            assertNoStockMovement(id, product);
        } else {
            assertEquals("CONFIRMED", state);
            assertEquals(1, uses(code));
            assertEquals(0, cancellations(id));
            assertEquals(4, stock(product.productId()));
            assertEquals(1, movementCount(id, "ORDER"));
            assertEquals(0, movementCount(id, "ORDER_CANCEL_REVERSAL"));
        }
    }
}
