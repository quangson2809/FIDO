package com.fido.persistence;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;

import java.sql.SQLException;

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
        SQLException error = (SQLException) cause;
        assertTrue(
                (error.getSQLState() != null && error.getSQLState().startsWith("23"))
                        || ("HY000".equals(error.getSQLState()) && error.getErrorCode() == 3819),
                () -> "Expected integrity violation, got " + error.getSQLState()
                        + " / " + error.getErrorCode() + " for " + sql);
    }

    @Test
    void negativeStockNonPositiveQuantitiesAndZeroMovementFail() {
        rejects("UPDATE inventories SET quantity_on_hand=-1 WHERE warehouse_id=1 AND product_id=1");
        rejects("UPDATE cart_items SET quantity=0 WHERE id=1");
        rejects("UPDATE cart_items SET quantity=-1 WHERE id=1");
        rejects("UPDATE order_items SET quantity=0 WHERE id=1");
        rejects("UPDATE order_items SET quantity=-1 WHERE id=1");
        rejects("UPDATE goods_receipt_items SET quantity_received=0 WHERE id=1");
        rejects("UPDATE goods_receipt_items SET quantity_received=-1 WHERE id=1");
        rejects("UPDATE inventory_transactions SET quantity_delta=0 WHERE id=1");
        assertEquals(10, jdbc.queryForObject(
                "SELECT quantity_on_hand FROM inventories WHERE warehouse_id=1 AND product_id=1",
                Integer.class));
    }

    @Test
    void everyTargetMoneyColumnRejectsNegativeValues() {
        for (String field : new String[] {
                "products.selling_price",
                "products.cost_price",
                "orders.subtotal",
                "orders.discount_amount",
                "orders.shipping_fee",
                "orders.total_amount",
                "order_items.unit_price",
                "order_items.discount_amount",
                "order_items.line_total",
                "payments.amount",
                "payments.refund_amount",
                "vouchers.discount_value",
                "vouchers.minimum_order_value",
                "vouchers.maximum_discount",
                "goods_receipt_items.unit_cost"
        }) {
            String[] parts = field.split("\\.");
            rejects("UPDATE " + parts[0] + " SET " + parts[1] + "=-1");
        }
    }

    @Test
    void compoundUniqueConstraintsAndSharedPrimaryKeysAreEnforced() {
        rejects("INSERT INTO attribute_options(attribute_id,`value`,label,sort_order)"
                + " VALUES (1,'fixture-option','Duplicate',1)");
        rejects("INSERT INTO cart_items(cart_id,product_id,quantity) VALUES (1,1,2)");
        rejects("INSERT INTO goods_receipt_items(goods_receipt_id,product_id,quantity_received,unit_cost)"
                + " VALUES (1,1,3,500)");
        rejects("INSERT INTO inventories(warehouse_id,product_id,quantity_on_hand,version)"
                + " VALUES (1,1,0,0)");
        rejects("INSERT INTO account_roles(account_id,role_id) VALUES (1,101)");
        rejects("INSERT INTO role_permissions(role_id,permission_id) VALUES (101,1001)");
        rejects("INSERT INTO payments(order_id,method,payment_status,amount,currency)"
                + " VALUES (1,'COD','UNPAID',30900,'VND')");
        rejects("INSERT INTO shipping_infos(order_id,recipient_name,recipient_phone,shipping_status)"
                + " VALUES (1,'Fixture recipient','0900000001','PENDING')");
        rejects("INSERT INTO product_images(product_id,image_url,sort_order)"
                + " VALUES (1,'https://example.invalid/duplicate.png',0)");
    }

    @Test
    void foreignKeysAndWorkflowStatesAreEnforced() {
        rejects("UPDATE addresses SET account_id=999 WHERE id=1");
        rejects("UPDATE products SET category_id=999 WHERE id=1");
        rejects("UPDATE inventory_transactions SET created_by=999 WHERE id=1");
        rejects("UPDATE orders SET status='DELIVERED' WHERE id=1");
        rejects("UPDATE payments SET payment_status='UNKNOWN' WHERE order_id=1");
        rejects("UPDATE goods_receipts SET status='UNKNOWN' WHERE id=1");
        rejects("UPDATE orders SET account_id=NULL WHERE id=1");
        rejects("DELETE FROM products WHERE id=1");
        rejects("DELETE FROM accounts WHERE id=1");
    }

    @Test
    void catalogEditsDoNotRewriteHistoricalSnapshotsOrPaymentState() {
        jdbc.update("UPDATE products SET name='Changed',selling_price=999 WHERE id=1");
        assertEquals(
                "Historical product",
                jdbc.queryForObject("SELECT product_name_snapshot FROM order_items WHERE id=1", String.class));
        assertEquals(
                1000L,
                jdbc.queryForObject("SELECT unit_price FROM order_items WHERE id=1", Long.class));
        assertEquals(
                "UNPAID",
                jdbc.queryForObject("SELECT payment_status FROM payments WHERE order_id=1", String.class));
    }

    @Test
    void productImageSortOrderIsNonNegativeAndUniquePerProduct() {
        rejects("UPDATE product_images SET sort_order=-1 WHERE id=1");
        rejects("INSERT INTO product_images(product_id,image_url,sort_order)"
                + " VALUES (1,'https://example.invalid/duplicate.png',0)");

        jdbc.update("INSERT INTO products(category_id,brand_id,name,sku,selling_price,status)"
                + " VALUES (1,1,'Second product','SECOND-PRODUCT-SKU',1000,'ACTIVE')");
        long productId = jdbc.queryForObject(
                "SELECT id FROM products WHERE sku='SECOND-PRODUCT-SKU'", Long.class);
        jdbc.update("INSERT INTO product_images(product_id,image_url,sort_order) VALUES (?,?,0)",
                productId, "https://example.invalid/second.png");
        assertEquals(1, jdbc.queryForObject(
                "SELECT COUNT(*) FROM product_images WHERE product_id=? AND sort_order=0",
                Integer.class, productId));
    }

    @Test
    void orderItemRequiresAnImageSnapshotValue() {
        rejects("UPDATE order_items SET image_url_snapshot=NULL WHERE id=1");
    }
}
