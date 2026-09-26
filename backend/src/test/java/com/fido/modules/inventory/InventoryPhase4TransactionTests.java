package com.fido.modules.inventory;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fido.modules.inventory.dto.request.GoodsReceiptActionRequest;
import com.fido.modules.inventory.service.GoodsReceiptService;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class InventoryPhase4TransactionTests {

    @Autowired
    GoodsReceiptService receipts;

    @Autowired
    JdbcTemplate db;

    Long accountId;
    Long supplierId;
    Long categoryId;
    Long sizeSystemId;
    Long sizeValueId;
    Long colorId;
    Long productId;
    Long variantId;
    Long receiptId;

    void fixture() {
        String suffix = UUID.randomUUID()
                .toString()
                .replace("-", "");

        String phone = "06" + suffix.substring(0, 16);

        db.update(
                """
                INSERT INTO accounts(
                    password_hash,
                    phone,
                    created_at,
                    updated_at
                )
                VALUES ('test-only',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """,
                phone
        );

        accountId = db.queryForObject(
                "SELECT account_id FROM accounts WHERE phone=?",
                Long.class,
                phone
        );

        String supplierName = "Rollback supplier " + suffix;

        db.update(
                """
                INSERT INTO suppliers(
                    name,
                    usage_status
                )
                VALUES (?,'ACTIVE')
                """,
                supplierName
        );

        supplierId = db.queryForObject(
                "SELECT supplier_id FROM suppliers WHERE name=?",
                Long.class,
                supplierName
        );

        String categoryName = "Rollback category " + suffix;

        db.update(
                "INSERT INTO categories(parent_category_id,name) VALUES (NULL,?)",
                categoryName
        );

        categoryId = db.queryForObject(
                "SELECT category_id FROM categories WHERE name=?",
                Long.class,
                categoryName
        );

        String systemCode = "RB-SZ-" + suffix.substring(0, 12);

        db.update(
                "INSERT INTO size_systems(code,name) VALUES (?,?)",
                systemCode,
                "Rollback size"
        );

        sizeSystemId = db.queryForObject(
                "SELECT size_system_id FROM size_systems WHERE code=?",
                Long.class,
                systemCode
        );

        db.update(
                """
                INSERT INTO size_values(
                    size_system_id,
                    code,
                    display_name,
                    sort_order
                )
                VALUES (?,'M','Medium',1)
                """,
                sizeSystemId
        );

        sizeValueId = db.queryForObject(
                """
                SELECT size_value_id
                FROM size_values
                WHERE size_system_id=?
                  AND code='M'
                """,
                Long.class,
                sizeSystemId
        );

        String colorCode = "RB-C-" + suffix.substring(0, 12);

        db.update(
                "INSERT INTO colors(code,name) VALUES (?,?)",
                colorCode,
                "Rollback color"
        );

        colorId = db.queryForObject(
                "SELECT color_id FROM colors WHERE code=?",
                Long.class,
                colorCode
        );

        String productName = "Rollback product " + suffix;

        db.update(
                """
                INSERT INTO products(
                    category_id,
                    brand_id,
                    size_system_id,
                    name,
                    base_price,
                    sale_status,
                    created_at,
                    updated_at
                )
                VALUES (?,NULL,?,?,100000,'ON_SALE',
                        CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """,
                categoryId,
                sizeSystemId,
                productName
        );

        productId = db.queryForObject(
                "SELECT product_id FROM products WHERE name=?",
                Long.class,
                productName
        );

        String sku = "RB-SKU-" + suffix;

        db.update(
                """
                INSERT INTO product_variants(
                    product_id,
                    size_value_id,
                    color_id,
                    sku,
                    sale_status,
                    created_at,
                    updated_at
                )
                VALUES (?,?,?,?,'ON_SALE',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """,
                productId,
                sizeValueId,
                colorId,
                sku
        );

        variantId = db.queryForObject(
                "SELECT variant_id FROM product_variants WHERE sku=?",
                Long.class,
                sku
        );

        db.update(
                """
                INSERT INTO inventories(
                    variant_id,
                    available_quantity,
                    updated_at
                )
                VALUES (?,0,CURRENT_TIMESTAMP)
                """,
                variantId
        );

        String receiptCode = "RB-" + suffix.substring(0, 20);

        db.update(
                """
                INSERT INTO goods_receipts(
                    receipt_code,
                    supplier_id,
                    receipt_status,
                    receipt_date,
                    created_by_account_id,
                    created_at,
                    updated_at
                )
                VALUES (?,?,'DRAFT',CURRENT_DATE,?,
                        CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """,
                receiptCode,
                supplierId,
                accountId
        );

        receiptId = db.queryForObject(
                "SELECT receipt_id FROM goods_receipts WHERE receipt_code=?",
                Long.class,
                receiptCode
        );

        db.update(
                """
                INSERT INTO goods_receipt_items(
                    receipt_id,
                    variant_id,
                    quantity
                )
                VALUES (?,?,5)
                """,
                receiptId,
                variantId
        );
    }

    @AfterEach
    void clean() {
        if (accountId == null) {
            return;
        }

        db.update(
                "DELETE FROM audit_logs WHERE actor_account_id=?",
                accountId
        );

        if (receiptId != null) {
            db.update(
                    "DELETE FROM inventory_transactions WHERE goods_receipt_id=?",
                    receiptId
            );

            db.update(
                    "DELETE FROM goods_receipt_items WHERE receipt_id=?",
                    receiptId
            );

            db.update(
                    "DELETE FROM goods_receipts WHERE receipt_id=?",
                    receiptId
            );
        }

        if (variantId != null) {
            db.update(
                    "DELETE FROM inventory_transactions WHERE variant_id=?",
                    variantId
            );

            db.update(
                    "DELETE FROM inventories WHERE variant_id=?",
                    variantId
            );

            db.update(
                    "DELETE FROM product_variants WHERE variant_id=?",
                    variantId
            );
        }

        if (productId != null) {
            db.update(
                    "DELETE FROM products WHERE product_id=?",
                    productId
            );
        }

        if (colorId != null) {
            db.update(
                    "DELETE FROM colors WHERE color_id=?",
                    colorId
            );
        }

        if (sizeValueId != null) {
            db.update(
                    "DELETE FROM size_values WHERE size_value_id=?",
                    sizeValueId
            );
        }

        if (sizeSystemId != null) {
            db.update(
                    "DELETE FROM size_systems WHERE size_system_id=?",
                    sizeSystemId
            );
        }

        if (categoryId != null) {
            db.update(
                    "DELETE FROM categories WHERE category_id=?",
                    categoryId
            );
        }

        if (supplierId != null) {
            db.update(
                    "DELETE FROM suppliers WHERE supplier_id=?",
                    supplierId
            );
        }

        db.update(
                "DELETE FROM accounts WHERE account_id=?",
                accountId
        );
    }

    @Test
    @WithMockUser(authorities = "ROLE_SUPERADMIN")
    void failedLedgerInsertRollsBackReceiptAndInventoryTogether() {
        fixture();

        assertThrows(
                RuntimeException.class,
                () -> receipts.action(
                        -999L,
                        receiptId,
                        new GoodsReceiptActionRequest("CONFIRM")
                )
        );

        assertEquals(
                "DRAFT",
                db.queryForObject(
                        """
                        SELECT receipt_status
                        FROM goods_receipts
                        WHERE receipt_id=?
                        """,
                        String.class,
                        receiptId
                )
        );

        assertEquals(
                0,
                db.queryForObject(
                        """
                        SELECT available_quantity
                        FROM inventories
                        WHERE variant_id=?
                        """,
                        Integer.class,
                        variantId
                )
        );

        assertEquals(
                0,
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM inventory_transactions
                        WHERE goods_receipt_id=?
                        """,
                        Integer.class,
                        receiptId
                )
        );
    }
}
