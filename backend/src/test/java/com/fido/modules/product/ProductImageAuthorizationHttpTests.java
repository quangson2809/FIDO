package com.fido.modules.product;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class ProductImageAuthorizationHttpTests extends CatalogHttpSupport {

    @Test
    void deleteImageRequiresCatalogWritePermission() throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        Employee reader = employee(customRole(ensurePermission("CATALOG_READ")));
        var fixture = createCatalog(writer);

        db.update(
                """
                INSERT INTO product_images(product_id, image_url, alt_text, sort_order)
                VALUES (?, ?, NULL, 0)
                """,
                fixture.productId(),
                "https://storage.test/protected.png"
        );
        long imageId = db.queryForObject(
                """
                SELECT image_id
                FROM product_images
                WHERE product_id=? AND sort_order=0
                """,
                Long.class,
                fixture.productId()
        );

        var response = call(
                "DELETE",
                "/api/v1/admin/products/" + fixture.productId()
                        + "/images/" + imageId,
                reader.token(),
                null
        );

        assertEquals(403, response.status(), response.body());
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT COUNT(*) FROM product_images WHERE image_id=?",
                        Integer.class,
                        imageId
                )
        );
    }
}
