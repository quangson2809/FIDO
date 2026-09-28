package com.fido.config.devseed;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class DevDataSeedServiceTests {

    private static final List<String> BASELINE_TABLES = List.of(
            "accounts",
            "addresses",
            "roles",
            "permissions",
            "account_roles",
            "role_permissions",
            "categories",
            "brands",
            "size_systems",
            "size_values",
            "colors",
            "products",
            "product_images",
            "product_variants",
            "carts",
            "cart_items",
            "vouchers",
            "orders",
            "order_items",
            "payments",
            "shipping_infos",
            "suppliers",
            "goods_receipts",
            "goods_receipt_items",
            "inventories",
            "inventory_transactions",
            "audit_logs",
            "content_pages"
    );

    @Autowired
    private DevDataSeedService seeder;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PasswordEncoder passwords;

    @AfterEach
    void removeSeedData() {
        delete("DELETE FROM audit_logs WHERE audit_id BETWEEN 1050001 AND 1050003");
        delete("DELETE FROM inventory_transactions WHERE txn_id IN "
                + "(1040001,1040002,1040003,1040004,1040005,"
                + "1040010,1040011,1040012,1040013,1040014,1040015,1040016)");
        delete("DELETE FROM goods_receipt_items "
                + "WHERE receipt_item_id BETWEEN 1030001 AND 1030003");
        delete("DELETE FROM goods_receipts "
                + "WHERE receipt_id BETWEEN 1010001 AND 1010003");
        delete("DELETE FROM shipping_infos WHERE order_id IN "
                + "(1001002,1001003,1001004,1001005,1001006,1001101,1001102)");
        delete("DELETE FROM payments WHERE order_id IN "
                + "(1001001,1001002,1001003,1001004,1001005,"
                + "1001006,1001101,1001102,1001103)");
        delete("DELETE FROM order_items WHERE order_item_id IN "
                + "(1101001,1101002,1101003,1101004,1101005,"
                + "1101006,1101101,1101102,1101103)");
        delete("DELETE FROM orders WHERE order_id IN "
                + "(1001001,1001002,1001003,1001004,1001005,"
                + "1001006,1001101,1001102,1001103)");
        delete("DELETE FROM cart_items WHERE cart_item_id BETWEEN 981001 AND 981002");
        delete("DELETE FROM carts WHERE cart_id BETWEEN 980001 AND 980002");
        delete("DELETE FROM inventories WHERE variant_id BETWEEN 970001 AND 970005");
        delete("DELETE FROM product_images WHERE image_id BETWEEN 961001 AND 961003");
        delete("DELETE FROM product_variants WHERE variant_id BETWEEN 970001 AND 970005");
        delete("DELETE FROM products WHERE product_id BETWEEN 960001 AND 960003");
        delete("DELETE FROM suppliers WHERE supplier_id BETWEEN 1020001 AND 1020002");
        delete("DELETE FROM vouchers WHERE voucher_id = 990001");
        delete("DELETE FROM content_pages WHERE page_id BETWEEN 1060001 AND 1060003");
        delete("DELETE FROM addresses WHERE address_id BETWEEN 910001 AND 910003");
        delete("DELETE FROM account_roles WHERE account_id BETWEEN 900001 AND 900008");
        delete("DELETE FROM role_permissions WHERE role_id BETWEEN 900101 AND 900104");
        delete("DELETE FROM accounts WHERE account_id BETWEEN 900001 AND 900008");
        delete("DELETE FROM roles WHERE role_id BETWEEN 900101 AND 900104");
        delete("DELETE FROM permissions WHERE permission_id BETWEEN 900201 AND 900215");
        delete("DELETE FROM colors WHERE color_id BETWEEN 950001 AND 950004");
        delete("DELETE FROM size_values WHERE size_value_id BETWEEN 941001 AND 941006");
        delete("DELETE FROM size_systems WHERE size_system_id BETWEEN 940001 AND 940002");
        delete("DELETE FROM brands WHERE brand_id BETWEEN 930001 AND 930002");
        delete("DELETE FROM categories WHERE category_id BETWEEN 920001 AND 920005");
    }

    @Test
    void seedIsCompleteAndIdempotent() {
        seeder.seed();

        Map<String, Integer> firstCounts = tableCounts();

        seeder.seed();

        assertEquals(
                firstCounts,
                tableCounts()
        );

        BASELINE_TABLES.forEach(table ->
                assertTrue(
                        firstCounts.get(table) > 0,
                        () -> "Expected seeded rows in " + table
                )
        );

        String passwordHash = jdbc.queryForObject(
                "SELECT password_hash FROM accounts WHERE account_id=900002",
                String.class
        );

        assertTrue(
                passwords.matches(
                        DevDataSeedService.DEFAULT_PASSWORD,
                        passwordHash
                )
        );

        assertEquals(
                1,
                jdbc.queryForObject("""
                        SELECT COUNT(*)
                        FROM account_roles ar
                        JOIN roles r ON r.role_id=ar.role_id
                        WHERE ar.account_id=900001
                          AND r.code='SUPERADMIN'
                        """,
                        Integer.class
                )
        );
    }

    private Map<String, Integer> tableCounts() {
        Map<String, Integer> counts = new LinkedHashMap<>();

        BASELINE_TABLES.forEach(table -> {
            Integer count = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM " + table,
                    Integer.class
            );
            counts.put(
                    table,
                    count == null ? 0 : count
            );
        });

        return counts;
    }

    private void delete(String sql) {
        jdbc.update(sql);
    }
}
