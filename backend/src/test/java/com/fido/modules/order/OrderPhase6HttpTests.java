package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT
)
@ActiveProfiles("test")
class OrderPhase6HttpTests {

    static final String PASSWORD = "Test-password-123";

    @LocalServerPort
    int port;

    @Autowired
    ObjectMapper json;

    @Autowired
    JdbcTemplate db;

    final HttpClient client = HttpClient.newHttpClient();

    final List<Long> accounts = new ArrayList<>();
    final List<Long> orderIds = new ArrayList<>();
    final List<CatalogFixture> fixtures = new ArrayList<>();

    record Result(
            int status,
            JsonNode data,
            String body
    ) {
    }

    record User(
            long accountId,
            String token
    ) {
    }

    record CatalogFixture(
            long categoryId,
            long sizeSystemId,
            long sizeValueId,
            long colorId,
            long productId,
            long variantId,
            String sku
    ) {
    }

    Result call(
            String method,
            String path,
            String token,
            Object body
    ) throws Exception {
        var builder = HttpRequest.newBuilder(
                        URI.create("http://localhost:" + port + path)
                )
                .header("Accept", "application/json")
                .header("Content-Type", "application/json");

        if (token != null) {
            builder.header(
                    "Authorization",
                    "Bearer " + token
            );
        }

        builder.method(
                method,
                body == null
                        ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(
                                json.writeValueAsString(body)
                        )
        );

        var response = client.send(
                builder.build(),
                HttpResponse.BodyHandlers.ofString()
        );

        return new Result(
                response.statusCode(),
                response.body().isBlank()
                        ? null
                        : json.readTree(response.body()),
                response.body()
        );
    }

    User user() throws Exception {
        String phone = "04"
                + UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        .substring(0, 16);

        var register = call(
                "POST",
                "/api/v1/auth/register",
                null,
                Map.of(
                        "phone", phone,
                        "password", PASSWORD
                )
        );

        assertEquals(
                201,
                register.status(),
                register.body()
        );

        long accountId = register.data()
                .get("data")
                .get("account_id")
                .asLong();

        accounts.add(accountId);

        var login = call(
                "POST",
                "/api/v1/auth/login",
                null,
                Map.of(
                        "identifier", phone,
                        "password", PASSWORD
                )
        );

        assertEquals(
                200,
                login.status(),
                login.body()
        );

        return new User(
                accountId,
                login.data()
                        .get("data")
                        .get("access_token")
                        .asText()
        );
    }

    User superadmin() throws Exception {
        User user = user();

        db.update(
                """
                INSERT INTO account_roles
                SELECT ?, role_id
                FROM roles
                WHERE code='SUPERADMIN'
                """,
                user.accountId()
        );

        return user;
    }

    User plainAdmin() throws Exception {
        User user = user();

        db.update(
                """
                INSERT INTO account_roles
                SELECT ?, role_id
                FROM roles
                WHERE code='ADMIN'
                """,
                user.accountId()
        );

        return user;
    }

    CatalogFixture createVariant(
            int availableQuantity,
            int basePrice,
            Integer overridePrice
    ) {
        String suffix = UUID.randomUUID()
                .toString()
                .replace("-", "");

        String categoryName = "Order category " + suffix;
        String sizeSystemCode =
                "ORD-SZ-" + suffix.substring(0, 10);
        String colorCode =
                "ORD-C-" + suffix.substring(0, 10);
        String productName = "Order product " + suffix;
        String sku = "ORD-SKU-" + suffix;

        db.update(
                "INSERT INTO categories(parent_category_id,name) VALUES (NULL,?)",
                categoryName
        );

        long categoryId = db.queryForObject(
                "SELECT category_id FROM categories WHERE name=?",
                Long.class,
                categoryName
        );

        db.update(
                "INSERT INTO size_systems(code,name) VALUES (?,?)",
                sizeSystemCode,
                "Order size"
        );

        long sizeSystemId = db.queryForObject(
                "SELECT size_system_id FROM size_systems WHERE code=?",
                Long.class,
                sizeSystemCode
        );

        db.update(
                """
                INSERT INTO size_values(
                    size_system_id,
                    code,
                    display_name,
                    sort_order
                )
                VALUES (?,'M','Medium',1)
                """,
                sizeSystemId
        );

        long sizeValueId = db.queryForObject(
                """
                SELECT size_value_id
                FROM size_values
                WHERE size_system_id=?
                  AND code='M'
                """,
                Long.class,
                sizeSystemId
        );

        db.update(
                "INSERT INTO colors(code,name) VALUES (?,?)",
                colorCode,
                "Green"
        );

        long colorId = db.queryForObject(
                "SELECT color_id FROM colors WHERE code=?",
                Long.class,
                colorCode
        );

        db.update(
                """
                INSERT INTO products(
                    category_id,
                    brand_id,
                    size_system_id,
                    name,
                    base_price,
                    sale_status,
                    created_at,
                    updated_at
                )
                VALUES (?,NULL,?,?,?,'ON_SALE',
                        CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """,
                categoryId,
                sizeSystemId,
                productName,
                basePrice
        );

        long productId = db.queryForObject(
                "SELECT product_id FROM products WHERE name=?",
                Long.class,
                productName
        );

        db.update(
                """
                INSERT INTO product_variants(
                    product_id,
                    size_value_id,
                    color_id,
                    sku,
                    override_price,
                    sale_status,
                    created_at,
                    updated_at
                )
                VALUES (?,?,?,?,?,'ON_SALE',
                        CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """,
                productId,
                sizeValueId,
                colorId,
                sku,
                overridePrice
        );

        long variantId = db.queryForObject(
                "SELECT variant_id FROM product_variants WHERE sku=?",
                Long.class,
                sku
        );

        db.update(
                """
                INSERT INTO inventories(
                    variant_id,
                    available_quantity,
                    updated_at
                )
                VALUES (?,?,CURRENT_TIMESTAMP)
                """,
                variantId,
                availableQuantity
        );

        CatalogFixture fixture = new CatalogFixture(
                categoryId,
                sizeSystemId,
                sizeValueId,
                colorId,
                productId,
                variantId,
                sku
        );

        fixtures.add(fixture);

        return fixture;
    }

    long createOrder(
            User customer,
            CatalogFixture fixture,
            int quantity
    ) throws Exception {
        var added = call(
                "POST",
                "/api/v1/cart/items",
                customer.token(),
                Map.of(
                        "variant_id", fixture.variantId(),
                        "quantity", quantity
                )
        );

        assertEquals(
                200,
                added.status(),
                added.body()
        );

        var created = call(
                "POST",
                "/api/v1/orders",
                customer.token(),
                Map.of(
                        "recipient_phone", "0900000000",
                        "recipient_email", "customer@example.test",
                        "recipient_address", "Cau Giay, Hanoi"
                )
        );

        assertEquals(
                201,
                created.status(),
                created.body()
        );

        long orderId = created.data()
                .get("data")
                .get("order_id")
                .asLong();

        orderIds.add(orderId);

        call(
                "DELETE",
                "/api/v1/cart",
                customer.token(),
                null
        );

        return orderId;
    }

    Result action(
            User operator,
            long orderId,
            String action
    ) throws Exception {
        return call(
                "POST",
                "/api/v1/admin/orders/"
                        + orderId
                        + "/actions",
                operator.token(),
                Map.of("action", action)
        );
    }

    int stock(long variantId) {
        return db.queryForObject(
                """
                SELECT available_quantity
                FROM inventories
                WHERE variant_id=?
                """,
                Integer.class,
                variantId
        );
    }

    int movementCount(
            long orderId,
            String type
    ) {
        return db.queryForObject(
                """
                SELECT COUNT(*)
                FROM inventory_transactions
                WHERE order_id=?
                  AND transaction_type=?
                """,
                Integer.class,
                orderId,
                type
        );
    }

    @AfterEach
    void clean() {
        for (Long orderId : orderIds) {
            db.update(
                    "DELETE FROM inventory_transactions WHERE order_id=?",
                    orderId
            );

            db.update(
                    "DELETE FROM shipping_infos WHERE order_id=?",
                    orderId
            );

            db.update(
                    "DELETE FROM payments WHERE order_id=?",
                    orderId
            );

            db.update(
                    "DELETE FROM order_items WHERE order_id=?",
                    orderId
            );

            db.update(
                    "DELETE FROM orders WHERE order_id=?",
                    orderId
            );
        }

        for (Long accountId : accounts) {
            db.update(
                    "DELETE FROM audit_logs WHERE actor_account_id=?",
                    accountId
            );

            db.update(
                    """
                    DELETE FROM cart_items
                    WHERE cart_id IN (
                        SELECT cart_id
                        FROM carts
                        WHERE account_id=?
                    )
                    """,
                    accountId
            );

            db.update(
                    "DELETE FROM carts WHERE account_id=?",
                    accountId
            );
        }

        for (CatalogFixture fixture : fixtures) {
            db.update(
                    "DELETE FROM inventory_transactions WHERE variant_id=?",
                    fixture.variantId()
            );

            db.update(
                    "DELETE FROM inventories WHERE variant_id=?",
                    fixture.variantId()
            );

            db.update(
                    "DELETE FROM product_variants WHERE variant_id=?",
                    fixture.variantId()
            );

            db.update(
                    "DELETE FROM products WHERE product_id=?",
                    fixture.productId()
            );

            db.update(
                    "DELETE FROM colors WHERE color_id=?",
                    fixture.colorId()
            );

            db.update(
                    "DELETE FROM size_values WHERE size_value_id=?",
                    fixture.sizeValueId()
            );

            db.update(
                    "DELETE FROM size_systems WHERE size_system_id=?",
                    fixture.sizeSystemId()
            );

            db.update(
                    "DELETE FROM categories WHERE category_id=?",
                    fixture.categoryId()
            );
        }

        for (Long accountId : accounts) {
            db.update(
                    "DELETE FROM account_roles WHERE account_id=?",
                    accountId
            );

            db.update(
                    "DELETE FROM addresses WHERE account_id=?",
                    accountId
            );

            db.update(
                    "DELETE FROM accounts WHERE account_id=?",
                    accountId
            );
        }
    }

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

    @Test
    void concurrentConfirmDeductsStockExactlyOnce()
            throws Exception {
        User customer = user();
        User root = superadmin();

        CatalogFixture fixture = createVariant(
                2,
                100000,
                null
        );

        long orderId = createOrder(
                customer,
                fixture,
                1
        );

        var executor = Executors.newFixedThreadPool(2);

        try {
            var gate = new CountDownLatch(1);

            Callable<Result> task = () -> {
                gate.await();

                return action(
                        root,
                        orderId,
                        "CONFIRM"
                );
            };

            var first = executor.submit(task);
            var second = executor.submit(task);

            gate.countDown();

            var results = List.of(
                    first.get(30, TimeUnit.SECONDS),
                    second.get(30, TimeUnit.SECONDS)
            );

            assertEquals(
                    List.of(200, 200),
                    results.stream()
                            .map(Result::status)
                            .sorted()
                            .toList()
            );
        } finally {
            executor.shutdownNow();
        }

        assertEquals(
                1,
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
                "CONFIRMED",
                db.queryForObject(
                        """
                        SELECT order_status
                        FROM orders
                        WHERE order_id=?
                        """,
                        String.class,
                        orderId
                )
        );
    }

}
