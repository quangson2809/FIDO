package com.fido.modules.product;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CatalogPublicHttpTests extends CatalogHttpSupport {

    @Test
    void publicCatalogFiltersPricesAndSaleState() throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        var fixture = createCatalog(writer);
        long sizeM = fixture.sizeM();
        long colorId = fixture.colorId();
        long productId = fixture.productId();
        long variantId = fixture.variantId();
        db.update("""
                UPDATE inventories
                SET available_quantity = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE variant_id = ?
                """, 5, variantId);

        var list = call(
                "GET",
                "/api/v1/catalog/products"
                        + "?q=FIDO"
                        + "&min_price=85000"
                        + "&max_price=95000"
                        + "&size_value_id=" + sizeM
                        + "&color_id=" + colorId,
                null,
                null
        );
        assertEquals(200, list.status(), list.body());
        assertEquals(1, list.data().get("meta").get("total").asInt());

        var detail = call("GET", "/api/v1/catalog/products/" + productId, null, null);
        assertEquals(200, detail.status(), detail.body());
        assertEquals(90000, detail.data().get("data").get("variants").get(0)
                .get("effective_price").asInt());
        assertEquals(5, detail.data().get("data").get("variants").get(0)
                .get("available_quantity").asInt());
        assertEquals(200, call("GET", "/api/v1/catalog/meta", null, null).status());

        assertEquals(200, call(
                "PATCH",
                "/api/v1/admin/products/" + productId + "/variants/" + variantId,
                writer.token(),
                Map.of("sale_status", "STOPPED")
        ).status());

        var stoppedList = call("GET", "/api/v1/catalog/products?q=FIDO", null, null);
        assertEquals(0, stoppedList.data().get("meta").get("total").asInt());

        var stoppedDetail = call("GET", "/api/v1/catalog/products/" + productId, null, null);
        assertEquals("STOPPED", stoppedDetail.data().get("data").get("variants").get(0)
                .get("sale_status").asText());
        assertEquals(5, stoppedDetail.data().get("data").get("variants").get(0)
                .get("available_quantity").asInt());
    }

    @Test
    void categoryBrowseIncludesDeepDescendantsButNotUnrelatedOrStoppedProducts() throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        long rootId = createCategory(writer, null);
        long branchId = createCategory(writer, rootId);
        long emptySiblingId = createCategory(writer, rootId);
        var child = createCatalog(writer);
        var unrelated = createCatalog(writer);
        db.update("UPDATE categories SET parent_category_id=? WHERE category_id=?",
                branchId, child.categoryId());

        for (long categoryId : new long[] { rootId, branchId, child.categoryId() }) {
            var response = call("GET", "/api/v1/catalog/products?category_id=" + categoryId
                    + "&page_size=1", null, null);
            assertEquals(200, response.status(), response.body());
            assertEquals(1, response.data().get("meta").get("total").asInt());
            assertEquals(child.productId(), response.data().get("data").get(0)
                    .get("product_id").asLong());
        }
        var unrelatedList = call("GET", "/api/v1/catalog/products?category_id="
                + unrelated.categoryId(), null, null);
        assertEquals(unrelated.productId(), unrelatedList.data().get("data").get(0)
                .get("product_id").asLong());
        var siblingList = call("GET", "/api/v1/catalog/products?category_id="
                + emptySiblingId, null, null);
        assertEquals(0, siblingList.data().get("meta").get("total").asInt());
        var unknown = call("GET", "/api/v1/catalog/products?category_id=9223372036854775807", null, null);
        assertEquals(200, unknown.status(), unknown.body());
        assertEquals(0, unknown.data().get("meta").get("total").asInt());

        db.update("UPDATE products SET sale_status='STOPPED' WHERE product_id=?", child.productId());
        var stopped = call("GET", "/api/v1/catalog/products?category_id=" + rootId, null, null);
        assertEquals(0, stopped.data().get("meta").get("total").asInt());
    }

    private long createCategory(Employee writer, Long parentId) throws Exception {
        var body = new java.util.HashMap<String, Object>();
        body.put("name", "Category " + UUID.randomUUID());
        if (parentId != null) body.put("parent_category_id", parentId);
        var created = call("POST", "/api/v1/admin/categories", writer.token(), body);
        assertEquals(201, created.status(), created.body());
        long id = created.data().get("data").get("category_id").asLong();
        categories.add(id);
        return id;
    }

    @Test
    void productImagesFollowApprovedReadModelContract() throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        var fixture = createCatalog(writer);

        assertEquals(
                0,
                fixture.createProductResponse()
                        .data()
                        .get("data")
                        .get("images")
                        .size()
        );

        var detail = call(
                "GET",
                "/api/v1/catalog/products/" + fixture.productId(),
                null,
                null
        );
        assertEquals(200, detail.status(), detail.body());
        var currentImage = detail.data().get("data").get("images").get(0);
        assertEquals(
                "https://example.test/shirt.png",
                currentImage.get("image_url").asText()
        );
        assertEquals("shirt", currentImage.get("alt_text").asText());
        assertEquals(0, currentImage.get("sort_order").asInt());

        var list = call("GET", "/api/v1/catalog/products?q=FIDO", null, null);
        assertEquals(200, list.status(), list.body());
        var summary = list.data().get("data").get(0);
        assertEquals(
                "https://example.test/shirt.png",
                summary.get("thumbnail").asText()
        );
        assertFalse(summary.has("images"));
        assertFalse(summary.has("image_url"));
    }
}
