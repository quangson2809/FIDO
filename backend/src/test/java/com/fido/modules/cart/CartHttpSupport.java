package com.fido.modules.cart;

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
abstract class CartHttpSupport {
    static final String PASSWORD = "Test-password-123";

    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate db;

    final HttpClient client = HttpClient.newHttpClient();
    final List<Long> accounts = new ArrayList<>();
    final List<CatalogFixture> fixtures = new ArrayList<>();
    Long warehouseId;

    record Result(int status, JsonNode data, String body) {}
    record User(long accountId, String token) {}
    record CatalogFixture(long categoryId, long productId, long warehouseId, String sku) {}

    Result call(String method, String path, String token, Object body) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Accept", "application/json")
                .header("Content-Type", "application/json");
        if (token != null) builder.header("Authorization", "Bearer " + token);
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
                Map.of("phone", phone, "full_name", "Cart Test Account", "password", PASSWORD));
        assertEquals(201, register.status(), register.body());
        long accountId = register.data().get("data").get("account").get("id").asLong();
        accounts.add(accountId);
        var login = call("POST", "/api/v1/auth/login", null,
                Map.of("phone", phone, "password", PASSWORD));
        assertEquals(200, login.status(), login.body());
        return new User(accountId, login.data().get("data").get("access_token").asText());
    }

    /**
     * Compatibility-shaped factory for existing tests: the approved model has one sellable
     * Product, not size/color variants. Either old status argument can mark the Product inactive.
     */
    CatalogFixture createVariant(String productStatus, String legacyVariantStatus,
            int quantityOnHand, int basePrice, Integer overridePrice) {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        String categorySlug = "cart-" + suffix;
        String productSlug = "cart-product-" + suffix;
        String sku = "CART-SKU-" + suffix;
        db.update("INSERT INTO categories(parent_category_id,name,slug,status) VALUES (NULL,?,?, 'ACTIVE')",
                "Cart category " + suffix, categorySlug);
        long categoryId = db.queryForObject("SELECT id FROM categories WHERE slug=?",
                Long.class, categorySlug);
        String canonicalStatus = "ON_SALE".equals(productStatus)
                && "ON_SALE".equals(legacyVariantStatus) ? "ACTIVE" : "INACTIVE";
        db.update("""
                INSERT INTO products(category_id,name,slug,sku,selling_price,status)
                VALUES (?,?,?,?,?,?)
                """, categoryId, "Cart product " + suffix, productSlug, sku,
                overridePrice == null ? basePrice : overridePrice, canonicalStatus);
        long productId = db.queryForObject("SELECT id FROM products WHERE sku=?", Long.class, sku);
        long resolvedWarehouse = warehouseId();
        db.update("""
                INSERT INTO inventories(warehouse_id,product_id,quantity_on_hand,version)
                VALUES (?,?,?,0)
                """, resolvedWarehouse, productId, quantityOnHand);
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

    @AfterEach
    void clean() {
        for (Long accountId : accounts) {
            db.update("""
                    DELETE FROM cart_items
                    WHERE cart_id IN (SELECT id FROM carts WHERE account_id=?)
                    """, accountId);
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
    }
}
