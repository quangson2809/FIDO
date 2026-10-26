package com.fido.modules.product;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

class ProductImageAdminHttpTests extends CatalogHttpSupport {

    @Test
    void invalidImageUrlCannotReplaceExistingGallery() throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        long productId = createCatalog(writer).productId();
        List<Long> before = storedImageIds(productId);
        for (String url :
                List.of("http://example.test/a.png", "javascript:alert(1)", "https:/broken")) {
            var response =
                    call(
                            "PATCH",
                            "/api/v1/admin/products/" + productId,
                            writer.token(),
                            Map.of("images", List.of(Map.of("image_url", url, "sort_order", 0))));
            assertEquals(400, response.status(), response.body());
            assertEquals(before, storedImageIds(productId));
        }
    }

    @Test
    void patchRejectsNullImageEntryBeforeChangingGallery() throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        long productId = createCatalog(writer).productId();
        List<Long> before = storedImageIds(productId);

        var response =
                call(
                        "PATCH",
                        "/api/v1/admin/products/" + productId,
                        writer.token(),
                        Map.of("images", java.util.Collections.singletonList(null)));

        assertEquals(400, response.status(), response.body());
        assertEquals(before, storedImageIds(productId));
    }

    @Test
    void productCreateRejectsImagePayloadOutsideImageEndpoints() throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        var fixture = createCatalog(writer);

        var response = call(
                "POST",
                "/api/v1/admin/products",
                writer.token(),
                Map.of(
                        "category_id", fixture.categoryId(),
                        "brand_id", fixture.brandId(),
                        "name", "No image writes from create " + UUID.randomUUID(),
                        "sku", "NO-IMAGE-" + UUID.randomUUID(),
                        "selling_price", 100000,
                        "status", "ACTIVE",
                        "images", List.of(Map.of(
                                "image_url", "https://example.test/legacy.png",
                                "alt_text", "legacy",
                                "sort_order", 0))));

        assertEquals(400, response.status(), response.body());
    }

    @Test
    void patchImagesUsesExplicitNormalizedOrderAndCanClearCollection() throws Exception {
        long writePermission = ensurePermission("CATALOG_WRITE");
        Employee writer = employee(customRole(writePermission));
        var fixture = createCatalog(writer);

        var replaced = replaceImages(writer, fixture.productId());
        assertEquals(List.of(0, 1, 2), sortOrders(fixture.productId()));
        assertPrimaryInvariant(fixture.productId());
        assertEquals(List.of(imageIds(replaced).get(0)), primaryImageIds(fixture.productId()));
        List<Long> beforeInvalid = imageIds(replaced);

        var duplicateOrder =
                call(
                        "PATCH",
                        "/api/v1/admin/products/" + fixture.productId(),
                        writer.token(),
                        Map.of(
                                "images",
                                List.of(
                                        image("https://example.test/a.png", "a", 0),
                                        image("https://example.test/b.png", "b", 0))));
        assertEquals(409, duplicateOrder.status(), duplicateOrder.body());
        assertEquals(beforeInvalid, storedImageIds(fixture.productId()));

        var gapOrder =
                call(
                        "PATCH",
                        "/api/v1/admin/products/" + fixture.productId(),
                        writer.token(),
                        Map.of(
                                "images",
                                List.of(
                                        image("https://example.test/a.png", "a", 0),
                                        image("https://example.test/b.png", "b", 2))));
        assertEquals(409, gapOrder.status(), gapOrder.body());
        assertEquals(beforeInvalid, storedImageIds(fixture.productId()));

        var cleared =
                call(
                        "PATCH",
                        "/api/v1/admin/products/" + fixture.productId(),
                        writer.token(),
                        Map.of("images", List.of()));
        assertEquals(200, cleared.status(), cleared.body());
        assertEquals(0, cleared.data().get("data").get("images").size());
        assertEquals(0, storedImageIds(fixture.productId()).size());
        assertPrimaryInvariant(fixture.productId());
    }

    @Test
    void patchWithoutImagesKeepsCurrentCollection() throws Exception {
        long writePermission = ensurePermission("CATALOG_WRITE");
        Employee writer = employee(customRole(writePermission));
        var fixture = createCatalog(writer);
        var replaced = replaceImages(writer, fixture.productId());
        List<Long> before = imageIds(replaced);

        var response =
                call(
                        "PATCH",
                        "/api/v1/admin/products/" + fixture.productId(),
                        writer.token(),
                        Map.of("name", "Renamed " + UUID.randomUUID()));

        assertEquals(200, response.status(), response.body());
        assertEquals(before, imageIds(response));
        assertEquals(before, storedImageIds(fixture.productId()));
        assertPrimaryInvariant(fixture.productId());
    }

    @Test
    void reorderImagesKeepsNormalizedUniqueSortOrderAndRequiresWriteCapability() throws Exception {
        long readPermission = ensurePermission("CATALOG_READ");
        long writePermission = ensurePermission("CATALOG_WRITE");
        Employee reader = employee(customRole(readPermission));
        Employee writer = employee(customRole(writePermission));

        var fixture = createCatalog(writer);
        var replaced = replaceImages(writer, fixture.productId());
        List<Long> imageIds = imageIds(replaced);

        var request =
                Map.of(
                        "images",
                        List.of(
                                Map.of("image_id", imageIds.get(2), "sort_order", 0),
                                Map.of("image_id", imageIds.get(0), "sort_order", 1),
                                Map.of("image_id", imageIds.get(1), "sort_order", 2)));

        assertEquals(
                403,
                call(
                                "PATCH",
                                "/api/v1/admin/products/" + fixture.productId() + "/images",
                                reader.token(),
                                request)
                        .status());

        var reordered =
                call(
                        "PATCH",
                        "/api/v1/admin/products/" + fixture.productId() + "/images",
                        writer.token(),
                        request);

        assertEquals(200, reordered.status(), reordered.body());
        assertEquals(
                List.of(imageIds.get(2), imageIds.get(0), imageIds.get(1)), imageIds(reordered));
        assertEquals(List.of(0, 1, 2), sortOrders(fixture.productId()));
        assertPrimaryInvariant(fixture.productId());
        assertEquals(List.of(imageIds.get(2)), primaryImageIds(fixture.productId()));

        var invalid =
                call(
                        "PATCH",
                        "/api/v1/admin/products/" + fixture.productId() + "/images",
                        writer.token(),
                        Map.of(
                                "images",
                                List.of(
                                        Map.of("image_id", imageIds.get(2), "sort_order", 0),
                                        Map.of("image_id", imageIds.get(0), "sort_order", 0),
                                        Map.of("image_id", imageIds.get(1), "sort_order", 2))));

        assertEquals(409, invalid.status(), invalid.body());
        assertEquals(
                List.of(imageIds.get(2), imageIds.get(0), imageIds.get(1)),
                storedImageIds(fixture.productId()));
        assertEquals(List.of(0, 1, 2), sortOrders(fixture.productId()));
    }

    @Test
    void removeImageRejectsForeignOrMissingImageAndAllowsProductWithZeroImages() throws Exception {
        long writePermission = ensurePermission("CATALOG_WRITE");
        Employee writer = employee(customRole(writePermission));

        var fixture = createCatalog(writer);
        var replaced = replaceImages(writer, fixture.productId());
        List<Long> imageIds = imageIds(replaced);

        long foreignImageId = createSecondProductImage(writer, fixture);

        assertEquals(
                404,
                call(
                                "DELETE",
                                "/api/v1/admin/products/"
                                        + fixture.productId()
                                        + "/images/"
                                        + foreignImageId,
                                writer.token(),
                                null)
                        .status());

        assertEquals(
                404,
                call(
                                "DELETE",
                                "/api/v1/admin/products/"
                                        + fixture.productId()
                                        + "/images/9223372036854775807",
                                writer.token(),
                                null)
                        .status());

        assertEquals(
                204,
                call(
                                "DELETE",
                                "/api/v1/admin/products/"
                                        + fixture.productId()
                                        + "/images/"
                                        + imageIds.get(0),
                                writer.token(),
                                null)
                        .status());
        assertEquals(
                List.of(imageIds.get(1), imageIds.get(2)), storedImageIds(fixture.productId()));
        assertEquals(List.of(0, 1), sortOrders(fixture.productId()));
        assertPrimaryInvariant(fixture.productId());
        assertEquals(List.of(imageIds.get(1)), primaryImageIds(fixture.productId()));

        assertEquals(
                204,
                call(
                                "DELETE",
                                "/api/v1/admin/products/"
                                        + fixture.productId()
                                        + "/images/"
                                        + imageIds.get(1),
                                writer.token(),
                                null)
                        .status());
        assertEquals(
                204,
                call(
                                "DELETE",
                                "/api/v1/admin/products/"
                                        + fixture.productId()
                                        + "/images/"
                                        + imageIds.get(2),
                                writer.token(),
                                null)
                        .status());
        assertPrimaryInvariant(fixture.productId());
        assertEquals(List.of(imageIds.get(2)), primaryImageIds(fixture.productId()));

        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM product_images WHERE product_id=?",
                        Integer.class,
                        fixture.productId()));
        assertPrimaryInvariant(fixture.productId());
        assertEquals(List.of(), primaryImageIds(fixture.productId()));
    }

    @Test
    void reorderRejectsNegativeSortOrderAndImageOutsideProduct() throws Exception {
        long writePermission = ensurePermission("CATALOG_WRITE");
        Employee writer = employee(customRole(writePermission));

        var fixture = createCatalog(writer);
        var replaced = replaceImages(writer, fixture.productId());
        List<Long> imageIds = imageIds(replaced);
        long foreignImageId = createSecondProductImage(writer, fixture);

        assertEquals(
                400,
                call(
                                "PATCH",
                                "/api/v1/admin/products/" + fixture.productId() + "/images",
                                writer.token(),
                                Map.of(
                                        "images",
                                        List.of(
                                                Map.of(
                                                        "image_id",
                                                        imageIds.get(0),
                                                        "sort_order",
                                                        -1))))
                        .status());

        assertEquals(
                404,
                call(
                                "PATCH",
                                "/api/v1/admin/products/" + fixture.productId() + "/images",
                                writer.token(),
                                Map.of(
                                        "images",
                                        List.of(
                                                Map.of(
                                                        "image_id",
                                                        foreignImageId,
                                                        "sort_order",
                                                        0))))
                        .status());

        assertEquals(List.of(0, 1, 2), sortOrders(fixture.productId()));
        assertPrimaryInvariant(fixture.productId());
    }

    private Result replaceImages(Employee writer, long productId) throws Exception {
        var response =
                call(
                        "PATCH",
                        "/api/v1/admin/products/" + productId,
                        writer.token(),
                        Map.of(
                                "images",
                                List.of(
                                        image("https://example.test/one.png", "one", 0),
                                        image("https://example.test/two.png", "two", 1),
                                        image("https://example.test/three.png", "three", 2))));

        assertEquals(200, response.status(), response.body());
        return response;
    }

    private List<Long> primaryImageIds(long productId) {
        return db.query(
                """
                SELECT id
                FROM product_images
                WHERE product_id=? AND is_primary=TRUE
                ORDER BY sort_order,id
                """,
                (resultSet, rowNumber) -> resultSet.getLong(1),
                productId);
    }

    private void assertPrimaryInvariant(long productId) {
        List<Integer> orders = sortOrders(productId);
        assertEquals(
                java.util.stream.IntStream.range(0, orders.size()).boxed().toList(), orders);
        long gallerySize =
                db.queryForObject(
                        "SELECT COUNT(*) FROM product_images WHERE product_id=?",
                        Long.class,
                        productId);
        long primaryCount =
                db.queryForObject(
                        "SELECT COUNT(*) FROM product_images WHERE product_id=? AND is_primary=TRUE",
                        Long.class,
                        productId);
        assertEquals(gallerySize == 0 ? 0L : 1L, primaryCount);
        int mismatchCount =
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM product_images
                        WHERE product_id=?
                          AND ((sort_order=0 AND is_primary=FALSE)
                            OR (sort_order<>0 AND is_primary=TRUE))
                        """,
                        Integer.class,
                        productId);
        assertEquals(0, mismatchCount);
    }

    private Map<String, Object> image(String imageUrl, String altText, int sortOrder) {
        return Map.of(
                "image_url", imageUrl,
                "alt_text", altText,
                "sort_order", sortOrder);
    }

    private long createSecondProductImage(Employee writer, CatalogFixture fixture)
            throws Exception {
        var created =
                call(
                        "POST",
                        "/api/v1/admin/products",
                        writer.token(),
                        Map.of(
                                "category_id",
                                fixture.categoryId(),
                                "brand_id",
                                fixture.brandId(),
                                "name",
                                "Other " + UUID.randomUUID(),
                                "sku",
                                "OTHER-" + UUID.randomUUID(),
                                "selling_price",
                                100000,
                                "status",
                                "ACTIVE"));

        assertEquals(201, created.status(), created.body());
        long productId = created.data().get("data").get("product_id").asLong();
        products.add(productId);

        var withImage =
                call(
                        "PATCH",
                        "/api/v1/admin/products/" + productId,
                        writer.token(),
                        Map.of(
                                "images",
                                List.of(image("https://example.test/foreign.png", "foreign", 0))));
        assertEquals(200, withImage.status(), withImage.body());

        return withImage.data().get("data").get("images").get(0).get("id").asLong();
    }

    private List<Long> imageIds(Result response) {
        var ids = new ArrayList<Long>();
        for (var image : response.data().get("data").get("images")) {
            ids.add(image.get("id").asLong());
        }
        return List.copyOf(ids);
    }

    private List<Long> storedImageIds(long productId) {
        return db.query(
                """
                SELECT id
                FROM product_images
                WHERE product_id=?
                ORDER BY sort_order
                """,
                (resultSet, rowNumber) -> resultSet.getLong(1),
                productId);
    }

    private List<Integer> sortOrders(long productId) {
        return db.query(
                """
                SELECT sort_order
                FROM product_images
                WHERE product_id=?
                ORDER BY sort_order
                """,
                (resultSet, rowNumber) -> resultSet.getInt(1),
                productId);
    }
}
