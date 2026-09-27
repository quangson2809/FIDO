package com.fido.modules.product;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CatalogAdminHttpTests extends CatalogHttpSupport {

    @Test
    void adminCatalogEnforcesCapabilitiesAndVariantInvariants() throws Exception {
        String rootToken = root();

        long readPermission = ensurePermission("CATALOG_READ");
        long writePermission = ensurePermission("CATALOG_WRITE");

        Employee reader = employee(
                customRole(readPermission)
        );

        Employee writer = employee(
                customRole(writePermission)
        );

        String plainPhone = phone();
        long plainAccountId = register(plainPhone);

        grantRole(
                plainAccountId,
                "ADMIN"
        );

        String plainToken = login(plainPhone);

        assertEquals(
                403,
                call(
                        "GET",
                        "/api/v1/admin/products",
                        plainToken,
                        null
                ).status()
        );

        assertEquals(
                200,
                call(
                        "GET",
                        "/api/v1/admin/products",
                        reader.token(),
                        null
                ).status()
        );

        assertEquals(
                403,
                call(
                        "POST",
                        "/api/v1/admin/brands",
                        reader.token(),
                        Map.of("name", "Denied")
                ).status()
        );

        assertEquals(
                200,
                call(
                        "GET",
                        "/api/v1/admin/catalog/meta",
                        rootToken,
                        null
                ).status()
        );

        var fixture = createCatalog(writer);
        long sizeM = fixture.sizeM();
        long colorId = fixture.colorId();
        long productId = fixture.productId();
        assertEquals(
                200,
                call(
                        "PATCH",
                        "/api/v1/admin/products/" + productId,
                        writer.token(),
                        Map.of("material_care", "Wash cold")
                ).status()
        );

        assertEquals(
                403,
                call(
                        "GET",
                        "/api/v1/admin/products/" + productId,
                        writer.token(),
                        null
                ).status()
        );

        assertEquals(
                200,
                call(
                        "GET",
                        "/api/v1/admin/products/" + productId,
                        reader.token(),
                        null
                ).status()
        );

        assertEquals(
                200,
                call(
                        "GET",
                        "/api/v1/admin/catalog/meta",
                        reader.token(),
                        null
                ).status()
        );

        assertEquals(
                200,
                call(
                        "GET",
                        "/api/v1/admin/products?sale_status=ON_SALE&page_size=20",
                        reader.token(),
                        null
                ).status()
        );

        assertEquals(
                400,
                call(
                        "GET",
                        "/api/v1/admin/products?page_size=101",
                        reader.token(),
                        null
                ).status()
        );

        // Variant must use the Product SizeSystem and a unique size/color combination.
        var otherSystemResponse = call(
                "POST",
                "/api/v1/admin/size-systems",
                writer.token(),
                Map.of(
                        "code", "SZ-" + UUID.randomUUID(),
                        "name", "Other",
                        "size_values", List.of(
                                Map.of(
                                        "code", "X",
                                        "display_name", "X",
                                        "sort_order", 1
                                )
                        )
                )
        );

        assertEquals(
                201,
                otherSystemResponse.status(),
                otherSystemResponse.body()
        );

        long otherSystemId = otherSystemResponse.data()
                .get("data")
                .get("size_system_id")
                .asLong();

        systems.add(otherSystemId);

        long wrongSizeId = otherSystemResponse.data()
                .get("data")
                .get("size_values")
                .get(0)
                .get("size_value_id")
                .asLong();

        assertEquals(
                409,
                call(
                        "POST",
                        "/api/v1/admin/products/" + productId + "/variants",
                        writer.token(),
                        Map.of(
                                "variants",
                                List.of(
                                        Map.of(
                                                "size_value_id", wrongSizeId,
                                                "color_id", colorId,
                                                "sale_status", "ON_SALE"
                                        )
                                )
                        )
                ).status()
        );

        assertEquals(
                409,
                call(
                        "POST",
                        "/api/v1/admin/products/" + productId + "/variants",
                        writer.token(),
                        Map.of(
                                "variants",
                                List.of(
                                        Map.of(
                                                "size_value_id", sizeM,
                                                "color_id", colorId,
                                                "sale_status", "ON_SALE"
                                        )
                                )
                        )
                ).status()
        );

        assertTrue(
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM audit_logs
                        WHERE actor_account_id=?
                          AND (
                              action LIKE 'PRODUCT_%'
                              OR action LIKE 'VARIANT_%'
                          )
                        """,
                        Integer.class,
                        writer.id()
                ) > 0
        );

    }
}
