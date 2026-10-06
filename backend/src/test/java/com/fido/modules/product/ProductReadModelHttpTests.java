package com.fido.modules.product;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

class ProductReadModelHttpTests extends CatalogHttpSupport {

    @Test
    void productListsUseOneThumbnailWhileDetailsReturnServerOrderedImages()
            throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        Employee reader = employee(customRole(ensurePermission("CATALOG_READ")));
        var fixture = createCatalog(writer);

        insertImage(
                fixture.productId(),
                "https://example.test/third.png",
                "third",
                2
        );
        insertImage(
                fixture.productId(),
                "https://example.test/second.png",
                "second",
                1
        );

        var publicList = call(
                "GET",
                "/api/v1/catalog/products?q=FIDO&page=1&page_size=1",
                null,
                null
        );
        assertEquals(200, publicList.status(), publicList.body());
        assertEquals(1, publicList.data().get("data").size());
        assertEquals(1, publicList.data().get("meta").get("total").asInt());
        assertSummaryThumbnail(publicList.data().get("data").get(0));

        var adminList = call(
                "GET",
                "/api/v1/admin/products?q=FIDO&page=1&page_size=1",
                reader.token(),
                null
        );
        assertEquals(200, adminList.status(), adminList.body());
        assertEquals(1, adminList.data().get("data").size());
        assertEquals(1, adminList.data().get("meta").get("total").asInt());
        assertSummaryThumbnail(adminList.data().get("data").get(0));

        var publicDetail = call(
                "GET",
                "/api/v1/catalog/products/" + fixture.productId(),
                null,
                null
        );
        assertEquals(200, publicDetail.status(), publicDetail.body());
        assertOrderedImages(publicDetail.data().get("data").get("images"));

        var adminDetail = call(
                "GET",
                "/api/v1/admin/products/" + fixture.productId(),
                reader.token(),
                null
        );
        assertEquals(200, adminDetail.status(), adminDetail.body());
        assertOrderedImages(adminDetail.data().get("data").get("images"));
    }

    @Test
    void productWithoutImagesHasNullThumbnailAndEmptyDetailImages()
            throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        Employee reader = employee(customRole(ensurePermission("CATALOG_READ")));
        var fixture = createCatalog(writer);

        db.update(
                "DELETE FROM product_images WHERE product_id=?",
                fixture.productId()
        );

        var publicList = call(
                "GET",
                "/api/v1/catalog/products?q=FIDO",
                null,
                null
        );
        assertEquals(200, publicList.status(), publicList.body());
        assertNullThumbnail(publicList.data().get("data").get(0));

        var adminList = call(
                "GET",
                "/api/v1/admin/products?q=FIDO",
                reader.token(),
                null
        );
        assertEquals(200, adminList.status(), adminList.body());
        assertNullThumbnail(adminList.data().get("data").get(0));

        var publicDetail = call(
                "GET",
                "/api/v1/catalog/products/" + fixture.productId(),
                null,
                null
        );
        assertEquals(200, publicDetail.status(), publicDetail.body());
        assertEquals(0, publicDetail.data().get("data").get("images").size());

        var adminDetail = call(
                "GET",
                "/api/v1/admin/products/" + fixture.productId(),
                reader.token(),
                null
        );
        assertEquals(200, adminDetail.status(), adminDetail.body());
        assertEquals(0, adminDetail.data().get("data").get("images").size());
    }

    private void insertImage(
            long productId,
            String imageUrl,
            String altText,
            int sortOrder
    ) {
        db.update(
                """
                INSERT INTO product_images(product_id,image_url,alt_text,sort_order)
                VALUES (?,?,?,?)
                """,
                productId,
                imageUrl,
                altText,
                sortOrder
        );
    }

    private void assertSummaryThumbnail(JsonNode summary) {
        assertEquals(
                "https://example.test/shirt.png",
                summary.get("thumbnail").asText()
        );
        assertFalse(summary.has("images"));
        assertFalse(summary.has("image_url"));
    }

    private void assertNullThumbnail(JsonNode summary) {
        assertTrue(summary.has("thumbnail"));
        assertTrue(summary.get("thumbnail").isNull());
        assertFalse(summary.has("images"));
        assertFalse(summary.has("image_url"));
    }

    private void assertOrderedImages(JsonNode images) {
        assertEquals(3, images.size());
        assertEquals(
                List.of(
                        "https://example.test/shirt.png",
                        "https://example.test/second.png",
                        "https://example.test/third.png"
                ),
                List.of(
                        images.get(0).get("image_url").asText(),
                        images.get(1).get("image_url").asText(),
                        images.get(2).get("image_url").asText()
                )
        );
        assertEquals(0, images.get(0).get("sort_order").asInt());
        assertEquals(1, images.get(1).get("sort_order").asInt());
        assertEquals(2, images.get(2).get("sort_order").asInt());
    }
}
