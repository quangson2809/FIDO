package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class OrderImageSnapshotHttpTests extends OrderHttpSupport {

    @Test
    void createdOrderKeepsImageSnapshotAfterCoverChangeAndDeletion()
            throws Exception {
        User customer = user();
        User root = superadmin();
        CatalogFixture fixture = createVariant(
                5,
                100000,
                90000
        );

        String coverA = "https://cdn.example.test/orders/cover-a.jpg";
        String coverB = "https://cdn.example.test/orders/cover-b.jpg";
        long imageA = insertImage(fixture.productId(), coverA, 0);
        long imageB = insertImage(fixture.productId(), coverB, 1);

        long orderId = createOrder(customer, fixture, 1);

        assertEquals(
                coverA,
                db.queryForObject(
                        "SELECT image_url_snapshot FROM order_items WHERE order_id=?",
                        String.class,
                        orderId
                )
        );

        var changedCover = call(
                "PATCH",
                "/api/v1/admin/products/" + fixture.productId() + "/images",
                root.token(),
                Map.of(
                        "images",
                        List.of(
                                Map.of(
                                        "image_id", imageB,
                                        "sort_order", 0
                                ),
                                Map.of(
                                        "image_id", imageA,
                                        "sort_order", 1
                                )
                        )
                )
        );

        assertEquals(200, changedCover.status(), changedCover.body());
        assertEquals(coverB, currentCover(fixture.productId()));
        assertOrderImage(customer, orderId, coverA);
        assertAdminOrderImage(root, orderId, coverA);

        var deletedPreviousCover = call(
                "DELETE",
                "/api/v1/admin/products/" + fixture.productId()
                        + "/images/" + imageA,
                root.token(),
                null
        );

        assertEquals(
                204,
                deletedPreviousCover.status(),
                deletedPreviousCover.body()
        );
        assertEquals(coverB, currentCover(fixture.productId()));
        assertOrderImage(customer, orderId, coverA);
        assertAdminOrderImage(root, orderId, coverA);
    }

    private long insertImage(
            long productId,
            String imageUrl,
            int sortOrder
    ) {
        db.update(
                """
                INSERT INTO product_images(
                    product_id,
                    image_url,
                    alt_text,
                    sort_order
                )
                VALUES (?,?,NULL,?)
                """,
                productId,
                imageUrl,
                sortOrder
        );

        return db.queryForObject(
                """
                SELECT image_id
                FROM product_images
                WHERE product_id=? AND image_url=?
                """,
                Long.class,
                productId,
                imageUrl
        );
    }

    private String currentCover(long productId) {
        return db.queryForObject(
                """
                SELECT image_url
                FROM product_images
                WHERE product_id=? AND sort_order=0
                """,
                String.class,
                productId
        );
    }

    private void assertOrderImage(
            User customer,
            long orderId,
            String expectedImageUrl
    ) throws Exception {
        Result detail = call(
                "GET",
                "/api/v1/me/orders/" + orderId,
                customer.token(),
                null
        );

        assertEquals(200, detail.status(), detail.body());
        assertEquals(
                expectedImageUrl,
                detail.data()
                        .get("data")
                        .get("items")
                        .get(0)
                        .get("image_url")
                        .asText()
        );
    }

    private void assertAdminOrderImage(
            User admin,
            long orderId,
            String expectedImageUrl
    ) throws Exception {
        Result detail = call(
                "GET",
                "/api/v1/admin/orders/" + orderId,
                admin.token(),
                null
        );

        assertEquals(200, detail.status(), detail.body());
        assertEquals(
                expectedImageUrl,
                detail.data()
                        .get("data")
                        .get("items")
                        .get(0)
                        .get("image_url")
                        .asText()
        );
    }

    @AfterEach
    void cleanProductImages() {
        for (CatalogFixture fixture : fixtures) {
            db.update(
                    "DELETE FROM product_images WHERE product_id=?",
                    fixture.productId()
            );
        }
    }
}
