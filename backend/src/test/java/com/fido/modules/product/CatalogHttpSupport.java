package com.fido.modules.product;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
abstract class CatalogHttpSupport {

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

    final List<Long> products = new ArrayList<>();
    final List<Long> categories = new ArrayList<>();
    final List<Long> brands = new ArrayList<>();
    final List<Long> systems = new ArrayList<>();
    final List<Long> colors = new ArrayList<>();

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
        return "08"
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
                response.status(),
                response.body()
        );

        long accountId = response.data()
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
                response.status(),
                response.body()
        );

        return response.data()
                .get("data")
                .get("access_token")
                .asText();
    }

    void grantRole(
            long accountId,
            String code
    ) {
        db.update(
                """
                INSERT INTO account_roles
                SELECT ?, role_id
                FROM roles
                WHERE code=?
                """,
                accountId,
                code
        );
    }

    String root() throws Exception {
        String phone = phone();
        long accountId = register(phone);

        grantRole(
                accountId,
                "SUPERADMIN"
        );

        return login(phone);
    }

    long ensurePermission(String code) {
        var found = db.query(
                "SELECT permission_id FROM permissions WHERE code=?",
                (resultSet, rowNumber) -> resultSet.getLong(1),
                code
        );

        if (!found.isEmpty()) {
            return found.get(0);
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

    long customRole(long permissionId) {
        String code = "catalog-test-" + UUID.randomUUID();

        db.update(
                "INSERT INTO roles(code,name) VALUES (?,?)",
                code,
                "Catalog test"
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

    @AfterEach
    void clean() {
        for (Long accountId : accounts) {
            db.update(
                    "DELETE FROM audit_logs WHERE actor_account_id=?",
                    accountId
            );
        }

        for (Long productId : products) {
            db.update(
                    """
                    DELETE FROM inventories
                    WHERE variant_id IN (
                        SELECT variant_id
                        FROM product_variants
                        WHERE product_id=?
                    )
                    """,
                    productId
            );

            db.update(
                    "DELETE FROM product_images WHERE product_id=?",
                    productId
            );

            db.update(
                    "DELETE FROM product_variants WHERE product_id=?",
                    productId
            );

            db.update(
                    "DELETE FROM products WHERE product_id=?",
                    productId
            );
        }

        for (Long colorId : colors) {
            db.update(
                    "DELETE FROM colors WHERE color_id=?",
                    colorId
            );
        }

        for (Long systemId : systems) {
            db.update(
                    "DELETE FROM size_values WHERE size_system_id=?",
                    systemId
            );

            db.update(
                    "DELETE FROM size_systems WHERE size_system_id=?",
                    systemId
            );
        }

        for (Long brandId : brands) {
            db.update(
                    "DELETE FROM brands WHERE brand_id=?",
                    brandId
            );
        }

        var categoryCopy = new ArrayList<>(categories);
        Collections.reverse(categoryCopy);

        for (Long categoryId : categoryCopy) {
            db.update(
                    "DELETE FROM categories WHERE category_id=?",
                    categoryId
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

    record CatalogFixture(long categoryId, long brandId, long systemId, long sizeM,
            long colorId, long productId, long variantId, Result categoryResponse,
            Result brandResponse, Result systemResponse, Result colorResponse,
            Result createProductResponse) {}

    CatalogFixture createCatalog(Employee writer) throws Exception {
        var categoryResponse = call(
                "POST",
                "/api/v1/admin/categories",
                writer.token(),
                Map.of(
                        "name",
                        "Root " + UUID.randomUUID()
                )
        );

        long categoryId = categoryResponse.data()
                .get("data")
                .get("category_id")
                .asLong();

        categories.add(categoryId);

        var brandResponse = call(
                "POST",
                "/api/v1/admin/brands",
                writer.token(),
                Map.of(
                        "name",
                        "Brand " + UUID.randomUUID()
                )
        );

        long brandId = brandResponse.data()
                .get("data")
                .get("brand_id")
                .asLong();

        brands.add(brandId);

        var systemResponse = call(
                "POST",
                "/api/v1/admin/size-systems",
                writer.token(),
                Map.of(
                        "code", "SZ-" + UUID.randomUUID(),
                        "name", "Size system",
                        "size_values", List.of(
                                Map.of(
                                        "code", "M",
                                        "display_name", "Medium",
                                        "sort_order", 1
                                ),
                                Map.of(
                                        "code", "L",
                                        "display_name", "Large",
                                        "sort_order", 2
                                )
                        )
                )
        );

        long systemId = systemResponse.data()
                .get("data")
                .get("size_system_id")
                .asLong();

        systems.add(systemId);

        long sizeM = systemResponse.data()
                .get("data")
                .get("size_values")
                .get(0)
                .get("size_value_id")
                .asLong();

        var colorResponse = call(
                "POST",
                "/api/v1/admin/colors",
                writer.token(),
                Map.of(
                        "code", "C-" + UUID.randomUUID(),
                        "name", "Green"
                )
        );

        long colorId = colorResponse.data()
                .get("data")
                .get("color_id")
                .asLong();

        colors.add(colorId);

        var createdProduct = call(
                "POST",
                "/api/v1/admin/products",
                writer.token(),
                Map.of(
                        "category_id", categoryId,
                        "brand_id", brandId,
                        "size_system_id", systemId,
                        "name", "FIDO Shirt",
                        "base_price", 100000,
                        "sale_status", "ON_SALE",
                        "gender", "unisex",
                        "variants", List.of(
                                Map.of(
                                        "size_value_id", sizeM,
                                        "color_id", colorId,
                                        "sku", "SKU-" + UUID.randomUUID(),
                                        "override_price", 90000,
                                        "sale_status", "ON_SALE"
                                )
                        )
                )
        );

        assertEquals(201, createdProduct.status(), createdProduct.body());

        long productId = createdProduct.data()
                .get("data")
                .get("product_id")
                .asLong();
        products.add(productId);

        long variantId = createdProduct.data()
                .get("data")
                .get("variants")
                .get(0)
                .get("variant_id")
                .asLong();

        var productWithImage = call(
                "PATCH",
                "/api/v1/admin/products/" + productId,
                writer.token(),
                Map.of(
                        "images",
                        List.of(
                                Map.of(
                                        "image_url",
                                        "https://example.test/shirt.png",
                                        "alt_text",
                                        "shirt",
                                        "sort_order",
                                        0
                                )
                        )
                )
        );

        assertEquals(200, productWithImage.status(), productWithImage.body());

        return new CatalogFixture(categoryId, brandId, systemId, sizeM, colorId,
                productId, variantId, categoryResponse, brandResponse, systemResponse,
                colorResponse, createdProduct);
    }
}
