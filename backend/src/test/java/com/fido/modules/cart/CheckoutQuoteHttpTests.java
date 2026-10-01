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

class CheckoutQuoteHttpTests extends CartHttpSupport {

    @Test
    void voucherlessQuoteRevalidatesPriceInventoryAndHasNoSideEffects()
            throws Exception {
        User owner = user();

        CatalogFixture active = createVariant(
                "ON_SALE",
                "ON_SALE",
                5,
                100000,
                90000
        );

        assertEquals(
                200,
                call(
                        "POST",
                        "/api/v1/cart/items",
                        owner.token(),
                        Map.of(
                                "variant_id", active.variantId(),
                                "quantity", 2
                        )
                ).status()
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

        int orderCountBefore = db.queryForObject(
                "SELECT COUNT(*) FROM orders",
                Integer.class
        );

        var quote = call(
                "POST",
                "/api/v1/checkout/quote",
                owner.token(),
                Map.of(
                        "recipient_phone", "0900000000",
                        "recipient_email", "buyer@example.test",
                        "recipient_address", "Cau Giay, Hanoi"
                )
        );

        assertEquals(
                200,
                quote.status(),
                quote.body()
        );
        assertEquals(
                160000,
                quote.data()
                        .get("data")
                        .get("subtotal")
                        .asInt()
        );
        assertEquals(
                0,
                quote.data()
                        .get("data")
                        .get("discount")
                        .asInt()
        );
        assertEquals(
                30000,
                quote.data()
                        .get("data")
                        .get("shipping_fee")
                        .asInt()
        );
        assertEquals(
                190000,
                quote.data()
                        .get("data")
                        .get("total")
                        .asInt()
        );
        assertTrue(
                quote.data()
                        .get("data")
                        .get("voucher")
                        .isNull()
        );

        assertEquals(
                orderCountBefore,
                db.queryForObject(
                        "SELECT COUNT(*) FROM orders",
                        Integer.class
                )
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

        assertEquals(
                501,
                call(
                        "POST",
                        "/api/v1/checkout/quote",
                        owner.token(),
                        Map.of(
                                "recipient_phone", "0900000000",
                                "recipient_address", "Hanoi",
                                "voucher_code", "TBD-VOUCHER"
                        )
                ).status()
        );

        db.update(
                """
                UPDATE inventories
                SET available_quantity=1,
                    updated_at=CURRENT_TIMESTAMP
                WHERE variant_id=?
                """,
                active.variantId()
        );

        assertEquals(
                409,
                call(
                        "POST",
                        "/api/v1/checkout/quote",
                        owner.token(),
                        Map.of(
                                "recipient_phone", "0900000000",
                                "recipient_address", "Hanoi"
                        )
                ).status()
        );

        db.update(
                """
                UPDATE inventories
                SET available_quantity=5,
                    updated_at=CURRENT_TIMESTAMP
                WHERE variant_id=?
                """,
                active.variantId()
        );

        db.update(
                """
                UPDATE product_variants
                SET sale_status='STOPPED',
                    updated_at=CURRENT_TIMESTAMP
                WHERE variant_id=?
                """,
                active.variantId()
        );

        assertEquals(
                409,
                call(
                        "POST",
                        "/api/v1/checkout/quote",
                        owner.token(),
                        Map.of(
                                "recipient_phone", "0900000000",
                                "recipient_address", "Hanoi"
                        )
                ).status()
        );
    }

    @Test
    void quoteDoesNotCreateCartWhenAuthenticatedCartDoesNotExist()
            throws Exception {
        User owner = user();

        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM carts WHERE account_id=?",
                        Integer.class,
                        owner.accountId()
                )
        );

        int ordersBefore = db.queryForObject(
                "SELECT COUNT(*) FROM orders",
                Integer.class
        );

        assertEquals(
                409,
                call(
                        "POST",
                        "/api/v1/checkout/quote",
                        owner.token(),
                        Map.of(
                                "recipient_phone", "0900000000",
                                "recipient_address", "Hanoi"
                        )
                ).status()
        );

        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM carts WHERE account_id=?",
                        Integer.class,
                        owner.accountId()
                )
        );

        assertEquals(
                ordersBefore,
                db.queryForObject(
                        "SELECT COUNT(*) FROM orders",
                        Integer.class
                )
        );
    }
}
