package com.fido.modules.inventory;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fido.modules.inventory.dto.request.GoodsReceiptActionRequest;
import com.fido.modules.inventory.service.GoodsReceiptService;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

@SpringBootTest
@ActiveProfiles("test")
class InventoryPhase4TransactionTests {

    @Autowired GoodsReceiptService receipts;
    @Autowired JdbcTemplate db;

    Long accountId;
    Long supplierId;
    Long categoryId;
    Long productId;
    Long warehouseId;
    Long receiptId;

    void fixture() {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        String phone = "+84" + suffix.substring(0, 9);

        db.update("INSERT INTO accounts(full_name,password_hash,phone) VALUES (?,?,?)",
                "Inventory rollback test", "test-only", phone);
        accountId = db.queryForObject("SELECT id FROM accounts WHERE phone=?", Long.class, phone);

        db.update("INSERT INTO suppliers(code,name,status) VALUES (?,?, 'ACTIVE')",
                "RB-SUP-" + suffix, "Rollback supplier " + suffix);
        supplierId = db.queryForObject(
                "SELECT id FROM suppliers WHERE code=?", Long.class, "RB-SUP-" + suffix);

        String categorySlug = "rollback-" + suffix;
        db.update("INSERT INTO categories(name,slug) VALUES (?,?)",
                "Rollback category " + suffix, categorySlug);
        categoryId = db.queryForObject(
                "SELECT id FROM categories WHERE slug=?", Long.class, categorySlug);

        db.update("INSERT INTO products(category_id,name,sku,selling_price,status) "
                        + "VALUES (?,?,?,100000,'ACTIVE')",
                categoryId, "Rollback product " + suffix, "RB-SKU-" + suffix);
        productId = db.queryForObject(
                "SELECT id FROM products WHERE sku=?", Long.class, "RB-SKU-" + suffix);

        db.update("INSERT INTO warehouses(code,name,status) VALUES (?,?, 'ACTIVE')",
                "RB-WH-" + suffix, "Rollback warehouse " + suffix);
        warehouseId = db.queryForObject(
                "SELECT id FROM warehouses WHERE code=?", Long.class, "RB-WH-" + suffix);

        db.update("INSERT INTO inventories(warehouse_id,product_id,quantity_on_hand,version) "
                        + "VALUES (?,?,0,0)", warehouseId, productId);

        db.update("INSERT INTO goods_receipts(supplier_id,warehouse_id,receipt_number,status,created_by) "
                        + "VALUES (?,?,?,'DRAFT',?)",
                supplierId, warehouseId, "RB-" + suffix.substring(0, 20), accountId);
        receiptId = db.queryForObject(
                "SELECT id FROM goods_receipts WHERE receipt_number=?",
                Long.class, "RB-" + suffix.substring(0, 20));

        db.update("INSERT INTO goods_receipt_items(goods_receipt_id,product_id,quantity_received,unit_cost) "
                        + "VALUES (?,?,5,0)", receiptId, productId);
    }

    @AfterEach
    void clean() {
        if (accountId == null) return;
        db.update("DELETE FROM audit_logs WHERE actor_account_id=?", accountId);
        if (receiptId != null) {
            db.update("DELETE FROM inventory_transactions WHERE goods_receipt_item_id IN "
                    + "(SELECT id FROM goods_receipt_items WHERE goods_receipt_id=?)", receiptId);
            db.update("DELETE FROM goods_receipt_items WHERE goods_receipt_id=?", receiptId);
            db.update("DELETE FROM goods_receipts WHERE id=?", receiptId);
        }
        if (productId != null) {
            db.update("DELETE FROM inventory_transactions WHERE product_id=?", productId);
            db.update("DELETE FROM inventories WHERE product_id=?", productId);
            db.update("DELETE FROM products WHERE id=?", productId);
        }
        if (categoryId != null) db.update("DELETE FROM categories WHERE id=?", categoryId);
        if (warehouseId != null) db.update("DELETE FROM warehouses WHERE id=?", warehouseId);
        if (supplierId != null) db.update("DELETE FROM suppliers WHERE id=?", supplierId);
        db.update("DELETE FROM accounts WHERE id=?", accountId);
    }

    @Test
    @WithMockUser(authorities = "ROLE_SUPERADMIN")
    void failedLedgerInsertRollsBackReceiptAndInventoryTogether() {
        fixture();
        assertThrows(RuntimeException.class,
                () -> receipts.action(-999L, receiptId, new GoodsReceiptActionRequest("CONFIRM")));

        assertEquals("DRAFT", db.queryForObject(
                "SELECT status FROM goods_receipts WHERE id=?", String.class, receiptId));
        assertEquals(0, db.queryForObject(
                "SELECT quantity_on_hand FROM inventories WHERE warehouse_id=? AND product_id=?",
                Integer.class, warehouseId, productId));
        assertEquals(0, db.queryForObject(
                "SELECT COUNT(*) FROM inventory_transactions WHERE goods_receipt_item_id IN "
                        + "(SELECT id FROM goods_receipt_items WHERE goods_receipt_id=?)",
                Integer.class, receiptId));
    }
}
