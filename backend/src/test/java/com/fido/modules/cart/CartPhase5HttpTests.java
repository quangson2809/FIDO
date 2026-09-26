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
class CartPhase5HttpTests {

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

    @Test
    void authenticatedCartAndVoucherlessQuoteFollowPhase5Rules()
            throws Exception {
        User owner = user();
        User other = user();

        CatalogFixture active = createVariant(
                "ON_SALE",
                "ON_SALE",
                5,
                100000,
                90000
        );

        CatalogFixture stopped = createVariant(
                "ON_SALE",
                "STOPPED",
                10,
                120000,
                null
        );

        CatalogFixture outOfStock = createVariant(
                "ON_SALE",
                "ON_SALE",
                0,
                130000,
                null
        );

        assertEquals(
                401,
                call(
                        "GET",
                        "/api/v1/cart",
                        null,
                        null
                ).status
        );

        assertEquals(
                401,
                call(
                        "POST",
                        "/api/v1/checkout/quote",
                        null,
                        Map.of(
                                "recipient_phone", "0900000000",
                                "recipient_address", "Hanoi"
                        )
                ).status
        );

        var initial = call(
                "GET",
                "/api/v1/cart",
                owner.token(),
                null
        );

        assertEquals(
                200,
                initial.status,
                initial.body
        );

        assertEquals(
                owner.accountId(),
                initial.data
                        .get("data")
                        .get("account_id")
                        .asLong()
        );

        assertEquals(
                0,
                initial.data
                        .get("data")
                        .get("items")
                        .size()
        );

        assertEquals(
                0,
                initial.data
                        .get("data")
                        .get("subtotal")
                        .asInt()
        );

        long inventoryBefore = db.queryForObject(
                """
                SELECT available_quantity
                FROM inventories
                WHERE variant_id=?
                """,
                Long.class,
                active.variantId()
        );

        int ledgerBefore = db.queryForObject(
                """
                SELECT COUNT(*)
                FROM inventory_transactions
                WHERE variant_id=?
                """,
                Integer.class,
                active.variantId()
        );

        var added = call(
                "POST",
                "/api/v1/cart/items",
                owner.token(),
                Map.of(
                        "variant_id", active.variantId(),
                        "quantity", 2
                )
        );

        assertEquals(
                200,
                added.status,
                added.body
        );

        long cartItemId = added.data
                .get("data")
                .get("items")
                .get(0)
                .get("cart_item_id")
                .asLong();

        assertEquals(
                2,
                added.data
                        .get("data")
                        .get("items")
                        .get(0)
                        .get("quantity")
                        .asInt()
        );

        assertEquals(
                90000,
                added.data
                        .get("data")
                        .get("items")
                        .get(0)
                        .get("unit_price")
                        .asInt()
        );

        assertEquals(
                180000,
                added.data
                        .get("data")
                        .get("subtotal")
                        .asInt()
        );

        assertEquals(
                inventoryBefore,
                db.queryForObject(
                        """
                        SELECT available_quantity
                        FROM inventories
                        WHERE variant_id=?
                        """,
                        Long.class,
                        active.variantId()
                )
        );

        assertEquals(
                ledgerBefore,
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM inventory_transactions
                        WHERE variant_id=?
                        """,
                        Integer.class,
                        active.variantId()
                )
        );

        var addedAgain = call(
                "POST",
                "/api/v1/cart/items",
                owner.token(),
                Map.of(
                        "variant_id", active.variantId(),
                        "quantity", 1
                )
        );

        assertEquals(
                3,
                addedAgain.data
                        .get("data")
                        .get("items")
                        .get(0)
                        .get("quantity")
                        .asInt()
        );

        var patched = call(
                "PATCH",
                "/api/v1/cart/items/" + cartItemId,
                owner.token(),
                Map.of("quantity", 2)
        );

        assertEquals(
                200,
                patched.status
        );

        assertEquals(
                2,
                patched.data
                        .get("data")
                        .get("items")
                        .get(0)
                        .get("quantity")
                        .asInt()
        );

        assertEquals(
                400,
                call(
                        "PATCH",
                        "/api/v1/cart/items/" + cartItemId,
                        owner.token(),
                        Map.of("quantity", 0)
                ).status
        );

        call(
                "GET",
                "/api/v1/cart",
                other.token(),
                null
        );

        assertEquals(
                404,
                call(
                        "PATCH",
                        "/api/v1/cart/items/" + cartItemId,
                        other.token(),
                        Map.of("quantity", 1)
                ).status
        );

        assertEquals(
                409,
                call(
                        "POST",
                        "/api/v1/cart/items",
                        owner.token(),
                        Map.of(
                                "variant_id", stopped.variantId(),
                                "quantity", 1
                        )
                ).status
        );

        assertEquals(
                409,
                call(
                        "POST",
                        "/api/v1/cart/items",
                        owner.token(),
                        Map.of(
                                "variant_id", outOfStock.variantId(),
                                "quantity", 1
                        )
                ).status
        );

        assertEquals(
                404,
                call(
                        "POST",
                        "/api/v1/cart/items",
                        owner.token(),
                        Map.of(
                                "variant_id", Long.MAX_VALUE,
                                "quantity", 1
                        )
                ).status
        );

        db.update(
                """
                UPDATE product_variants
                SET override_price=80000,
                    updated_at=CURRENT_TIMESTAMP
                WHERE variant_id=?
                """,
                active.variantId()
        );

        var repriced = call(
                "GET",
                "/api/v1/cart",
                owner.token(),
                null
        );

        assertEquals(
                80000,
                repriced.data
                        .get("data")
                        .get("items")
                        .get(0)
                        .get("unit_price")
                        .asInt()
        );

        assertEquals(
                160000,
                repriced.data
                        .get("data")
                        .get("subtotal")
                        .asInt()
        );

        int orderCountBefore = db.queryForObject(
                "SELECT COUNT(*) FROM orders",
                Integer.class
        );

        var quote = call(
                "POST",
                "/api/v1/checkout/quote",
                owner.token(),
                Map.of(
                        "recipient_phone", "0900000000",
                        "recipient_email", "buyer@example.test",
                        "recipient_address", "Cau Giay, Hanoi"
                )
        );

        assertEquals(
                200,
                quote.status,
                quote.body
        );

        assertEquals(
                160000,
                quote.data
                        .get("data")
                        .get("subtotal")
                        .asInt()
        );

        assertEquals(
                0,
                quote.data
                        .get("data")
                        .get("discount")
                        .asInt()
        );

        assertEquals(
                30000,
                quote.data
                        .get("data")
                        .get("shipping_fee")
                        .asInt()
        );

        assertEquals(
                190000,
                quote.data
                        .get("data")
                        .get("total")
                        .asInt()
        );

        assertTrue(
                quote.data
                        .get("data")
                        .get("voucher")
                        .isNull()
        );

        assertEquals(
                orderCountBefore,
                db.queryForObject(
                        "SELECT COUNT(*) FROM orders",
                        Integer.class
                )
        );

        assertEquals(
                inventoryBefore,
                db.queryForObject(
                        """
                        SELECT available_quantity
                        FROM inventories
                        WHERE variant_id=?
                        """,
                        Long.class,
                        active.variantId()
                )
        );

        assertEquals(
                ledgerBefore,
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM inventory_transactions
                        WHERE variant_id=?
                        """,
                        Integer.class,
                        active.variantId()
                )
        );

        assertEquals(
                501,
                call(
                        "POST",
                        "/api/v1/checkout/quote",
                        owner.token(),
                        Map.of(
                                "recipient_phone", "0900000000",
                                "recipient_address", "Hanoi",
                                "voucher_code", "TBD-VOUCHER"
                        )
                ).status
        );

        db.update(
                """
                UPDATE inventories
                SET available_quantity=1,
                    updated_at=CURRENT_TIMESTAMP
                WHERE variant_id=?
                """,
                active.variantId()
        );

        assertEquals(
                409,
                call(
                        "POST",
                        "/api/v1/checkout/quote",
                        owner.token(),
                        Map.of(
                                "recipient_phone", "0900000000",
                                "recipient_address", "Hanoi"
                        )
                ).status
        );

        db.update(
                """
                UPDATE inventories
                SET available_quantity=5,
                    updated_at=CURRENT_TIMESTAMP
                WHERE variant_id=?
                """,
                active.variantId()
        );

        db.update(
                """
                UPDATE product_variants
                SET sale_status='STOPPED',
                    updated_at=CURRENT_TIMESTAMP
                WHERE variant_id=?
                """,
                active.variantId()
        );

        assertEquals(
                409,
                call(
                        "POST",
                        "/api/v1/checkout/quote",
                        owner.token(),
                        Map.of(
                                "recipient_phone", "0900000000",
                                "recipient_address", "Hanoi"
                        )
                ).status
        );

        db.update(
                """
                UPDATE product_variants
                SET sale_status='ON_SALE',
                    updated_at=CURRENT_TIMESTAMP
                WHERE variant_id=?
                """,
                active.variantId()
        );

        var deleted = call(
                "DELETE",
                "/api/v1/cart/items/" + cartItemId,
                owner.token(),
                null
        );

        assertEquals(
                200,
                deleted.status
        );

        assertEquals(
                0,
                deleted.data
                        .get("data")
                        .get("items")
                        .size()
        );

        assertEquals(
                0,
                deleted.data
                        .get("data")
                        .get("subtotal")
                        .asInt()
        );

        assertEquals(
                200,
                call(
                        "DELETE",
                        "/api/v1/cart",
                        owner.token(),
                        null
                ).status
        );
    }

    @Test
    void quoteDoesNotCreateCartWhenAuthenticatedCartDoesNotExist()
            throws Exception {
        User owner = user();

        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM carts WHERE account_id=?",
                        Integer.class,
                        owner.accountId()
                )
        );

        int ordersBefore = db.queryForObject(
                "SELECT COUNT(*) FROM orders",
                Integer.class
        );

        assertEquals(
                409,
                call(
                        "POST",
                        "/api/v1/checkout/quote",
                        owner.token(),
                        Map.of(
                                "recipient_phone", "0900000000",
                                "recipient_address", "Hanoi"
                        )
                ).status
        );

        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM carts WHERE account_id=?",
                        Integer.class,
                        owner.accountId()
                )
        );

        assertEquals(
                ordersBefore,
                db.queryForObject(
                        "SELECT COUNT(*) FROM orders",
                        Integer.class
                )
        );
    }
}
