package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
abstract class OrderHttpSupport {
    static final String PASSWORD = "Test-password-123";
    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate db;

    final HttpClient client = HttpClient.newHttpClient();
    final List<Long> accounts = new ArrayList<>();
    final List<Long> orderIds = new ArrayList<>();
    final List<CatalogFixture> fixtures = new ArrayList<>();
    final List<Long> customRoles = new ArrayList<>();
    final List<Long> createdPermissions = new ArrayList<>();
    Long warehouseId;

    record Result(int status, JsonNode data, String body) {}
    record User(long accountId, String token) {}
    record CatalogFixture(long categoryId, long productId, long warehouseId, String sku) {}

    Result call(String method, String path, String token, Object body) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Accept", "application/json")
                .header("Content-Type", "application/json");
        if (token != null) builder.header("Authorization", "Bearer " + token);
        if ("POST".equalsIgnoreCase(method) && "/api/v1/orders".equals(path)) {
            builder.header("Idempotency-Key", "test-" + UUID.randomUUID());
        }
        builder.method(method, body == null
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        var response = client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        return new Result(response.statusCode(),
                response.body().isBlank() ? null : json.readTree(response.body()), response.body());
    }

    User user() throws Exception {
        String phone = "+84" + java.util.concurrent.ThreadLocalRandom.current()
                .nextLong(100_000_000L, 1_000_000_000L);
        var register = call("POST", "/api/v1/auth/register", null,
                Map.of("phone", phone, "full_name", "Order Test Account", "password", PASSWORD));
        assertEquals(201, register.status(), register.body());
        long accountId = register.data().get("data").get("account").get("id").asLong();
        accounts.add(accountId);
        var login = call("POST", "/api/v1/auth/login", null,
                Map.of("phone", phone, "password", PASSWORD));
        assertEquals(200, login.status(), login.body());
        return new User(accountId, login.data().get("data").get("access_token").asText());
    }

    User superadmin() throws Exception {
        User user = user();
        db.update("INSERT INTO account_roles SELECT ?, id FROM roles WHERE code='SUPERADMIN'",
                user.accountId());
        return user;
    }

    User plainAdmin() throws Exception {
        User user = user();
        db.update("INSERT INTO account_roles SELECT ?, id FROM roles WHERE code='ADMIN'",
                user.accountId());
        return user;
    }

    User employeeWithPermission(String permissionCode) throws Exception {
        User user = plainAdmin();
        long permissionId = ensurePermission(permissionCode);
        String roleCode = "order-test-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        db.update("INSERT INTO roles(code,name) VALUES (?,?)", roleCode, "Order authorization test");
        long roleId = db.queryForObject("SELECT id FROM roles WHERE code=?", Long.class, roleCode);
        customRoles.add(roleId);
        db.update("INSERT INTO account_roles(account_id,role_id) VALUES (?,?)", user.accountId(), roleId);
        db.update("INSERT INTO role_permissions(role_id,permission_id) VALUES (?,?)", roleId, permissionId);
        return user;
    }

    private long ensurePermission(String code) {
        var existing = db.query("SELECT id FROM permissions WHERE code=?",
                (rs, row) -> rs.getLong(1), code);
        if (!existing.isEmpty()) return existing.get(0);
        db.update("INSERT INTO permissions(code,name) VALUES (?,?)", code, code);
        long id = db.queryForObject("SELECT id FROM permissions WHERE code=?", Long.class, code);
        createdPermissions.add(id);
        return id;
    }

    CatalogFixture createVariant(int quantityOnHand, int basePrice, Integer overridePrice) {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        String categorySlug = "order-" + suffix;
        String sku = "ORD-SKU-" + suffix;
        db.update("INSERT INTO categories(parent_category_id,name,slug,status) VALUES (NULL,?,?, 'ACTIVE')",
                "Order category " + suffix, categorySlug);
        long categoryId = db.queryForObject("SELECT id FROM categories WHERE slug=?", Long.class, categorySlug);
        db.update("""
                INSERT INTO products(category_id,name,slug,sku,selling_price,status)
                VALUES (?,?,?,?,?,'ACTIVE')
                """, categoryId, "Order product " + suffix, "order-product-" + suffix, sku,
                overridePrice == null ? basePrice : overridePrice);
        long productId = db.queryForObject("SELECT id FROM products WHERE sku=?", Long.class, sku);
        long resolvedWarehouse = warehouseId();
        db.update("INSERT INTO inventories(warehouse_id,product_id,quantity_on_hand,version) VALUES (?,?,?,0)",
                resolvedWarehouse, productId, quantityOnHand);
        var fixture = new CatalogFixture(categoryId, productId, resolvedWarehouse, sku);
        fixtures.add(fixture);
        return fixture;
    }

    private long warehouseId() {
        if (warehouseId != null) return warehouseId;
        warehouseId = db.queryForObject(
                "SELECT id FROM warehouses WHERE status='ACTIVE' ORDER BY id LIMIT 1",
                Long.class);
        return warehouseId;
    }

    long createOrder(User customer, CatalogFixture fixture, int quantity) throws Exception {
        var added = call("POST", "/api/v1/cart/items", customer.token(),
                Map.of("product_id", fixture.productId(), "quantity", quantity));
        assertEquals(200, added.status(), added.body());
        var created = call("POST", "/api/v1/orders", customer.token(),
                Map.of("recipient_name", "Test Recipient", "recipient_phone", "0900000000",
                        "province", "Hanoi", "district", "Cau Giay", "ward", "Dich Vong",
                        "address_line", "Test address"));
        assertEquals(201, created.status(), created.body());
        long orderId = created.data().get("data").get("order_id").asLong();
        orderIds.add(orderId);
        return orderId;
    }

    Result action(User operator, long orderId, String action) throws Exception {
        Object body = "CANCEL".equals(action) || "MARK_DELIVERY_FAILED".equals(action)
                ? Map.of("action", action, "reason", "P3.16 test reason")
                : Map.of("action", action);
        return call("POST", "/api/v1/admin/orders/" + orderId + "/actions", operator.token(), body);
    }

    int stock(long productId) {
        return db.queryForObject("SELECT quantity_on_hand FROM inventories WHERE product_id=?",
                Integer.class, productId);
    }

    int movementCount(long orderId, String type) {
        return db.queryForObject("""
                SELECT COUNT(*)
                FROM inventory_transactions tx
                JOIN order_items oi ON oi.id=tx.order_item_id
                WHERE oi.order_id=? AND tx.transaction_type=?
                """, Integer.class, orderId, type);
    }

    @AfterEach
    void clean() {
        for (Long orderId : orderIds) {
            db.update("""
                    DELETE FROM inventory_transactions
                    WHERE reverses_transaction_id IN
                      (SELECT id FROM (SELECT tx.id FROM inventory_transactions tx
                       JOIN order_items oi ON oi.id=tx.order_item_id WHERE oi.order_id=?) source_tx)
                    """, orderId);
            db.update("DELETE FROM inventory_transactions WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=?)",
                    orderId);
            db.update("DELETE FROM order_voucher_snapshots WHERE order_id=?", orderId);
            db.update("DELETE FROM order_addresses WHERE order_id=?", orderId);
            db.update("DELETE FROM payments WHERE order_id=?", orderId);
            db.update("DELETE FROM shipping_infos WHERE order_id=?", orderId);
            db.update("DELETE FROM order_items WHERE order_id=?", orderId);
            db.update("DELETE FROM orders WHERE id=?", orderId);
        }
        for (Long accountId : accounts) {
            db.update("DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE account_id=?)", accountId);
            db.update("DELETE FROM carts WHERE account_id=?", accountId);
        }
        for (CatalogFixture fixture : fixtures) {
            db.update("DELETE FROM inventory_transactions WHERE reverses_transaction_id IN " +
                    "(SELECT id FROM (SELECT id FROM inventory_transactions WHERE product_id=?) source_tx)",
                    fixture.productId());
            db.update("DELETE FROM inventory_transactions WHERE product_id=?", fixture.productId());
            db.update("DELETE FROM product_attribute_values WHERE product_id=?", fixture.productId());
            db.update("DELETE FROM product_images WHERE product_id=?", fixture.productId());
            db.update("DELETE FROM inventories WHERE product_id=?", fixture.productId());
            db.update("DELETE FROM products WHERE id=?", fixture.productId());
            db.update("DELETE FROM categories WHERE id=?", fixture.categoryId());
        }
        for (Long accountId : accounts) {
            db.update("DELETE FROM audit_logs WHERE actor_account_id=?", accountId);
            db.update("DELETE FROM account_roles WHERE account_id=?", accountId);
            db.update("DELETE FROM addresses WHERE account_id=?", accountId);
            db.update("DELETE FROM accounts WHERE id=?", accountId);
        }
        for (Long roleId : customRoles) {
            db.update("DELETE FROM role_permissions WHERE role_id=?", roleId);
            db.update("DELETE FROM roles WHERE id=?", roleId);
        }
        for (Long permissionId : createdPermissions) db.update("DELETE FROM permissions WHERE id=?", permissionId);
    }
}
