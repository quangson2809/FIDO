package com.fido.modules.cart;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import java.util.Map;

class CheckoutQuoteHttpTests extends CartHttpSupport {

    @Test
    void voucherlessQuoteRevalidatesPriceInventoryAndHasNoSideEffects() throws Exception {
        User owner = user();

        CatalogFixture active = createVariant("ON_SALE", "ON_SALE", 5, 100000, 90000);

        assertEquals(
                200,
                call(
                                "POST",
                                "/api/v1/cart/items",
                                owner.token(),
                                Map.of("product_id", active.productId(), "quantity", 2))
                        .status());

        db.update(
                """
                UPDATE products SET selling_price=80000, updated_at=CURRENT_TIMESTAMP WHERE id=?
                """,
                active.productId());

        long inventoryBefore =
                db.queryForObject(
                        """
                        SELECT quantity_on_hand
                        FROM inventories
                        WHERE product_id=?
                        """,
                        Long.class,
                        active.productId());

        int ledgerBefore =
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM inventory_transactions
                        WHERE product_id=?
                        """,
                        Integer.class,
                        active.productId());

        int orderCountBefore = db.queryForObject("SELECT COUNT(*) FROM orders", Integer.class);

        var quote =
                call(
                        "POST",
                        "/api/v1/checkout/quote",
                        owner.token(),
                        Map.of(
                                "recipient_phone", "0900000000",
                                "recipient_name", "Test Recipient", "province", "Hanoi", "district", "Cau Giay", "ward", "Dich Vong", "address_line", "Cau Giay, Hanoi"));

        assertEquals(200, quote.status(), quote.body());
        assertEquals(160000, quote.data().get("data").get("subtotal").asInt());
        assertEquals(0, quote.data().get("data").get("discount_amount").asInt());
        assertEquals(30000, quote.data().get("data").get("shipping_fee").asInt());
        assertEquals(190000, quote.data().get("data").get("total_amount").asInt());
        assertTrue(quote.data().get("data").get("voucher").isNull());

        assertEquals(
                orderCountBefore, db.queryForObject("SELECT COUNT(*) FROM orders", Integer.class));
        assertEquals(
                inventoryBefore,
                db.queryForObject(
                        """
                        SELECT quantity_on_hand
                        FROM inventories
                        WHERE product_id=?
                        """,
                        Long.class,
                        active.productId()));
        assertEquals(
                ledgerBefore,
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM inventory_transactions
                        WHERE product_id=?
                        """,
                        Integer.class,
                        active.productId()));

        assertEquals(
                409,
                call(
                                "POST",
                                "/api/v1/checkout/quote",
                                owner.token(),
                                Map.of(
                                        "recipient_phone", "0900000000",
                                        "recipient_name", "Test Recipient", "province", "Hanoi", "district", "Cau Giay", "ward", "Dich Vong", "address_line", "Hanoi",
                                        "voucher_code", "TBD-VOUCHER"))
                        .status());

        db.update(
                """
                UPDATE inventories
                SET quantity_on_hand=1,
                    updated_at=CURRENT_TIMESTAMP
                WHERE product_id=?
                """,
                active.productId());

        assertEquals(
                409,
                call(
                                "POST",
                                "/api/v1/checkout/quote",
                                owner.token(),
                                Map.of(
                                        "recipient_phone", "0900000000",
                                        "recipient_name", "Test Recipient", "province", "Hanoi", "district", "Cau Giay", "ward", "Dich Vong", "address_line", "Hanoi"))
                        .status());

        db.update(
                """
                UPDATE inventories
                SET quantity_on_hand=5,
                    updated_at=CURRENT_TIMESTAMP
                WHERE product_id=?
                """,
                active.productId());

        db.update(
                """
                UPDATE products SET status='INACTIVE', updated_at=CURRENT_TIMESTAMP WHERE id=?
                """,
                active.productId());

        assertEquals(
                409,
                call(
                                "POST",
                                "/api/v1/checkout/quote",
                                owner.token(),
                                Map.of(
                                        "recipient_phone", "0900000000",
                                        "recipient_name", "Test Recipient", "province", "Hanoi", "district", "Cau Giay", "ward", "Dich Vong", "address_line", "Hanoi"))
                        .status());
    }

    @Test
    void quoteDoesNotCreateCartWhenAuthenticatedCartDoesNotExist() throws Exception {
        User owner = user();

        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM carts WHERE account_id=?",
                        Integer.class,
                        owner.accountId()));

        int ordersBefore = db.queryForObject("SELECT COUNT(*) FROM orders", Integer.class);

        assertEquals(
                409,
                call(
                                "POST",
                                "/api/v1/checkout/quote",
                                owner.token(),
                                Map.of(
                                        "recipient_phone", "0900000000",
                                        "recipient_name", "Test Recipient", "province", "Hanoi", "district", "Cau Giay", "ward", "Dich Vong", "address_line", "Hanoi"))
                        .status());

        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM carts WHERE account_id=?",
                        Integer.class,
                        owner.accountId()));

        assertEquals(ordersBefore, db.queryForObject("SELECT COUNT(*) FROM orders", Integer.class));
    }
}
