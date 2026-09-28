package com.fido.config.devseed;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:fido-dev-seed;MODE=MySQL;DB_CLOSE_DELAY=-1"
})
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
}
