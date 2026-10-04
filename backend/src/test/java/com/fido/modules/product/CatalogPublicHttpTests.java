package com.fido.modules.product;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.Map;
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
    void productImagesFollowApprovedReadModelContract() throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        var fixture = createCatalog(writer);

        var createdImage = fixture.createProductResponse()
                .data()
                .get("data")
                .get("images")
                .get(0);
        assertEquals("https://example.test/shirt.png", createdImage.get("image_url").asText());
        assertEquals("shirt", createdImage.get("alt_text").asText());
        assertEquals(0, createdImage.get("sort_order").asInt());

        var detail = call(
                "GET",
                "/api/v1/catalog/products/" + fixture.productId(),
                null,
                null
        );
        assertEquals(200, detail.status(), detail.body());
        assertEquals(
                "https://example.test/shirt.png",
                detail.data().get("data").get("images").get(0).get("image_url").asText()
        );
        assertEquals(
                0,
                detail.data().get("data").get("images").get(0).get("sort_order").asInt()
        );

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
