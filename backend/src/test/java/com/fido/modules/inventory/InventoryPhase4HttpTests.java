package com.fido.modules.inventory;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
class InventoryPhase4HttpTests {

    static final String PASSWORD = "Test-password-123";

    @LocalServerPort
    int port;

    @Autowired
    ObjectMapper json;

    @Autowired
    JdbcTemplate db;

    final HttpClient client = HttpClient.newHttpClient();

    final List<Long> accounts = new ArrayList<>();
    final List<Long> customRoles = new ArrayList<>();
    final Set<Long> createdPermissions = new HashSet<>();
    final List<Long> suppliers = new ArrayList<>();
    final List<Long> receipts = new ArrayList<>();
    final List<CatalogFixture> catalog = new ArrayList<>();

    record Result(
            int status,
            JsonNode data,
            String body
    ) {
    }

    record Employee(
            long id,
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
        var request = HttpRequest.newBuilder(
                        URI.create("http://localhost:" + port + path)
                )
                .header("Accept", "application/json")
                .header("Content-Type", "application/json");

        if (token != null) {
            request.header(
                    "Authorization",
                    "Bearer " + token
            );
        }

        request.method(
                method,
                body == null
                        ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(
                                json.writeValueAsString(body)
                        )
        );

        var response = client.send(
                request.build(),
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

    String phone() {
        return "07"
                + UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        .substring(0, 16);
    }

    long register(String phone) throws Exception {
        var response = call(
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
                response.status,
                response.body
        );

        long accountId = response.data
                .get("data")
                .get("account_id")
                .asLong();

        accounts.add(accountId);

        return accountId;
    }

    String login(String phone) throws Exception {
        var response = call(
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
                response.status,
                response.body
        );

        return response.data
                .get("data")
                .get("access_token")
                .asText();
    }

    void grantRole(
            long accountId,
            String roleCode
    ) {
        db.update(
                """
                INSERT INTO account_roles
                SELECT ?, role_id
                FROM roles
                WHERE code = ?
                """,
                accountId,
                roleCode
        );
    }

    long ensurePermission(String code) {
        var existing = db.query(
                "SELECT permission_id FROM permissions WHERE code=?",
                (resultSet, rowNumber) -> resultSet.getLong(1),
                code
        );

        if (!existing.isEmpty()) {
            return existing.get(0);
        }

        db.update(
                "INSERT INTO permissions(code,name) VALUES (?,?)",
                code,
                code
        );

        long permissionId = db.queryForObject(
                "SELECT permission_id FROM permissions WHERE code=?",
                Long.class,
                code
        );

        createdPermissions.add(permissionId);

        return permissionId;
    }

    long capabilityRole(long permissionId) {
        String code = "inventory-test-" + UUID.randomUUID();

        db.update(
                "INSERT INTO roles(code,name) VALUES (?,?)",
                code,
                "Inventory test"
        );

        long roleId = db.queryForObject(
                "SELECT role_id FROM roles WHERE code=?",
                Long.class,
                code
        );

        customRoles.add(roleId);

        db.update(
                """
                INSERT INTO role_permissions(role_id,permission_id)
                VALUES (?,?)
                """,
                roleId,
                permissionId
        );

        return roleId;
    }

    Employee employee(long roleId) throws Exception {
        String phone = phone();
        long accountId = register(phone);

        grantRole(
                accountId,
                "ADMIN"
        );

        db.update(
                """
                INSERT INTO account_roles(account_id,role_id)
                VALUES (?,?)
                """,
                accountId,
                roleId
        );

        return new Employee(
                accountId,
                login(phone)
        );
    }

    Employee plainAdmin() throws Exception {
        String phone = phone();
        long accountId = register(phone);

        grantRole(
                accountId,
                "ADMIN"
        );

        return new Employee(
                accountId,
                login(phone)
        );
    }

    CatalogFixture createVariant() {
        String suffix = UUID.randomUUID()
                .toString()
                .replace("-", "");

        String categoryName = "Inventory category " + suffix;
        String sizeSystemCode = "INV-SZ-" + suffix.substring(0, 12);
        String colorCode = "INV-C-" + suffix.substring(0, 12);
        String productName = "Inventory product " + suffix;
        String sku = "INV-SKU-" + suffix;

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
                "Inventory size"
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
                VALUES (?,?,?,?)
                """,
                sizeSystemId,
                "M",
                "Medium",
                1
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
                "Inventory color"
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
                    description,
                    gender,
                    season,
                    style,
                    material_care,
                    base_price,
                    sale_status,
                    created_at,
                    updated_at
                )
                VALUES (?,NULL,?,?,NULL,NULL,NULL,NULL,NULL,100000,'ON_SALE',
                        CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """,
                categoryId,
                sizeSystemId,
                productName
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
                VALUES (?,?,?,?,NULL,'ON_SALE',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """,
                productId,
                sizeValueId,
                colorId,
                sku
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
                VALUES (?,0,CURRENT_TIMESTAMP)
                """,
                variantId
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

        catalog.add(fixture);

        return fixture;
    }

    long createSupplier(
            String token,
            String status
    ) throws Exception {
        var response = call(
                "POST",
                "/api/v1/admin/suppliers",
                token,
                Map.of(
                        "name", "Supplier " + UUID.randomUUID(),
                        "usage_status", status
                )
        );

        assertEquals(
                201,
                response.status,
                response.body
        );

        long supplierId = response.data
                .get("data")
                .get("supplier_id")
                .asLong();

        suppliers.add(supplierId);

        return supplierId;
    }

    long createReceipt(
            String token,
            long supplierId,
            long variantId,
            int quantity
    ) throws Exception {
        var response = call(
                "POST",
                "/api/v1/admin/goods-receipts",
                token,
                Map.of(
                        "supplier_id", supplierId,
                        "receipt_date", LocalDate.now().toString(),
                        "items", List.of(
                                Map.of(
                                        "variant_id", variantId,
                                        "quantity", quantity
                                )
                        )
                )
        );

        assertEquals(
                201,
                response.status,
                response.body
        );

        long receiptId = response.data
                .get("data")
                .get("receipt_id")
                .asLong();

        receipts.add(receiptId);

        return receiptId;
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

    @AfterEach
    void clean() {
        for (Long accountId : accounts) {
            db.update(
                    "DELETE FROM audit_logs WHERE actor_account_id=?",
                    accountId
            );

            db.update(
                    "DELETE FROM inventory_transactions WHERE actor_account_id=?",
                    accountId
            );
        }

        for (Long receiptId : receipts) {
            db.update(
                    "DELETE FROM inventory_transactions WHERE goods_receipt_id=?",
                    receiptId
            );

            db.update(
                    "DELETE FROM goods_receipt_items WHERE receipt_id=?",
                    receiptId
            );

            db.update(
                    "DELETE FROM goods_receipts WHERE receipt_id=?",
                    receiptId
            );
        }

        for (Long supplierId : suppliers) {
            db.update(
                    "DELETE FROM suppliers WHERE supplier_id=?",
                    supplierId
            );
        }

        for (CatalogFixture fixture : catalog) {
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
        }

        for (Long roleId : customRoles) {
            db.update(
                    "DELETE FROM role_permissions WHERE role_id=?",
                    roleId
            );

            db.update(
                    "DELETE FROM roles WHERE role_id=?",
                    roleId
            );
        }

        for (Long permissionId : createdPermissions) {
            db.update(
                    "DELETE FROM permissions WHERE permission_id=?",
                    permissionId
            );
        }

        for (Long accountId : accounts) {
            db.update(
                    "DELETE FROM accounts WHERE account_id=?",
                    accountId
            );
        }
    }

    @Test
    void phase4InventoryAndReceivingVerticalSlice() throws Exception {
        long readPermission = ensurePermission("INVENTORY_READ");
        long writePermission = ensurePermission("INVENTORY_WRITE");

        Employee reader = employee(
                capabilityRole(readPermission)
        );

        Employee writer = employee(
                capabilityRole(writePermission)
        );

        Employee plainAdmin = plainAdmin();

        CatalogFixture fixture = createVariant();

        assertEquals(
                403,
                call(
                        "GET",
                        "/api/v1/admin/inventory",
                        plainAdmin.token(),
                        null
                ).status
        );

        assertEquals(
                403,
                call(
                        "GET",
                        "/api/v1/admin/inventory",
                        writer.token(),
                        null
                ).status
        );

        assertEquals(
                403,
                call(
                        "POST",
                        "/api/v1/admin/suppliers",
                        reader.token(),
                        Map.of(
                                "name", "Denied",
                                "usage_status", "ACTIVE"
                        )
                ).status
        );

        long supplierId = createSupplier(
                writer.token(),
                "ACTIVE"
        );

        assertEquals(
                200,
                call(
                        "GET",
                        "/api/v1/admin/suppliers/" + supplierId,
                        reader.token(),
                        null
                ).status
        );

        var supplierPage = call(
                "GET",
                "/api/v1/admin/suppliers?q=Supplier&usage_status=ACTIVE",
                reader.token(),
                null
        );

        assertEquals(
                200,
                supplierPage.status,
                supplierPage.body
        );

        assertTrue(
                supplierPage.data
                        .get("meta")
                        .get("total")
                        .asInt() >= 1
        );

        long receiptId = createReceipt(
                writer.token(),
                supplierId,
                fixture.variantId(),
                3
        );

        assertEquals(
                0,
                stock(fixture.variantId())
        );

        var receiptDetail = call(
                "GET",
                "/api/v1/admin/goods-receipts/" + receiptId,
                reader.token(),
                null
        );

        assertEquals(
                200,
                receiptDetail.status
        );

        assertEquals(
                "DRAFT",
                receiptDetail.data
                        .get("data")
                        .get("receipt_status")
                        .asText()
        );

        assertTrue(
                receiptDetail.data
                        .get("data")
                        .get("receipt_code")
                        .asText()
                        .startsWith("GR-")
        );

        assertEquals(
                200,
                call(
                        "PATCH",
                        "/api/v1/admin/goods-receipts/" + receiptId,
                        writer.token(),
                        Map.of(
                                "note", "quantity updated",
                                "items", List.of(
                                        Map.of(
                                                "variant_id",
                                                fixture.variantId(),
                                                "quantity",
                                                5
                                        )
                                )
                        )
                ).status
        );

        assertEquals(
                0,
                stock(fixture.variantId())
        );

        var confirmed = call(
                "POST",
                "/api/v1/admin/goods-receipts/"
                        + receiptId
                        + "/actions",
                writer.token(),
                Map.of("action", "CONFIRM")
        );

        assertEquals(
                200,
                confirmed.status,
                confirmed.body
        );

        assertEquals(
                "CONFIRMED",
                confirmed.data
                        .get("data")
                        .get("receipt_status")
                        .asText()
        );

        assertEquals(
                writer.id(),
                confirmed.data
                        .get("data")
                        .get("confirmed_by_account_id")
                        .asLong()
        );

        assertEquals(
                5,
                stock(fixture.variantId())
        );

        assertEquals(
                200,
                call(
                        "POST",
                        "/api/v1/admin/goods-receipts/"
                                + receiptId
                                + "/actions",
                        writer.token(),
                        Map.of("action", "CONFIRM")
                ).status
        );

        assertEquals(
                5,
                stock(fixture.variantId())
        );

        assertEquals(
                1,
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM inventory_transactions
                        WHERE goods_receipt_id=?
                          AND transaction_type='RECEIPT_IN'
                        """,
                        Integer.class,
                        receiptId
                )
        );

        assertEquals(
                409,
                call(
                        "PATCH",
                        "/api/v1/admin/goods-receipts/" + receiptId,
                        writer.token(),
                        Map.of("note", "must not mutate")
                ).status
        );

        var receiptPage = call(
                "GET",
                "/api/v1/admin/goods-receipts?receipt_status=CONFIRMED",
                reader.token(),
                null
        );

        assertEquals(
                200,
                receiptPage.status
        );

        assertTrue(
                receiptPage.data
                        .get("meta")
                        .get("total")
                        .asInt() >= 1
        );

        String inventoryPath =
                "/api/v1/admin/inventory"
                        + "?variant_id=" + fixture.variantId()
                        + "&sku=" + fixture.sku()
                        + "&product_id=" + fixture.productId()
                        + "&size_value_id=" + fixture.sizeValueId()
                        + "&color_id=" + fixture.colorId();

        var inventory = call(
                "GET",
                inventoryPath,
                reader.token(),
                null
        );

        assertEquals(
                200,
                inventory.status,
                inventory.body
        );

        assertEquals(
                1,
                inventory.data
                        .get("meta")
                        .get("total")
                        .asInt()
        );

        assertEquals(
                5,
                inventory.data
                        .get("data")
                        .get(0)
                        .get("available_quantity")
                        .asInt()
        );

        var increase = call(
                "POST",
                "/api/v1/admin/inventory/adjustments",
                writer.token(),
                Map.of(
                        "variant_id", fixture.variantId(),
                        "quantity_delta", 2,
                        "reason", "Cycle count correction"
                )
        );

        assertEquals(
                201,
                increase.status,
                increase.body
        );

        assertEquals(
                "ADJUSTMENT_IN",
                increase.data
                        .get("data")
                        .get("transaction_type")
                        .asText()
        );

        assertEquals(
                7,
                stock(fixture.variantId())
        );

        var decrease = call(
                "POST",
                "/api/v1/admin/inventory/adjustments",
                writer.token(),
                Map.of(
                        "variant_id", fixture.variantId(),
                        "quantity_delta", -3,
                        "reason", "Damaged stock"
                )
        );

        assertEquals(
                201,
                decrease.status,
                decrease.body
        );

        assertEquals(
                "ADJUSTMENT_OUT",
                decrease.data
                        .get("data")
                        .get("transaction_type")
                        .asText()
        );

        assertEquals(
                "Damaged stock",
                decrease.data
                        .get("data")
                        .get("reason")
                        .asText()
        );

        assertEquals(
                4,
                stock(fixture.variantId())
        );

        int movementCountBeforeFailure = db.queryForObject(
                """
                SELECT COUNT(*)
                FROM inventory_transactions
                WHERE variant_id=?
                """,
                Integer.class,
                fixture.variantId()
        );

        assertEquals(
                409,
                call(
                        "POST",
                        "/api/v1/admin/inventory/adjustments",
                        writer.token(),
                        Map.of(
                                "variant_id", fixture.variantId(),
                                "quantity_delta", -5,
                                "reason", "Would become negative"
                        )
                ).status
        );

        assertEquals(
                4,
                stock(fixture.variantId())
        );

        assertEquals(
                movementCountBeforeFailure,
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM inventory_transactions
                        WHERE variant_id=?
                        """,
                        Integer.class,
                        fixture.variantId()
                )
        );

        assertEquals(
                400,
                call(
                        "POST",
                        "/api/v1/admin/inventory/adjustments",
                        writer.token(),
                        Map.of(
                                "variant_id", fixture.variantId(),
                                "quantity_delta", 0,
                                "reason", "No movement"
                        )
                ).status
        );

        var movementPage = call(
                "GET",
                "/api/v1/admin/inventory/transactions"
                        + "?variant_id=" + fixture.variantId()
                        + "&transaction_type=ADJUSTMENT_OUT",
                reader.token(),
                null
        );

        assertEquals(
                200,
                movementPage.status
        );

        assertEquals(
                1,
                movementPage.data
                        .get("meta")
                        .get("total")
                        .asInt()
        );

        var inactivePatch = new HashMap<String, Object>();
        inactivePatch.put("usage_status", "INACTIVE");
        inactivePatch.put("phone", null);
        inactivePatch.put("note", "Historical supplier only");

        assertEquals(
                200,
                call(
                        "PATCH",
                        "/api/v1/admin/suppliers/" + supplierId,
                        writer.token(),
                        inactivePatch
                ).status
        );

        assertEquals(
                409,
                call(
                        "POST",
                        "/api/v1/admin/goods-receipts",
                        writer.token(),
                        Map.of(
                                "supplier_id", supplierId,
                                "receipt_date", LocalDate.now().toString(),
                                "items", List.of(
                                        Map.of(
                                                "variant_id",
                                                fixture.variantId(),
                                                "quantity",
                                                1
                                        )
                                )
                        )
                ).status
        );

        assertEquals(
                200,
                call(
                        "GET",
                        "/api/v1/admin/goods-receipts/" + receiptId,
                        reader.token(),
                        null
                ).status
        );

        assertEquals(
                200,
                call(
                        "PATCH",
                        "/api/v1/admin/suppliers/" + supplierId,
                        writer.token(),
                        Map.of("usage_status", "ACTIVE")
                ).status
        );

        long cancelledReceiptId = createReceipt(
                writer.token(),
                supplierId,
                fixture.variantId(),
                2
        );

        assertEquals(
                200,
                call(
                        "POST",
                        "/api/v1/admin/goods-receipts/"
                                + cancelledReceiptId
                                + "/actions",
                        writer.token(),
                        Map.of("action", "CANCEL")
                ).status
        );

        assertEquals(
                4,
                stock(fixture.variantId())
        );

        assertEquals(
                200,
                call(
                        "POST",
                        "/api/v1/admin/goods-receipts/"
                                + cancelledReceiptId
                                + "/actions",
                        writer.token(),
                        Map.of("action", "CANCEL")
                ).status
        );

        assertEquals(
                409,
                call(
                        "PATCH",
                        "/api/v1/admin/goods-receipts/" + cancelledReceiptId,
                        writer.token(),
                        Map.of("note", "cannot edit cancelled")
                ).status
        );

        var executor = Executors.newFixedThreadPool(2);

        try {
            var gate = new CountDownLatch(1);

            Callable<Result> task = () -> {
                gate.await();

                return call(
                        "POST",
                        "/api/v1/admin/inventory/adjustments",
                        writer.token(),
                        Map.of(
                                "variant_id", fixture.variantId(),
                                "quantity_delta", -3,
                                "reason", "Concurrent adjustment"
                        )
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
                    List.of(201, 409),
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

        assertTrue(
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM audit_logs
                        WHERE actor_account_id=?
                          AND (
                              action LIKE 'GOODS_RECEIPT_%'
                              OR action='INVENTORY_ADJUST'
                          )
                        """,
                        Integer.class,
                        writer.id()
                ) >= 5
        );
    }
}
