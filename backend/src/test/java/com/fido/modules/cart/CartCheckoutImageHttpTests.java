package com.fido.modules.cart;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

class CartCheckoutImageHttpTests extends CartHttpSupport {

    @Test
    void currentCoverIsReturnedAsCartAndCheckoutThumbnail() throws Exception {
        User user = user();
        CatalogFixture fixture = sellableVariant();
        String cover = "https://cdn.example.test/products/cover.jpg";

        insertImage(fixture.productId(), cover, 0);
        addToCart(user, fixture);

        JsonNode cartItem = cartItem(user);
        assertEquals(cover, cartItem.get("thumbnail").asText());
        assertEquals(cover, cartItem.get("image_url").asText());

        JsonNode checkoutItem = checkoutItem(user);
        assertEquals(cover, checkoutItem.get("thumbnail").asText());
    }

    @Test
    void productWithoutImageReturnsNullThumbnail() throws Exception {
        User user = user();
        CatalogFixture fixture = sellableVariant();
        addToCart(user, fixture);

        JsonNode cartItem = cartItem(user);
        assertTrue(cartItem.get("thumbnail").isNull());
        assertTrue(cartItem.get("image_url").isNull());

        JsonNode checkoutItem = checkoutItem(user);
        assertTrue(checkoutItem.get("thumbnail").isNull());
    }

    @Test
    void changedCoverIsVisibleOnNextCartAndCheckoutRead() throws Exception {
        User user = user();
        CatalogFixture fixture = sellableVariant();
        String previousCover = "https://cdn.example.test/products/cover-a.jpg";
        String nextCover = "https://cdn.example.test/products/cover-b.jpg";

        insertImage(fixture.productId(), previousCover, 0);
        insertImage(fixture.productId(), nextCover, 1);
        addToCart(user, fixture);

        assertEquals(
                previousCover,
                cartItem(user).get("thumbnail").asText()
        );

        moveCover(
                fixture.productId(),
                previousCover,
                nextCover
        );

        assertEquals(
                nextCover,
                cartItem(user).get("thumbnail").asText()
        );
        assertEquals(
                nextCover,
                checkoutItem(user).get("thumbnail").asText()
        );
    }

    @Test
    void deletingPreviousCoverPromotesCurrentCoverOnNextRead() throws Exception {
        User user = user();
        CatalogFixture fixture = sellableVariant();
        String previousCover = "https://cdn.example.test/products/cover-delete.jpg";
        String promotedCover = "https://cdn.example.test/products/cover-promoted.jpg";

        insertImage(fixture.productId(), previousCover, 0);
        insertImage(fixture.productId(), promotedCover, 1);
        addToCart(user, fixture);

        assertEquals(
                previousCover,
                cartItem(user).get("thumbnail").asText()
        );

        db.update(
                "DELETE FROM product_images WHERE product_id=? AND image_url=?",
                fixture.productId(),
                previousCover
        );
        db.update(
                """
                UPDATE product_images
                SET sort_order=0
                WHERE product_id=? AND image_url=?
                """,
                fixture.productId(),
                promotedCover
        );

        assertEquals(
                promotedCover,
                cartItem(user).get("thumbnail").asText()
        );
        assertEquals(
                promotedCover,
                checkoutItem(user).get("thumbnail").asText()
        );
    }

    private CatalogFixture sellableVariant() {
        return createVariant(
                "ON_SALE",
                "ON_SALE",
                5,
                100000,
                90000
        );
    }

    private void addToCart(User user, CatalogFixture fixture) throws Exception {
        Result response = call(
                "POST",
                "/api/v1/cart/items",
                user.token(),
                Map.of(
                        "variant_id", fixture.variantId(),
                        "quantity", 1
                )
        );

        assertEquals(200, response.status(), response.body());
    }

    private JsonNode cartItem(User user) throws Exception {
        Result response = call(
                "GET",
                "/api/v1/cart",
                user.token(),
                null
        );

        assertEquals(200, response.status(), response.body());
        return response.data()
                .get("data")
                .get("items")
                .get(0);
    }

    private JsonNode checkoutItem(User user) throws Exception {
        Result response = call(
                "POST",
                "/api/v1/checkout/quote",
                user.token(),
                Map.of(
                        "recipient_phone", "0900000000",
                        "recipient_address", "Hanoi"
                )
        );

        assertEquals(200, response.status(), response.body());
        return response.data()
                .get("data")
                .get("items")
                .get(0);
    }

    private void insertImage(
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
    }

    private void moveCover(
            long productId,
            String previousCover,
            String nextCover
    ) {
        db.update(
                """
                UPDATE product_images
                SET sort_order=sort_order+10
                WHERE product_id=?
                """,
                productId
        );
        db.update(
                """
                UPDATE product_images
                SET sort_order=1
                WHERE product_id=? AND image_url=?
                """,
                productId,
                previousCover
        );
        db.update(
                """
                UPDATE product_images
                SET sort_order=0
                WHERE product_id=? AND image_url=?
                """,
                productId,
                nextCover
        );
    }
}
