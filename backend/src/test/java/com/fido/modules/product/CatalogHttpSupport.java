package com.fido.modules.product;

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
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
abstract class CatalogHttpSupport {
    static final String PASSWORD = "Test-password-123";

    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate db;

    final HttpClient client = HttpClient.newHttpClient();
    final List<Long> accounts = new ArrayList<>();
    final List<Long> customRoles = new ArrayList<>();
    final Set<Long> createdPermissions = new HashSet<>();
    final List<Long> products = new ArrayList<>();
    final List<Long> categories = new ArrayList<>();
    final List<Long> brands = new ArrayList<>();
    final List<Long> warehouses = new ArrayList<>();
    final List<Long> suppliers = new ArrayList<>();
    final List<Long> receipts = new ArrayList<>();

    record Result(int status, JsonNode data, String body) {}
    record Employee(long id, String token) {}
    record CatalogFixture(
            long categoryId,
            long brandId,
            long productId,
            Result categoryResponse,
            Result brandResponse,
            Result createProductResponse) {}

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
                Map.of("phone", phone, "full_name", "Catalog Test Account", "password", PASSWORD));
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

    void grantRole(long accountId, String code) {
        db.update("INSERT INTO account_roles SELECT ?, id FROM roles WHERE code=?", accountId, code);
    }

    String root() throws Exception {
        String phone = phone();
        long accountId = register(phone);
        grantRole(accountId, "SUPERADMIN");
        return login(phone);
    }

    long ensurePermission(String code) {
        var found = db.query("SELECT id FROM permissions WHERE code=?",
                (rs, row) -> rs.getLong(1), code);
        if (!found.isEmpty()) return found.get(0);
        db.update("INSERT INTO permissions(code,name) VALUES (?,?)", code, code);
        long id = db.queryForObject("SELECT id FROM permissions WHERE code=?", Long.class, code);
        createdPermissions.add(id);
        return id;
    }

    long customRole(long permissionId) {
        String code = "catalog-test-" + UUID.randomUUID();
        db.update("INSERT INTO roles(code,name) VALUES (?,?)", code, "Catalog test");
        long id = db.queryForObject("SELECT id FROM roles WHERE code=?", Long.class, code);
        customRoles.add(id);
        db.update("INSERT INTO role_permissions(role_id,permission_id) VALUES (?,?)", id, permissionId);
        return id;
    }

    Employee employee(long roleId) throws Exception {
        String phone = phone();
        long accountId = register(phone);
        grantRole(accountId, "ADMIN");
        db.update("INSERT INTO account_roles(account_id,role_id) VALUES (?,?)", accountId, roleId);
        return new Employee(accountId, login(phone));
    }

    @AfterEach
    void clean() {
        for (Long accountId : accounts) {
            db.update("DELETE FROM audit_logs WHERE actor_account_id=?", accountId);
        }
        for (Long receiptId : receipts) {
            db.update(
                    "DELETE FROM inventory_transactions WHERE goods_receipt_item_id IN "
                            + "(SELECT id FROM goods_receipt_items WHERE goods_receipt_id=?)",
                    receiptId);
            db.update("DELETE FROM goods_receipt_items WHERE goods_receipt_id=?", receiptId);
            db.update("DELETE FROM goods_receipts WHERE id=?", receiptId);
        }
        for (Long supplierId : suppliers) {
            db.update("DELETE FROM suppliers WHERE id=?", supplierId);
        }
        var productCopy = new ArrayList<>(products);
        Collections.reverse(productCopy);
        for (Long productId : productCopy) {
            db.update("DELETE FROM inventory_transactions WHERE product_id=?", productId);
            db.update("DELETE FROM product_images WHERE product_id=?", productId);
            db.update("DELETE FROM inventories WHERE product_id=?", productId);
            db.update("DELETE FROM products WHERE id=?", productId);
        }
        for (Long brandId : brands) db.update("DELETE FROM brands WHERE id=?", brandId);
        var categoryCopy = new ArrayList<>(categories);
        Collections.reverse(categoryCopy);
        for (Long categoryId : categoryCopy) db.update("DELETE FROM categories WHERE id=?", categoryId);
        for (Long warehouseId : warehouses) db.update("DELETE FROM warehouses WHERE id=?", warehouseId);
        for (Long accountId : accounts) db.update("DELETE FROM account_roles WHERE account_id=?", accountId);
        for (Long roleId : customRoles) {
            db.update("DELETE FROM role_permissions WHERE role_id=?", roleId);
            db.update("DELETE FROM roles WHERE id=?", roleId);
        }
        for (Long permissionId : createdPermissions) db.update("DELETE FROM permissions WHERE id=?", permissionId);
        for (Long accountId : accounts) db.update("DELETE FROM accounts WHERE id=?", accountId);
    }

    CatalogFixture createCatalog(Employee writer) throws Exception {
        var categoryResponse = call("POST", "/api/v1/admin/categories", writer.token(),
                Map.of("name", "Category " + UUID.randomUUID()));
        assertEquals(201, categoryResponse.status(), categoryResponse.body());
        long categoryId = categoryResponse.data().get("data").get("category_id").asLong();
        categories.add(categoryId);

        var brandResponse = call("POST", "/api/v1/admin/brands", writer.token(),
                Map.of("name", "Brand " + UUID.randomUUID()));
        assertEquals(201, brandResponse.status(), brandResponse.body());
        long brandId = brandResponse.data().get("data").get("brand_id").asLong();
        brands.add(brandId);

        var created = call("POST", "/api/v1/admin/products", writer.token(),
                Map.of("category_id", categoryId, "brand_id", brandId,
                        "sku", "SKU-" + UUID.randomUUID(),
                        "name", "FIDO Product " + UUID.randomUUID(),
                        "description", "Catalog test fixture",
                        "selling_price", 100000, "status", "ACTIVE"));
        assertEquals(201, created.status(), created.body());
        long productId = created.data().get("data").get("product_id").asLong();
        products.add(productId);

        return new CatalogFixture(categoryId, brandId, productId, categoryResponse, brandResponse, created);
    }

}
