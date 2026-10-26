package com.fido.modules.inventory;

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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
abstract class InventoryHttpSupport {

    static final String PASSWORD = "Test-password-123";

    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate db;

    final HttpClient client = HttpClient.newHttpClient();
    final List<Long> accounts = new ArrayList<>();
    final List<Long> customRoles = new ArrayList<>();
    final Set<Long> createdPermissions = new HashSet<>();
    final List<Long> suppliers = new ArrayList<>();
    final List<Long> receipts = new ArrayList<>();
    final List<CatalogFixture> catalog = new ArrayList<>();
    final List<Long> additionalProducts = new ArrayList<>();

    record Result(int status, JsonNode data, String body) {}
    record Employee(long id, String token) {}
    record CatalogFixture(long categoryId, long productId, long warehouseId, String sku) {}

    Result call(String method, String path, String token, Object body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Accept", "application/json")
                .header("Content-Type", "application/json");
        if (token != null) request.header("Authorization", "Bearer " + token);
        request.method(method, body == null
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        var response = client.send(request.build(), HttpResponse.BodyHandlers.ofString());
        return new Result(response.statusCode(),
                response.body().isBlank() ? null : json.readTree(response.body()), response.body());
    }

    String phone() {
        return "+84" + java.util.concurrent.ThreadLocalRandom.current()
                .nextLong(100_000_000L, 1_000_000_000L);
    }

    long register(String phone) throws Exception {
        var response = call("POST", "/api/v1/auth/register", null,
                Map.of("phone", phone, "full_name", "Inventory Test Account", "password", PASSWORD));
        assertEquals(201, response.status(), response.body());
        long accountId = response.data().get("data").get("account").get("id").asLong();
        accounts.add(accountId);
        return accountId;
    }

    String login(String phone) throws Exception {
        var response = call("POST", "/api/v1/auth/login", null,
                Map.of("phone", phone, "password", PASSWORD));
        assertEquals(200, response.status(), response.body());
        return response.data().get("data").get("access_token").asText();
    }

    void grantRole(long accountId, String roleCode) {
        db.update("INSERT INTO account_roles SELECT ?, id FROM roles WHERE code = ?", accountId, roleCode);
    }

    long ensurePermission(String code) {
        var existing = db.query("SELECT id FROM permissions WHERE code=?",
                (resultSet, rowNumber) -> resultSet.getLong(1), code);
        if (!existing.isEmpty()) return existing.get(0);
        db.update("INSERT INTO permissions(code,name) VALUES (?,?)", code, code);
        long permissionId = db.queryForObject(
                "SELECT id FROM permissions WHERE code=?", Long.class, code);
        createdPermissions.add(permissionId);
        return permissionId;
    }

    long capabilityRole(long permissionId) {
        String code = "inventory-test-" + UUID.randomUUID();
        db.update("INSERT INTO roles(code,name) VALUES (?,?)", code, "Inventory test");
        long roleId = db.queryForObject("SELECT id FROM roles WHERE code=?", Long.class, code);
        customRoles.add(roleId);
        db.update("INSERT INTO role_permissions(role_id,permission_id) VALUES (?,?)", roleId, permissionId);
        return roleId;
    }

    Employee employee(long roleId) throws Exception {
        String phone = phone();
        long accountId = register(phone);
        grantRole(accountId, "ADMIN");
        db.update("INSERT INTO account_roles(account_id,role_id) VALUES (?,?)", accountId, roleId);
        return new Employee(accountId, login(phone));
    }

    Employee plainAdmin() throws Exception {
        String phone = phone();
        long accountId = register(phone);
        grantRole(accountId, "ADMIN");
        return new Employee(accountId, login(phone));
    }

    CatalogFixture createProduct() {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        String categoryName = "Inventory category " + suffix;
        String categorySlug = "inventory-" + suffix;
        String productName = "Inventory product " + suffix;
        String sku = "INV-SKU-" + suffix;
        String warehouseCode = "INV-WH-" + suffix;

        db.update("INSERT INTO categories(name,slug) VALUES (?,?)", categoryName, categorySlug);
        long categoryId = db.queryForObject(
                "SELECT id FROM categories WHERE slug=?", Long.class, categorySlug);
        db.update(
                "INSERT INTO products(category_id,name,sku,selling_price,status) VALUES (?,?,?,100000,'ACTIVE')",
                categoryId, productName, sku);
        long productId = db.queryForObject("SELECT id FROM products WHERE sku=?", Long.class, sku);
        db.update("INSERT INTO warehouses(code,name,status) VALUES (?,?, 'ACTIVE')",
                warehouseCode, "Inventory warehouse " + suffix);
        long warehouseId = db.queryForObject(
                "SELECT id FROM warehouses WHERE code=?", Long.class, warehouseCode);
        db.update(
                "INSERT INTO inventories(warehouse_id,product_id,quantity_on_hand,version) VALUES (?,?,0,0)",
                warehouseId, productId);

        CatalogFixture fixture = new CatalogFixture(categoryId, productId, warehouseId, sku);
        catalog.add(fixture);
        return fixture;
    }

    long createSupplier(String token, String status) throws Exception {
        var response = call("POST", "/api/v1/admin/suppliers", token,
                Map.of("name", "Supplier " + UUID.randomUUID(), "usage_status", status));
        assertEquals(201, response.status(), response.body());
        long supplierId = response.data().get("data").get("supplier_id").asLong();
        suppliers.add(supplierId);
        return supplierId;
    }

    long createReceipt(String token, long supplierId, CatalogFixture fixture, int quantity)
            throws Exception {
        var response = call("POST", "/api/v1/admin/goods-receipts", token,
                Map.of(
                        "supplier_id", supplierId,
                        "items", List.of(Map.of(
                                "product_id", fixture.productId(),
                                "quantity_received", quantity,
                                "unit_cost", 0))));
        assertEquals(201, response.status(), response.body());
        long receiptId = response.data().get("data").get("receipt_id").asLong();
        receipts.add(receiptId);
        return receiptId;
    }

    long createSiblingProduct(CatalogFixture fixture) {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        db.update("INSERT INTO products(category_id,name,sku,selling_price,status) VALUES (?,?,?,100000,'ACTIVE')",
                fixture.categoryId(), "Inventory sibling " + suffix, "INV-SIB-" + suffix);
        long productId = db.queryForObject(
                "SELECT id FROM products WHERE sku=?", Long.class, "INV-SIB-" + suffix);
        db.update("INSERT INTO inventories(warehouse_id,product_id,quantity_on_hand,version) VALUES (?,?,0,0)",
                fixture.warehouseId(), productId);
        additionalProducts.add(productId);
        return productId;
    }

    int stock(long productId) {
        return db.queryForObject(
                "SELECT COALESCE(SUM(quantity_on_hand),0) FROM inventories WHERE product_id=?",
                Integer.class, productId);
    }

    @AfterEach
    void clean() {
        for (Long accountId : accounts) {
            db.update("DELETE FROM audit_logs WHERE actor_account_id=?", accountId);
            db.update("DELETE FROM inventory_transactions WHERE created_by=?", accountId);
        }
        for (Long receiptId : receipts) {
            db.update(
                    "DELETE FROM inventory_transactions WHERE goods_receipt_item_id IN "
                            + "(SELECT id FROM goods_receipt_items WHERE goods_receipt_id=?)",
                    receiptId);
            db.update("DELETE FROM goods_receipt_items WHERE goods_receipt_id=?", receiptId);
            db.update("DELETE FROM goods_receipts WHERE id=?", receiptId);
        }
        for (Long supplierId : suppliers) db.update("DELETE FROM suppliers WHERE id=?", supplierId);
        for (Long productId : additionalProducts) {
            db.update("DELETE FROM inventory_transactions WHERE product_id=?", productId);
            db.update("DELETE FROM product_images WHERE product_id=?", productId);
            db.update("DELETE FROM inventories WHERE product_id=?", productId);
            db.update("DELETE FROM products WHERE id=?", productId);
        }
        for (CatalogFixture fixture : catalog) {
            db.update("DELETE FROM inventory_transactions WHERE product_id=?", fixture.productId());
            db.update("DELETE FROM inventories WHERE product_id=?", fixture.productId());
            db.update("DELETE FROM product_images WHERE product_id=?", fixture.productId());
            db.update("DELETE FROM products WHERE id=?", fixture.productId());
            db.update("DELETE FROM categories WHERE id=?", fixture.categoryId());
            db.update("DELETE FROM warehouses WHERE id=?", fixture.warehouseId());
        }
        for (Long accountId : accounts) db.update("DELETE FROM account_roles WHERE account_id=?", accountId);
        for (Long roleId : customRoles) {
            db.update("DELETE FROM role_permissions WHERE role_id=?", roleId);
            db.update("DELETE FROM roles WHERE id=?", roleId);
        }
        for (Long permissionId : createdPermissions) db.update("DELETE FROM permissions WHERE id=?", permissionId);
        for (Long accountId : accounts) db.update("DELETE FROM accounts WHERE id=?", accountId);
    }
}
