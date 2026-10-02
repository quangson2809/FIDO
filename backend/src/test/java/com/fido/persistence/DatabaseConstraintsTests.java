package com.fido.persistence;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import java.sql.SQLException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@Sql("/persistence-fixture.sql")
class DatabaseConstraintsTests {
    @Autowired JdbcTemplate jdbc;

    private void rejects(String sql) {
        DataAccessException failure = assertThrows(DataAccessException.class, () -> jdbc.update(sql), sql);
        Throwable cause = failure.getMostSpecificCause();
        assertInstanceOf(SQLException.class, cause);
        SQLException databaseError = (SQLException) cause;
        // MySQL reports CHECK violations as HY000 / 3819 rather than SQLSTATE class 23.
        assertTrue((databaseError.getSQLState() != null && databaseError.getSQLState().startsWith("23"))
                || ("HY000".equals(databaseError.getSQLState()) && databaseError.getErrorCode() == 3819),
                () -> "Expected integrity violation, got " + databaseError.getSQLState()
                        + " / " + databaseError.getErrorCode() + " for " + sql);
    }

    @Test
    void negativeStockNonPositiveQuantitiesAndZeroMovementFail() {
        rejects("UPDATE inventories SET available_quantity=-1 WHERE variant_id=1");
        for (String table : new String[]{"cart_items","order_items","goods_receipt_items"}) {
            rejects("UPDATE " + table + " SET quantity=0");
            rejects("UPDATE " + table + " SET quantity=-1");
        }
        rejects("UPDATE inventory_transactions SET quantity_delta=0 WHERE txn_id=1");
        assertEquals(10, jdbc.queryForObject("SELECT available_quantity FROM inventories WHERE variant_id=1", Integer.class));
    }

    @Test
    void allMoneyColumnsRejectNegativeValues() {
        for (String field : new String[]{"products.base_price", "product_variants.override_price",
                "orders.subtotal_snapshot", "orders.discount_snapshot", "orders.shipping_fee_snapshot", "orders.total_snapshot",
                "order_items.unit_price_snapshot", "order_items.line_total_snapshot", "payments.amount_due",
                "payments.amount_received", "payments.amount_refunded"}) {
            String[] parts = field.split("\\.");
            rejects("UPDATE " + parts[0] + " SET " + parts[1] + "=-0.01");
        }
    }

    @Test
    void compoundUniqueConstraintsAndSharedPrimaryKeysAreEnforced() {
        rejects("INSERT INTO product_variants VALUES (2,1,1,1,NULL,NULL,'fixture-status',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)");
        rejects("INSERT INTO size_values VALUES (2,1,'M','Duplicate',2)");
        rejects("INSERT INTO cart_items VALUES (2,1,1,1)");
        rejects("INSERT INTO goods_receipt_items VALUES (2,1,1,1)");
        rejects("INSERT INTO inventories VALUES (1,0,CURRENT_TIMESTAMP)");
        rejects("INSERT INTO account_roles VALUES (1,101)");
        rejects("INSERT INTO role_permissions VALUES (101,1)");
        rejects("INSERT INTO payments SELECT * FROM payments");
        rejects("INSERT INTO shipping_infos SELECT * FROM shipping_infos");
    }

    @Test
    void productImageSortOrderIsRequiredAndUniquePerProduct() {
        rejects("INSERT INTO product_images VALUES (2,1,'https://example.invalid/duplicate.png',NULL,0)");
        rejects("INSERT INTO product_images VALUES (3,1,'https://example.invalid/null-sort.png',NULL,NULL)");
    }

    @Test
    void foreignKeysStatesAndVoucherAccountConstraintAreEnforced() {
        rejects("UPDATE addresses SET account_id=999");
        rejects("UPDATE product_variants SET size_value_id=999");
        rejects("UPDATE product_variants SET color_id=999");
        rejects("UPDATE inventory_transactions SET actor_account_id=999");
        rejects("UPDATE orders SET order_status='DELIVERED'");
        rejects("UPDATE payments SET payment_status='UNKNOWN'");
        rejects("UPDATE goods_receipts SET receipt_status='UNKNOWN'");
        rejects("UPDATE orders SET voucher_id=1,customer_account_id=NULL");
        rejects("DELETE FROM product_variants WHERE variant_id=1");
        rejects("DELETE FROM accounts WHERE account_id=1");
    }

    @Test
    void catalogEditsDoNotRewriteHistoricalSnapshotsOrPaymentState() {
        jdbc.update("UPDATE products SET name='Changed',base_price=999 WHERE product_id=1");
        assertEquals("Historical product", jdbc.queryForObject("SELECT product_name_snapshot FROM order_items WHERE order_item_id=1",String.class));
        assertEquals(0, jdbc.queryForObject("SELECT unit_price_snapshot FROM order_items WHERE order_item_id=1",java.math.BigDecimal.class).compareTo(new java.math.BigDecimal("100.00")));
        assertEquals("UNPAID", jdbc.queryForObject("SELECT payment_status FROM payments WHERE order_id=1",String.class));
    }
}
