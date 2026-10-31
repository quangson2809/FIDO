package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.Map;

class OrderImageSnapshotHttpTests extends OrderHttpSupport {
    private final List<Long> attributeIds = new ArrayList<>();
    private final List<Long> optionIds = new ArrayList<>();

    @Test
    void createdOrderKeepsImageSnapshotAfterCoverChangeAndDeletion() throws Exception {
        User customer = user();
        User root = superadmin();
        CatalogFixture fixture = createVariant(5, 100000, 90000);

        String coverA = "https://cdn.example.test/orders/cover-a.jpg";
        String coverB = "https://cdn.example.test/orders/cover-b.jpg";
        long imageA = insertImage(fixture.productId(), coverA, 0);
        long imageB = insertImage(fixture.productId(), coverB, 1);

        long orderId = createOrder(customer, fixture, 1);

        assertEquals(imageA, currentPrimaryId(fixture.productId()));
        assertEquals(
                coverA,
                db.queryForObject(
                        "SELECT image_url_snapshot FROM order_items WHERE order_id=?",
                        String.class,
                        orderId));

        var changedCover =
                call(
                        "PATCH",
                        "/api/v1/admin/products/" + fixture.productId() + "/images",
                        root.token(),
                        Map.of(
                                "images",
                                List.of(
                                        Map.of("image_id", imageB, "sort_order", 0),
                                        Map.of("image_id", imageA, "sort_order", 1))));

        assertEquals(200, changedCover.status(), changedCover.body());
        assertEquals(coverB, currentCover(fixture.productId()));
        assertEquals(imageB, currentPrimaryId(fixture.productId()));
        assertOrderImage(customer, orderId, coverA);
        assertAdminOrderImage(root, orderId, coverA);
        assertOrderListImage(customer, "/api/v1/me/orders", orderId, coverA);
        assertOrderListImage(root, "/api/v1/admin/orders", orderId, coverA);

        var deletedPreviousCover =
                call(
                        "DELETE",
                        "/api/v1/admin/products/" + fixture.productId() + "/images/" + imageA,
                        root.token(),
                        null);

        assertEquals(204, deletedPreviousCover.status(), deletedPreviousCover.body());
        assertEquals(coverB, currentCover(fixture.productId()));
        assertEquals(imageB, currentPrimaryId(fixture.productId()));
        assertOrderImage(customer, orderId, coverA);
        assertAdminOrderImage(root, orderId, coverA);
        assertOrderListImage(customer, "/api/v1/me/orders", orderId, coverA);
        assertOrderListImage(root, "/api/v1/admin/orders", orderId, coverA);
    }

    @Test
    void orderDetailsExposeFrozenOptionSnapshotAfterAttributeChanges() throws Exception {
        User customer = user();
        User admin = superadmin();
        CatalogFixture fixture = createVariant(5, 100000, 90000);
        String code = "ORDER_MATERIAL_" + UUID.randomUUID().toString().replace("-", "");
        db.update("INSERT INTO attributes(code,name,is_required,is_variant_defining,sort_order) "
                + "VALUES (?,'Order material',FALSE,FALSE,0)", code);
        long attributeId = db.queryForObject("SELECT id FROM attributes WHERE code=?", Long.class, code);
        attributeIds.add(attributeId);
        db.update("INSERT INTO attribute_options(attribute_id,`value`,label,sort_order) "
                + "VALUES (?,'COTTON','Cotton',0)", attributeId);
        long optionId = db.queryForObject("SELECT id FROM attribute_options WHERE attribute_id=?",
                Long.class, attributeId);
        optionIds.add(optionId);
        db.update("INSERT INTO product_attribute_values(product_id,attribute_id,option_id) "
                + "VALUES (?,?,?)", fixture.productId(), attributeId, optionId);

        long orderId = createOrder(customer, fixture, 1);
        String saved = db.queryForObject("SELECT attribute_snapshot FROM order_items WHERE order_id=?",
                String.class, orderId);
        var entries = json.readTree(saved);
        assertEquals(1, entries.size());
        assertEquals(optionId, entries.get(0).get("attribute_value_id").asLong());
        assertEquals("COTTON", entries.get(0).get("option_value_snapshot").asText());

        assertOrderAttributes("/api/v1/me/orders/" + orderId, customer.token(), saved);
        assertOrderAttributes("/api/v1/admin/orders/" + orderId, admin.token(), saved);
        db.update("UPDATE attributes SET name='Renamed material' WHERE id=?", attributeId);
        db.update("UPDATE attribute_options SET label='Updated cotton' WHERE id=?", optionId);
        assertOrderAttributes("/api/v1/me/orders/" + orderId, customer.token(), saved);
        assertOrderAttributes("/api/v1/admin/orders/" + orderId, admin.token(), saved);
    }

    private void assertOrderAttributes(String path, String token, String expected) throws Exception {
        Result detail = call("GET", path, token, null);
        assertEquals(200, detail.status(), detail.body());
        assertEquals(expected, detail.data().get("data").get("items").get(0)
                .get("attribute_snapshot").asText());
    }

    private long insertImage(long productId, String imageUrl, int sortOrder) {
        db.update(
                """
                INSERT INTO product_images(product_id,image_url,is_primary,sort_order) VALUES (?,?,?,?)
                """,
                productId,
                imageUrl,
                sortOrder == 0,
                sortOrder);

        return db.queryForObject(
                """
                SELECT id
                FROM product_images
                WHERE product_id=? AND image_url=?
                """,
                Long.class,
                productId,
                imageUrl);
    }

    private Long currentPrimaryId(long productId) {
        return db.queryForObject(
                "SELECT id FROM product_images WHERE product_id=? AND is_primary=TRUE",
                Long.class,
                productId);
    }

    private String currentCover(long productId) {
        return db.queryForObject(
                """
                SELECT image_url
                FROM product_images
                WHERE product_id=? AND sort_order=0
                """,
                String.class,
                productId);
    }

    private void assertOrderImage(User customer, long orderId, String expectedImageUrl)
            throws Exception {
        Result detail = call("GET", "/api/v1/me/orders/" + orderId, customer.token(), null);

        assertEquals(200, detail.status(), detail.body());
        assertEquals(
                expectedImageUrl,
                detail.data().get("data").get("items").get(0).get("image_url").asText());
    }

    private void assertAdminOrderImage(User admin, long orderId, String expectedImageUrl)
            throws Exception {
        Result detail = call("GET", "/api/v1/admin/orders/" + orderId, admin.token(), null);

        assertEquals(200, detail.status(), detail.body());
        assertEquals(
                expectedImageUrl,
                detail.data().get("data").get("items").get(0).get("image_url").asText());
    }

    private void assertOrderListImage(
            User viewer, String path, long orderId, String expectedImageUrl) throws Exception {
        Result list = call("GET", path, viewer.token(), null);

        assertEquals(200, list.status(), list.body());
        JsonNode summary = null;
        for (JsonNode candidate : list.data().get("data")) {
            if (candidate.get("order_id").asLong() == orderId) {
                summary = candidate;
                break;
            }
        }

        assertNotNull(summary, "Order summary is missing from list response");
        assertEquals(expectedImageUrl, summary.get("image_url").asText());
    }

    @AfterEach
    void cleanProductImages() {
        for (CatalogFixture fixture : fixtures) {
            db.update("DELETE FROM product_attribute_values WHERE product_id=?", fixture.productId());
            db.update("DELETE FROM product_images WHERE product_id=?", fixture.productId());
        }
        for (Long optionId : optionIds) db.update("DELETE FROM attribute_options WHERE id=?", optionId);
        for (Long attributeId : attributeIds) db.update("DELETE FROM attributes WHERE id=?", attributeId);
    }
}
