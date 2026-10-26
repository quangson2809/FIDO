package com.fido.modules.product;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

class ProductImageAuthorizationHttpTests extends CatalogHttpSupport {

    @Test
    void deleteImageRequiresCatalogWritePermission() throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        Employee reader = employee(customRole(ensurePermission("CATALOG_READ")));
        var fixture = createCatalog(writer);
        var imageAdded =
                call(
                        "PATCH",
                        "/api/v1/admin/products/" + fixture.productId(),
                        writer.token(),
                        Map.of(
                                "images",
                                List.of(
                                        Map.of(
                                                "image_url",
                                                "https://example.test/auth-image.png",
                                                "alt_text",
                                                "authorization test",
                                                "sort_order",
                                                0))));
        assertEquals(200, imageAdded.status(), imageAdded.body());

        long imageId =
                db.queryForObject(
                        """
                        SELECT MIN(id)
                        FROM product_images
                        WHERE product_id=?
                        """,
                        Long.class,
                        fixture.productId());

        var response =
                call(
                        "DELETE",
                        "/api/v1/admin/products/" + fixture.productId() + "/images/" + imageId,
                        reader.token(),
                        null);

        assertEquals(403, response.status(), response.body());
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT COUNT(*) FROM product_images WHERE id=?",
                        Integer.class,
                        imageId));
    }
}
