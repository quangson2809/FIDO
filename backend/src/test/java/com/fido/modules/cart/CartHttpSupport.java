package com.fido.modules.cart;

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
abstract class CartHttpSupport {

    static final String PASSWORD = "Test-password-123";

    @LocalServerPort
    int port;

    @Autowired
    ObjectMapper json;

    @Autowired
    JdbcTemplate db;

    final HttpClient client = HttpClient.newHttpClient();

    final List<Long> accounts = new ArrayList<>();
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
        String phone = "05"
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
                register.status,
                register.body
        );

        long accountId = register.data
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
                login.status,
                login.body
        );

        return new User(
                accountId,
                login.data
                        .get("data")
                        .get("access_token")
                        .asText()
        );
    }

    CatalogFixture createVariant(
            String productStatus,
            String variantStatus,
            int availableQuantity,
            int basePrice,
            Integer overridePrice
    ) {
        String suffix = UUID.randomUUID()
                .toString()
                .replace("-", "");

        String categoryName = "Cart category " + suffix;
        String sizeSystemCode = "CART-SZ-" + suffix.substring(0, 10);
        String colorCode = "CART-C-" + suffix.substring(0, 10);
        String productName = "Cart product " + suffix;
        String sku = "CART-SKU-" + suffix;

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
                "Cart size"
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
                "Forest Green"
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
                VALUES (?,NULL,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """,
                categoryId,
                sizeSystemId,
                productName,
                basePrice,
                productStatus
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
                VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """,
                productId,
                sizeValueId,
                colorId,
                sku,
                overridePrice,
                variantStatus
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

    @AfterEach
    void clean() {
        for (Long id : accounts) db.update("DELETE FROM checkout_quotes WHERE account_id=?", id);
        for (Long accountId : accounts) {
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
                    "DELETE FROM product_images WHERE product_id=?",
                    fixture.productId()
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
                    "DELETE FROM audit_logs WHERE actor_account_id=?",
                    accountId
            );

            db.update(
                    "DELETE FROM accounts WHERE account_id=?",
                    accountId
            );
        }
    }
}
