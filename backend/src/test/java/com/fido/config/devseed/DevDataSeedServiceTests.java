package com.fido.config.devseed;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@SpringBootTest
@ActiveProfiles("test")
class DevDataSeedServiceTests {
    private static final List<String> TARGET_TABLES =
            List.of(
                    "accounts", "addresses", "roles", "permissions", "account_roles", "role_permissions",
                    "categories", "brands", "attributes", "attribute_options",
                    "products", "product_attribute_values", "product_images", "carts", "cart_items",
                    "vouchers", "orders", "order_items", "order_addresses", "order_voucher_snapshots",
                    "payments", "shipping_infos", "suppliers", "warehouses", "goods_receipts",
                    "goods_receipt_items", "inventories", "inventory_transactions", "audit_logs",
                    "content_pages");

    @Autowired private DevDataSeedService seeder;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PasswordEncoder passwords;

    @AfterEach
    void removeSeedData() {
        delete("DELETE FROM audit_logs WHERE id BETWEEN 1050001 AND 1050003");
        delete("DELETE FROM inventory_transactions WHERE id BETWEEN 1040001 AND 1040025");
        delete("DELETE FROM goods_receipt_items WHERE id BETWEEN 1030001 AND 1030003");
        delete("DELETE FROM goods_receipts WHERE id BETWEEN 1010001 AND 1010003");
        delete("DELETE FROM shipping_infos WHERE order_id IN (1001001,1001002,1001003,1001004,1001005,1001006,1001101,1001102,1001103)");
        delete("DELETE FROM payments WHERE order_id IN (1001001,1001002,1001003,1001004,1001005,1001006,1001101,1001102,1001103)");
        delete("DELETE FROM order_addresses WHERE order_id IN (1001001,1001002,1001003,1001004,1001005,1001006,1001101,1001102,1001103)");
        delete("DELETE FROM order_items WHERE id BETWEEN 1101001 AND 1101009");
        delete("DELETE FROM orders WHERE id IN (1001001,1001002,1001003,1001004,1001005,1001006,1001101,1001102,1001103)");
        delete("DELETE FROM cart_items WHERE id BETWEEN 981001 AND 981002");
        delete("DELETE FROM carts WHERE id BETWEEN 980001 AND 980002");
        delete("DELETE FROM inventories WHERE warehouse_id=1021001");
        delete("DELETE FROM warehouses WHERE id=1021001");
        delete("DELETE FROM product_attribute_values WHERE product_id IN (960001,960002,960006)");
        delete("DELETE FROM product_images WHERE id BETWEEN 961001 AND 961017");
        delete("DELETE FROM attribute_options WHERE id BETWEEN 941001 AND 941007");
        delete("DELETE FROM attributes WHERE id BETWEEN 940001 AND 940002");
        delete("DELETE FROM products WHERE id=960006");
        delete("DELETE FROM products WHERE id BETWEEN 960001 AND 960017");
        delete("DELETE FROM suppliers WHERE id BETWEEN 1020001 AND 1020002");
        delete("DELETE FROM vouchers WHERE id=990001");
        delete("DELETE FROM content_pages WHERE id BETWEEN 1060001 AND 1060003");
        delete("DELETE FROM addresses WHERE id BETWEEN 910001 AND 910003");
        delete("DELETE FROM account_roles WHERE account_id BETWEEN 900001 AND 900008");
        delete("DELETE FROM accounts WHERE id BETWEEN 900001 AND 900008");
        delete("DELETE FROM categories WHERE id BETWEEN 920005 AND 920008");
        delete("DELETE FROM categories WHERE id BETWEEN 920001 AND 920004");
        delete("DELETE FROM brands WHERE id BETWEEN 930001 AND 930002");
        delete("DELETE FROM accounts WHERE id=899001");
    }

    @Test
    void seedUsesTargetSchemaIsCompleteAndIdempotent() {
        seeder.seed();
        Map<String, Integer> firstCounts = tableCounts();

        seeder.seed();

        assertEquals(firstCounts, tableCounts());
        assertEquals(8, firstCounts.get("accounts"));
        assertEquals(8, firstCounts.get("account_roles"));
        assertEquals(8, firstCounts.get("categories"));
        assertEquals(2, firstCounts.get("brands"));
        assertEquals(2, firstCounts.get("attributes"));
        assertEquals(7, firstCounts.get("attribute_options"));
        assertEquals(17, firstCounts.get("products"));
        assertEquals(17, firstCounts.get("product_images"));
        assertEquals(9, firstCounts.get("orders"));
        assertEquals(9, firstCounts.get("order_items"));
        assertEquals(9, firstCounts.get("order_addresses"));
        assertEquals(9, firstCounts.get("payments"));
        assertEquals(9, firstCounts.get("shipping_infos"));
        assertEquals(17, firstCounts.get("inventories"));
        assertEquals(25, firstCounts.get("inventory_transactions"));

        // Each +84 seed number must map to exactly ten national digits (0 + nine digits).
        List<String> accountPhones = jdbc.queryForList(
                "SELECT phone FROM accounts WHERE id BETWEEN 900001 AND 900008 ORDER BY id",
                String.class);
        assertEquals(
                List.of(
                        "+84909000001", "+84909000002", "+84909000003", "+84909000004",
                        "+84909000005", "+84909000006", "+84909000007", "+84909000008"),
                accountPhones);
        List<String> allSeedPhones = jdbc.queryForList(
                """
                SELECT phone FROM accounts WHERE id BETWEEN 900001 AND 900008
                UNION ALL SELECT recipient_phone FROM addresses WHERE id BETWEEN 910001 AND 910003
                UNION ALL SELECT recipient_phone FROM order_addresses
                    WHERE order_id IN (1001001,1001002,1001003,1001004,1001005,1001006,1001101,1001102,1001103)
                UNION ALL SELECT recipient_phone FROM shipping_infos
                    WHERE order_id IN (1001001,1001002,1001003,1001004,1001005,1001006,1001101,1001102,1001103)
                """,
                String.class);
        assertEquals(29, allSeedPhones.size());
        for (String phone : allSeedPhones) {
            assertTrue(phone.matches("\\+84[0-9]{9}"),
                    "Seed phone must use +84 followed by exactly nine digits: " + phone);
            assertTrue(("0" + phone.substring(3)).matches("0[0-9]{9}"),
                    "Seed phone must map to a ten-digit national phone: " + phone);
        }

        String passwordHash =
                jdbc.queryForObject(
                        "SELECT password_hash FROM accounts WHERE id=900002", String.class);
        assertTrue(passwords.matches(DevDataSeedService.DEFAULT_PASSWORD, passwordHash));

        assertEquals(
                List.of("Áo", "Quần", "Váy & Đầm", "Áo khoác"),
                jdbc.queryForList(
                        """
                        SELECT name FROM categories
                        WHERE id BETWEEN 920001 AND 920004 AND parent_category_id IS NULL
                        ORDER BY id
                        """,
                        String.class));

        assertEquals(
                "Áo thun",
                jdbc.queryForObject(
                        """
                        SELECT c.name FROM products p
                        JOIN categories c ON c.id=p.category_id
                        WHERE p.id=960001
                        """,
                        String.class));
        assertEquals(
                1,
                jdbc.queryForObject(
                        """
                        SELECT COUNT(*) FROM products
                        WHERE id=960006 AND parent_product_id=960001
                          AND sku='FIDO-TEE-006' AND selling_price=259000
                        """,
                        Integer.class),
                "child Products must own their SKU and selling price");
        
        for (long leafCategoryId = 920005; leafCategoryId <= 920008; leafCategoryId++) {
            assertEquals(
                    4,
                    jdbc.queryForObject(
                            """
                            SELECT COUNT(*) FROM products
                            WHERE category_id=? AND status='ACTIVE'
                            """,
                            Integer.class,
                            leafCategoryId),
                    "each homepage category must have four active, independently sellable Products");
        }

        assertEquals(
                1,
                jdbc.queryForObject(
                        """
                        SELECT COUNT(*) FROM orders o
                        JOIN payments p ON p.order_id=o.id
                        JOIN shipping_infos s ON s.order_id=o.id
                        WHERE o.id=1001102 AND o.status='RETURNED'
                          AND p.payment_status='REFUNDED'
                          AND p.refund_amount=p.amount
                          AND s.shipping_status='DELIVERED'
                          AND s.delivered_at IS NOT NULL
                          AND p.refunded_at > s.delivered_at
                        """,
                        Integer.class),
                "returned demo order must show the whole COD refund against its original delivery");
        
        assertEquals(
                120,
                jdbc.queryForObject(
                        "SELECT quantity_on_hand FROM inventories WHERE warehouse_id=1021001 AND product_id=960009",
                        Integer.class));
        assertEquals(
                120L,
                jdbc.queryForObject(
                        "SELECT SUM(quantity_delta) FROM inventory_transactions WHERE warehouse_id=1021001 AND product_id=960009",
                        Long.class));

        assertEquals(
                Set.of("CUSTOMER", "ADMIN", "SUPERADMIN"),
                Set.copyOf(jdbc.queryForList("SELECT code FROM roles", String.class)));
        assertTrue(
                jdbc.queryForList("SELECT code FROM permissions", String.class)
                        .contains("REPORT_READ"));
        assertEquals(
                0,
                jdbc.queryForObject(
                        """
                        SELECT COUNT(*) FROM role_permissions rp
                        JOIN roles r ON r.id=rp.role_id
                        WHERE r.code='ADMIN'
                        """,
                        Integer.class),
                "the demo seed must not invent implicit permission grants for ADMIN");
    }

    @Test
    void seedRejectsPartialDemoDataInsteadOfOverwritingIt() {
        jdbc.update(
                """
                INSERT INTO accounts(
                    id,full_name,password_hash,phone,email,status,created_at,updated_at
                ) VALUES (
                    900003,'Conflicting partial demo account','not-a-login-hash',
                    '+84909000003','partial@fido.local','ACTIVE',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
                )
                """);

        IllegalStateException failure = assertThrows(IllegalStateException.class, seeder::seed);
        assertTrue(failure.getMessage().contains("Partial FIDO development seed detected"));
        assertEquals(
                1,
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM accounts WHERE id=900003",
                        Integer.class));
    }

    private Map<String, Integer> tableCounts() {
        Map<String, Integer> counts = new LinkedHashMap<>();
        TARGET_TABLES.forEach(
                table -> {
                    Integer count =
                            jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class);
                    counts.put(table, count == null ? 0 : count);
                });
        return counts;
    }

    private void delete(String sql) {
        jdbc.update(sql);
    }
}
