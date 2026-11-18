package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditWriteService;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.util.AopTestUtils;

import java.util.Map;
import java.util.UUID;

class OrderActionTransactionHttpTests extends OrderHttpSupport {
    @MockitoSpyBean AuditWriteService auditWriter;

    @ParameterizedTest
    @ValueSource(strings = {"COLLECT", "REFUND"})
    void paymentAuditFailureRollsBackAllWorkflowFactsBeforeRetry(String operation)
            throws Exception {
        User customer = user();
        User root = superadmin();
        CatalogFixture product = createVariant(5, 100000, null);
        long orderId = createOrder(customer, product, 2);
        assertEquals(200, action(root, orderId, "CONFIRM").status());
        assertEquals(200, action(root, orderId, "START_PREPARING").status());
        assertEquals(200, action(root, orderId, "DISPATCH").status());
        String basePath = "/api/v1/admin/orders/" + orderId;
        boolean refund = operation.equals("REFUND");
        if (refund) {
            assertEquals(
                    200,
                    call(
                                    "POST",
                                    basePath + "/payment-actions",
                                    root.token(),
                                    Map.of("action", "COMPLETE_DELIVERY_AND_COLLECT_COD"))
                            .status());
        }
        String path = basePath + (refund ? "/after-sales" : "/payment-actions");
        Map<String, String> command =
                refund
                        ? Map.of("action", "RETURN_AND_REFUND_FULL", "reason", "Accepted return")
                        : Map.of("action", "COMPLETE_DELIVERY_AND_COLLECT_COD");
        var orderBefore =
                db.queryForMap("SELECT status, updated_at FROM orders WHERE id=?", orderId);
        var paymentBefore = db.queryForMap("SELECT * FROM payments WHERE order_id=?", orderId);
        int auditsBefore = db.queryForObject("SELECT COUNT(*) FROM audit_logs", Integer.class);
        int ledgerBefore =
                db.queryForObject(
                        "SELECT COUNT(*) FROM inventory_transactions WHERE product_id=?",
                        Integer.class,
                        product.productId());
        AuditWriteService target = AopTestUtils.getUltimateTargetObject(auditWriter);
        AuditAction failureAction =
                refund ? AuditAction.ORDER_REFUND : AuditAction.ORDER_COD_COLLECT;
        try {
            doThrow(new IllegalStateException("Injected payment audit failure"))
                    .when(target)
                    .record(argThat(event -> event.action() == failureAction));
            var failed = call("POST", path, root.token(), command);
            assertEquals(500, failed.status(), failed.body());
            assertEquals(
                    orderBefore,
                    db.queryForMap("SELECT status, updated_at FROM orders WHERE id=?", orderId));
            assertEquals(
                    paymentBefore,
                    db.queryForMap("SELECT * FROM payments WHERE order_id=?", orderId));
            assertEquals(
                    auditsBefore,
                    db.queryForObject("SELECT COUNT(*) FROM audit_logs", Integer.class));
            reset(target);
            var retry = call("POST", path, root.token(), command);
            assertEquals(200, retry.status(), retry.body());
            assertEquals(409, call("POST", path, root.token(), command).status());
            assertEquals(
                    auditsBefore + 2,
                    db.queryForObject("SELECT COUNT(*) FROM audit_logs", Integer.class));
            assertEquals(3, stock(product.productId()));
            assertEquals(
                    ledgerBefore,
                    db.queryForObject(
                            "SELECT COUNT(*) FROM inventory_transactions WHERE product_id=?",
                            Integer.class,
                            product.productId()));
        } finally {
            reset(target);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"CONFIRM", "CANCEL"})
    void auditFailureRollsBackStateStockLedgerAndVoucherBeforeSuccessfulRetry(String command)
            throws Exception {
        User customer = user();
        User root = superadmin();
        CatalogFixture product = createVariant(5, 100000, null);
        String code = "REFAC-" + UUID.randomUUID();
        db.update(
                "INSERT INTO vouchers(code,discount_type,discount_value,status) VALUES"
                        + " (?,'FIXED',1000,'ACTIVE')",
                code);
        Long voucherId =
                db.queryForObject("SELECT id FROM vouchers WHERE code=?", Long.class, code);
        Long orderId = null;
        AuditWriteService target = AopTestUtils.getUltimateTargetObject(auditWriter);
        try {
            assertEquals(
                    200,
                    call(
                                    "POST",
                                    "/api/v1/cart/items",
                                    customer.token(),
                                    Map.of("product_id", product.productId(), "quantity", 2))
                            .status());
            var created =
                    call(
                            "POST",
                            "/api/v1/orders",
                            customer.token(),
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
                                    "Test address",
                                    "voucher_code",
                                    code));
            assertEquals(201, created.status(), created.body());
            orderId = created.data().get("data").get("order_id").asLong();
            orderIds.add(orderId);
            boolean cancel = command.equals("CANCEL");
            if (cancel) assertEquals(200, action(root, orderId, "CONFIRM").status());
            int quantityBefore = stock(product.productId());
            Integer versionBefore =
                    db.queryForObject(
                            "SELECT version FROM inventories WHERE product_id=?",
                            Integer.class,
                            product.productId());
            Integer ledgerBefore =
                    db.queryForObject(
                            "SELECT COUNT(*) FROM inventory_transactions WHERE product_id=?",
                            Integer.class,
                            product.productId());
            Integer auditsBefore =
                    db.queryForObject("SELECT COUNT(*) FROM audit_logs", Integer.class);
            AuditAction auditAction = cancel ? AuditAction.ORDER_CANCEL : AuditAction.ORDER_CONFIRM;
            doThrow(new IllegalStateException("Injected order audit failure"))
                    .when(target)
                    .record(argThat(event -> event.action() == auditAction));
            var failed = action(root, orderId, command);
            assertEquals(500, failed.status(), failed.body());
            assertEquals(
                    cancel ? "CONFIRMED" : "PENDING",
                    db.queryForObject(
                            "SELECT status FROM orders WHERE id=?", String.class, orderId));
            assertEquals(quantityBefore, stock(product.productId()));
            assertEquals(
                    versionBefore,
                    db.queryForObject(
                            "SELECT version FROM inventories WHERE product_id=?",
                            Integer.class,
                            product.productId()));
            assertEquals(
                    ledgerBefore,
                    db.queryForObject(
                            "SELECT COUNT(*) FROM inventory_transactions WHERE product_id=?",
                            Integer.class,
                            product.productId()));
            assertEquals(
                    1,
                    db.queryForObject(
                            "SELECT usage_count FROM vouchers WHERE id=?",
                            Integer.class,
                            voucherId));
            assertEquals(
                    auditsBefore,
                    db.queryForObject("SELECT COUNT(*) FROM audit_logs", Integer.class));
            reset(target);
            assertEquals(200, action(root, orderId, command).status());
            assertEquals(409, action(root, orderId, command).status());
            assertEquals(cancel ? 5 : 3, stock(product.productId()));
            assertEquals(
                    versionBefore + 1,
                    db.queryForObject(
                            "SELECT version FROM inventories WHERE product_id=?",
                            Integer.class,
                            product.productId()));
            assertEquals(
                    ledgerBefore + 1,
                    db.queryForObject(
                            "SELECT COUNT(*) FROM inventory_transactions WHERE product_id=?",
                            Integer.class,
                            product.productId()));
            assertEquals(
                    cancel ? 0 : 1,
                    db.queryForObject(
                            "SELECT usage_count FROM vouchers WHERE id=?",
                            Integer.class,
                            voucherId));
        } finally {
            reset(target);
            if (orderId != null) {
                db.update("UPDATE orders SET voucher_id=NULL WHERE id=?", orderId);
                db.update("DELETE FROM order_voucher_snapshots WHERE order_id=?", orderId);
            }
            db.update("DELETE FROM vouchers WHERE id=?", voucherId);
        }
    }
}
