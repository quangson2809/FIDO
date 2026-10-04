package com.fido.modules.product;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ProductImageAdminHttpTests extends CatalogHttpSupport {

    @Test
    void reorderImagesKeepsNormalizedUniqueSortOrderAndRequiresWriteCapability()
            throws Exception {
        long readPermission = ensurePermission("CATALOG_READ");
        long writePermission = ensurePermission("CATALOG_WRITE");
        Employee reader = employee(customRole(readPermission));
        Employee writer = employee(customRole(writePermission));

        var fixture = createCatalog(writer);
        var replaced = replaceImages(writer, fixture.productId());
        List<Long> imageIds = imageIds(replaced);

        var request = Map.of(
                "images",
                List.of(
                        Map.of(
                                "image_id", imageIds.get(2),
                                "sort_order", 0
                        ),
                        Map.of(
                                "image_id", imageIds.get(0),
                                "sort_order", 1
                        ),
                        Map.of(
                                "image_id", imageIds.get(1),
                                "sort_order", 2
                        )
                )
        );

        assertEquals(
                403,
                call(
                        "PATCH",
                        "/api/v1/admin/products/" + fixture.productId() + "/images",
                        reader.token(),
                        request
                ).status()
        );

        var reordered = call(
                "PATCH",
                "/api/v1/admin/products/" + fixture.productId() + "/images",
                writer.token(),
                request
        );

        assertEquals(200, reordered.status(), reordered.body());
        assertEquals(
                List.of(
                        imageIds.get(2),
                        imageIds.get(0),
                        imageIds.get(1)
                ),
                imageIds(reordered)
        );
        assertEquals(
                List.of(0, 1, 2),
                sortOrders(fixture.productId())
        );

        var invalid = call(
                "PATCH",
                "/api/v1/admin/products/" + fixture.productId() + "/images",
                writer.token(),
                Map.of(
                        "images",
                        List.of(
                                Map.of(
                                        "image_id", imageIds.get(2),
                                        "sort_order", 0
                                ),
                                Map.of(
                                        "image_id", imageIds.get(0),
                                        "sort_order", 0
                                ),
                                Map.of(
                                        "image_id", imageIds.get(1),
                                        "sort_order", 2
                                )
                        )
                )
        );

        assertEquals(409, invalid.status(), invalid.body());
        assertEquals(
                List.of(
                        imageIds.get(2),
                        imageIds.get(0),
                        imageIds.get(1)
                ),
                storedImageIds(fixture.productId())
        );
        assertEquals(
                List.of(0, 1, 2),
                sortOrders(fixture.productId())
        );
    }

    @Test
    void removeImageRejectsForeignOrMissingImageAndAllowsProductWithZeroImages()
            throws Exception {
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
                        "/api/v1/admin/products/" + fixture.productId()
                                + "/images/" + foreignImageId,
                        writer.token(),
                        null
                ).status()
        );

        assertEquals(
                404,
                call(
                        "DELETE",
                        "/api/v1/admin/products/" + fixture.productId()
                                + "/images/9223372036854775807",
                        writer.token(),
                        null
                ).status()
        );

        assertEquals(
                204,
                call(
                        "DELETE",
                        "/api/v1/admin/products/" + fixture.productId()
                                + "/images/" + imageIds.get(0),
                        writer.token(),
                        null
                ).status()
        );
        assertEquals(
                List.of(imageIds.get(1), imageIds.get(2)),
                storedImageIds(fixture.productId())
        );
        assertEquals(
                List.of(0, 1),
                sortOrders(fixture.productId())
        );

        assertEquals(
                204,
                call(
                        "DELETE",
                        "/api/v1/admin/products/" + fixture.productId()
                                + "/images/" + imageIds.get(1),
                        writer.token(),
                        null
                ).status()
        );
        assertEquals(
                204,
                call(
                        "DELETE",
                        "/api/v1/admin/products/" + fixture.productId()
                                + "/images/" + imageIds.get(2),
                        writer.token(),
                        null
                ).status()
        );

        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM product_images WHERE product_id=?",
                        Integer.class,
                        fixture.productId()
                )
        );
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
                                                "image_id", imageIds.get(0),
                                                "sort_order", -1
                                        )
                                )
                        )
                ).status()
        );

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
                                                "image_id", foreignImageId,
                                                "sort_order", 0
                                        )
                                )
                        )
                ).status()
        );

        assertEquals(
                List.of(0, 1, 2),
                sortOrders(fixture.productId())
        );
    }

    private Result replaceImages(Employee writer, long productId) throws Exception {
        var response = call(
                "PATCH",
                "/api/v1/admin/products/" + productId,
                writer.token(),
                Map.of(
                        "images",
                        List.of(
                                Map.of(
                                        "image_url", "https://example.test/one.png",
                                        "alt_text", "one"
                                ),
                                Map.of(
                                        "image_url", "https://example.test/two.png",
                                        "alt_text", "two"
                                ),
                                Map.of(
                                        "image_url", "https://example.test/three.png",
                                        "alt_text", "three"
                                )
                        )
                )
        );

        assertEquals(200, response.status(), response.body());
        return response;
    }

    private long createSecondProductImage(
            Employee writer,
            CatalogFixture fixture
    ) throws Exception {
        var response = call(
                "POST",
                "/api/v1/admin/products",
                writer.token(),
                Map.of(
                        "category_id", fixture.categoryId(),
                        "brand_id", fixture.brandId(),
                        "size_system_id", fixture.systemId(),
                        "name", "Other " + UUID.randomUUID(),
                        "base_price", 100000,
                        "sale_status", "ON_SALE",
                        "images", List.of(
                                Map.of(
                                        "image_url", "https://example.test/foreign.png",
                                        "alt_text", "foreign"
                                )
                        )
                )
        );

        assertEquals(201, response.status(), response.body());
        long productId = response.data()
                .get("data")
                .get("product_id")
                .asLong();
        products.add(productId);

        return response.data()
                .get("data")
                .get("images")
                .get(0)
                .get("image_id")
                .asLong();
    }

    private List<Long> imageIds(Result response) {
        var ids = new ArrayList<Long>();
        for (var image : response.data().get("data").get("images")) {
            ids.add(image.get("image_id").asLong());
        }
        return List.copyOf(ids);
    }

    private List<Long> storedImageIds(long productId) {
        return db.query(
                """
                SELECT image_id
                FROM product_images
                WHERE product_id=?
                ORDER BY sort_order
                """,
                (resultSet, rowNumber) -> resultSet.getLong(1),
                productId
        );
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
                productId
        );
    }
}
