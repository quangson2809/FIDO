package com.fido.modules.cart;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

class CartItemHttpTests extends CartHttpSupport {

    @Test
    void itemLifecycleEnforcesOwnershipSellabilityAndNoStockReservation()
            throws Exception {
        User owner = user();
        User other = user();

        CatalogFixture active = createVariant(
                "ON_SALE",
                "ON_SALE",
                5,
                100000,
                90000
        );

        CatalogFixture stopped = createVariant(
                "ON_SALE",
                "STOPPED",
                10,
                120000,
                null
        );

        CatalogFixture outOfStock = createVariant(
                "ON_SALE",
                "ON_SALE",
                0,
                130000,
                null
        );

        long inventoryBefore = db.queryForObject(
                """
                SELECT available_quantity
                FROM inventories
                WHERE variant_id=?
                """,
                Long.class,
                active.variantId()
        );

        int ledgerBefore = db.queryForObject(
                """
                SELECT COUNT(*)
                FROM inventory_transactions
                WHERE variant_id=?
                """,
                Integer.class,
                active.variantId()
        );

        var added = call(
                "POST",
                "/api/v1/cart/items",
                owner.token(),
                Map.of(
                        "variant_id", active.variantId(),
                        "quantity", 2
                )
        );

        assertEquals(
                200,
                added.status(),
                added.body()
        );

        long cartItemId = added.data()
                .get("data")
                .get("items")
                .get(0)
                .get("cart_item_id")
                .asLong();

        assertEquals(
                2,
                added.data()
                        .get("data")
                        .get("items")
                        .get(0)
                        .get("quantity")
                        .asInt()
        );

        assertEquals(
                90000,
                added.data()
                        .get("data")
                        .get("items")
                        .get(0)
                        .get("unit_price")
                        .asInt()
        );

        assertEquals(
                180000,
                added.data()
                        .get("data")
                        .get("subtotal")
                        .asInt()
        );

        var addedAgain = call(
                "POST",
                "/api/v1/cart/items",
                owner.token(),
                Map.of(
                        "variant_id", active.variantId(),
                        "quantity", 1
                )
        );

        assertEquals(
                3,
                addedAgain.data()
                        .get("data")
                        .get("items")
                        .get(0)
                        .get("quantity")
                        .asInt()
        );

        var patched = call(
                "PATCH",
                "/api/v1/cart/items/" + cartItemId,
                owner.token(),
                Map.of("quantity", 2)
        );

        assertEquals(200, patched.status());
        assertEquals(
                2,
                patched.data()
                        .get("data")
                        .get("items")
                        .get(0)
                        .get("quantity")
                        .asInt()
        );

        assertEquals(
                400,
                call(
                        "PATCH",
                        "/api/v1/cart/items/" + cartItemId,
                        owner.token(),
                        Map.of("quantity", 0)
                ).status()
        );

        call(
                "GET",
                "/api/v1/cart",
                other.token(),
                null
        );

        assertEquals(
                404,
                call(
                        "PATCH",
                        "/api/v1/cart/items/" + cartItemId,
                        other.token(),
                        Map.of("quantity", 1)
                ).status()
        );

        assertEquals(
                409,
                call(
                        "POST",
                        "/api/v1/cart/items",
                        owner.token(),
                        Map.of(
                                "variant_id", stopped.variantId(),
                                "quantity", 1
                        )
                ).status()
        );

        assertEquals(
                409,
                call(
                        "POST",
                        "/api/v1/cart/items",
                        owner.token(),
                        Map.of(
                                "variant_id", outOfStock.variantId(),
                                "quantity", 1
                        )
                ).status()
        );

        assertEquals(
                404,
                call(
                        "POST",
                        "/api/v1/cart/items",
                        owner.token(),
                        Map.of(
                                "variant_id", Long.MAX_VALUE,
                                "quantity", 1
                        )
                ).status()
        );

        assertEquals(
                inventoryBefore,
                db.queryForObject(
                        """
                        SELECT available_quantity
                        FROM inventories
                        WHERE variant_id=?
                        """,
                        Long.class,
                        active.variantId()
                )
        );

        assertEquals(
                ledgerBefore,
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM inventory_transactions
                        WHERE variant_id=?
                        """,
                        Integer.class,
                        active.variantId()
                )
        );

        db.update(
                """
                UPDATE product_variants
                SET override_price=80000,
                    updated_at=CURRENT_TIMESTAMP
                WHERE variant_id=?
                """,
                active.variantId()
        );

        var repriced = call(
                "GET",
                "/api/v1/cart",
                owner.token(),
                null
        );

        assertEquals(
                80000,
                repriced.data()
                        .get("data")
                        .get("items")
                        .get(0)
                        .get("unit_price")
                        .asInt()
        );

        assertEquals(
                160000,
                repriced.data()
                        .get("data")
                        .get("subtotal")
                        .asInt()
        );

        var deleted = call(
                "DELETE",
                "/api/v1/cart/items/" + cartItemId,
                owner.token(),
                null
        );

        assertEquals(200, deleted.status());
        assertEquals(
                0,
                deleted.data()
                        .get("data")
                        .get("items")
                        .size()
        );
        assertEquals(
                0,
                deleted.data()
                        .get("data")
                        .get("subtotal")
                        .asInt()
        );

        assertEquals(
                200,
                call(
                        "DELETE",
                        "/api/v1/cart",
                        owner.token(),
                        null
                ).status()
        );
    }
}
