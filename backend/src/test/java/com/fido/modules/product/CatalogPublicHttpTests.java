package com.fido.modules.product;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
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
        db.update(
                """
                UPDATE inventories
                SET available_quantity = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE variant_id = ?
                """,
                5,
                variantId
        );

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

        assertEquals(
                200,
                list.status(),
                list.body()
        );

        assertEquals(
                1,
                list.data()
                        .get("meta")
                        .get("total")
                        .asInt()
        );

        var detail = call(
                "GET",
                "/api/v1/catalog/products/" + productId,
                null,
                null
        );

        assertEquals(
                200,
                detail.status(),
                detail.body()
        );

        assertEquals(
                90000,
                detail.data()
                        .get("data")
                        .get("variants")
                        .get(0)
                        .get("effective_price")
                        .asInt()
        );

        assertEquals(
                5,
                detail.data()
                        .get("data")
                        .get("variants")
                        .get(0)
                        .get("available_quantity")
                        .asInt()
        );

        assertEquals(
                200,
                call(
                        "GET",
                        "/api/v1/catalog/meta",
                        null,
                        null
                ).status()
        );

        // STOPPED and zero stock remain separate concepts.
        assertEquals(
                200,
                call(
                        "PATCH",
                        "/api/v1/admin/products/"
                                + productId
                                + "/variants/"
                                + variantId,
                        writer.token(),
                        Map.of("sale_status", "STOPPED")
                ).status()
        );

        var stoppedList = call(
                "GET",
                "/api/v1/catalog/products?q=FIDO",
                null,
                null
        );

        assertEquals(
                0,
                stoppedList.data()
                        .get("meta")
                        .get("total")
                        .asInt()
        );

        var stoppedDetail = call(
                "GET",
                "/api/v1/catalog/products/" + productId,
                null,
                null
        );

        assertEquals(
                "STOPPED",
                stoppedDetail.data()
                        .get("data")
                        .get("variants")
                        .get(0)
                        .get("sale_status")
                        .asText()
        );

        assertEquals(
                5,
                stoppedDetail.data()
                        .get("data")
                        .get("variants")
                        .get(0)
                        .get("available_quantity")
                        .asInt()
        );
    }

    @Test
    void productImagesPreserveRequestOrderAndExposePrimaryImage() throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        var fixture = createCatalog(writer);
        long productId = fixture.productId();

        String front = "https://example.test/front.png";
        String back = "https://example.test/back.png";

        var update = call(
                "PATCH",
                "/api/v1/admin/products/" + productId,
                writer.token(),
                Map.of(
                        "images", List.of(
                                Map.of("image_url", front, "alt_text", "front"),
                                Map.of("image_url", back, "alt_text", "back")
                        )
                )
        );

        assertEquals(200, update.status(), update.body());
        assertEquals(
                List.of(0, 1),
                db.query(
                        "SELECT sort_order FROM product_images WHERE product_id=? ORDER BY sort_order",
                        (resultSet, rowNumber) -> resultSet.getInt(1),
                        productId
                )
        );
        assertEquals(
                List.of(front, back),
                db.query(
                        "SELECT image_url FROM product_images WHERE product_id=? ORDER BY sort_order",
                        (resultSet, rowNumber) -> resultSet.getString(1),
                        productId
                )
        );

        var list = call(
                "GET",
                "/api/v1/catalog/products?q=FIDO",
                null,
                null
        );
        assertEquals(200, list.status(), list.body());
        assertEquals(
                front,
                list.data()
                        .get("data")
                        .get(0)
                        .get("primary_image")
                        .asText()
        );

        var detail = call(
                "GET",
                "/api/v1/catalog/products/" + productId,
                null,
                null
        );
        assertEquals(200, detail.status(), detail.body());
        assertEquals(
                front,
                detail.data().get("data").get("images").get(0).get("image_url").asText()
        );
        assertEquals(
                back,
                detail.data().get("data").get("images").get(1).get("image_url").asText()
        );

        var reorder = call(
                "PATCH",
                "/api/v1/admin/products/" + productId,
                writer.token(),
                Map.of(
                        "images", List.of(
                                Map.of("image_url", back, "alt_text", "back"),
                                Map.of("image_url", front, "alt_text", "front")
                        )
                )
        );
        assertEquals(200, reorder.status(), reorder.body());

        assertEquals(
                List.of(back, front),
                db.query(
                        "SELECT image_url FROM product_images WHERE product_id=? ORDER BY sort_order",
                        (resultSet, rowNumber) -> resultSet.getString(1),
                        productId
                )
        );

        var listAfterReorder = call(
                "GET",
                "/api/v1/catalog/products?q=FIDO",
                null,
                null
        );
        assertEquals(
                back,
                listAfterReorder.data()
                        .get("data")
                        .get(0)
                        .get("primary_image")
                        .asText()
        );

        var detailAfterReorder = call(
                "GET",
                "/api/v1/catalog/products/" + productId,
                null,
                null
        );
        assertEquals(
                back,
                detailAfterReorder.data().get("data").get("images").get(0).get("image_url").asText()
        );
        assertEquals(
                front,
                detailAfterReorder.data().get("data").get("images").get(1).get("image_url").asText()
        );
    }
}
