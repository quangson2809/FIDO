package com.fido.config.devseed;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fido.support.OperationsHttpSupport;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class DevDataSeedServiceTests extends OperationsHttpSupport {
    private static final List<String> TARGET_TABLES =
            List.of(
                    "accounts",
                    "addresses",
                    "roles",
                    "permissions",
                    "account_roles",
                    "role_permissions",
                    "categories",
                    "brands",
                    "attributes",
                    "attribute_options",
                    "products",
                    "product_attribute_values",
                    "product_images",
                    "carts",
                    "cart_items",
                    "vouchers",
                    "orders",
                    "order_items",
                    "order_addresses",
                    "order_voucher_snapshots",
                    "payments",
                    "suppliers",
                    "warehouses",
                    "goods_receipts",
                    "goods_receipt_items",
                    "inventories",
                    "inventory_transactions",
                    "audit_logs",
                    "content_pages");

    @Autowired private DevDataSeedService seeder;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PasswordEncoder passwords;

    @AfterEach
    void removeSeedData() {
        delete("DELETE FROM audit_logs WHERE id BETWEEN 1050001 AND 1050003");
        delete("DELETE FROM inventory_transactions WHERE id BETWEEN 1040001 AND 1040999");
        delete("DELETE FROM goods_receipt_items WHERE id BETWEEN 1030001 AND 1030003");
        delete("DELETE FROM goods_receipts WHERE id BETWEEN 1010001 AND 1010003");
        delete(
                "DELETE FROM payments WHERE order_id IN (1001001,1001002,1001003,1001004,1001005,1001006,1001101,1001102,1001103)");
        delete(
                "DELETE FROM order_addresses WHERE order_id IN (1001001,1001002,1001003,1001004,1001005,1001006,1001101,1001102,1001103)");
        delete("DELETE FROM order_items WHERE id BETWEEN 1101001 AND 1101009");
        delete(
                "DELETE FROM orders WHERE id IN (1001001,1001002,1001003,1001004,1001005,1001006,1001101,1001102,1001103)");
        delete("DELETE FROM cart_items WHERE id BETWEEN 981001 AND 981002");
        delete("DELETE FROM carts WHERE id BETWEEN 980001 AND 980002");
        delete("DELETE FROM inventories WHERE warehouse_id=1021001");
        delete("DELETE FROM warehouses WHERE id=1021001");
        delete("DELETE FROM product_attribute_values WHERE product_id BETWEEN 960001 AND 960199");
        delete("DELETE FROM product_images WHERE id BETWEEN 961001 AND 961199");
        delete("DELETE FROM attribute_options WHERE id BETWEEN 941001 AND 941999");
        delete("DELETE FROM attributes WHERE id BETWEEN 940001 AND 940013");
        delete(
                "DELETE FROM products WHERE id BETWEEN 960001 AND 960199 AND parent_product_id IS NOT NULL");
        delete("DELETE FROM products WHERE id BETWEEN 960001 AND 960199");
        delete("DELETE FROM suppliers WHERE id BETWEEN 1020001 AND 1020002");
        delete("DELETE FROM vouchers WHERE id=990001");
        delete("DELETE FROM content_pages WHERE id BETWEEN 1060001 AND 1060003");
        delete("DELETE FROM addresses WHERE id BETWEEN 910001 AND 910003");
        delete("DELETE FROM account_roles WHERE account_id BETWEEN 900001 AND 900008");
        delete("DELETE FROM accounts WHERE id BETWEEN 900001 AND 900008");
        delete("DELETE FROM categories WHERE id BETWEEN 920005 AND 920012");
        delete("DELETE FROM categories WHERE id BETWEEN 920001 AND 920004");
        delete("DELETE FROM brands WHERE id BETWEEN 930001 AND 930022");
        delete("DELETE FROM accounts WHERE id=899001");
        delete("DELETE FROM brands WHERE id=899001");
    }

    @Test
    void seedUsesTargetSchemaIsCompleteAndIdempotent() {
        seeder.seed();
        Map<String, Integer> firstCounts = tableCounts();

        seeder.seed();

        assertEquals(firstCounts, tableCounts());
        assertEquals(
                8,
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM accounts WHERE id BETWEEN 900001 AND 900008",
                        Integer.class));
        assertEquals(
                8,
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM account_roles WHERE account_id BETWEEN 900001 AND 900008",
                        Integer.class));
        assertEquals(12, firstCounts.get("categories"));
        assertEquals(22, firstCounts.get("brands"));
        assertEquals(13, firstCounts.get("attributes"));
        assertEquals(78, firstCounts.get("attribute_options"));
        assertEquals(75, firstCounts.get("products"));
        assertEquals(0, firstCounts.get("product_images"));
        assertEquals(9, firstCounts.get("orders"));
        assertEquals(9, firstCounts.get("order_items"));
        assertEquals(9, firstCounts.get("order_addresses"));
        assertEquals(9, firstCounts.get("payments"));
        assertEquals(75, firstCounts.get("inventories"));
        assertEquals(83, firstCounts.get("inventory_transactions"));

        // Mỗi số seed dạng +84 phải đổi thành đúng 10 chữ số nội địa: 0 và chín số phía sau.
        List<String> accountPhones =
                jdbc.queryForList(
                        "SELECT phone FROM accounts WHERE id BETWEEN 900001 AND 900008 ORDER BY id",
                        String.class);
        assertEquals(
                List.of(
                        "+84909000001",
                        "+84909000002",
                        "+84909000003",
                        "+84909000004",
                        "+84909000005",
                        "+84909000006",
                        "+84909000007",
                        "+84909000008"),
                accountPhones);
        List<String> allSeedPhones =
                jdbc.queryForList(
                        """
                SELECT phone FROM accounts WHERE id BETWEEN 900001 AND 900008
                UNION ALL SELECT recipient_phone FROM addresses WHERE id BETWEEN 910001 AND 910003
                UNION ALL SELECT recipient_phone FROM order_addresses
                    WHERE order_id IN (1001001,1001002,1001003,1001004,1001005,1001006,1001101,1001102,1001103)
                """,
                        String.class);
        assertEquals(20, allSeedPhones.size());
        for (String phone : allSeedPhones) {
            assertTrue(
                    phone.matches("\\+84[0-9]{9}"),
                    "Seed phone must use +84 followed by exactly nine digits: " + phone);
            assertTrue(
                    ("0" + phone.substring(3)).matches("0[0-9]{9}"),
                    "Seed phone must map to a ten-digit national phone: " + phone);
        }

        String passwordHash =
                jdbc.queryForObject(
                        "SELECT password_hash FROM accounts WHERE id=900002", String.class);
        assertTrue(passwords.matches(DevDataSeedService.DEFAULT_PASSWORD, passwordHash));

        assertEquals(
                List.of("Áo", "Quần", "Giày dép", "Phụ kiện"),
                jdbc.queryForList(
                        """
                        SELECT name FROM categories
                        WHERE id BETWEEN 920001 AND 920004 AND parent_category_id IS NULL
                        ORDER BY id
                        """,
                        String.class));

        assertEquals(
                "Giày",
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
            WHERE id=960101 AND parent_product_id=960001
              AND sku='DEMO-17631178-7' AND selling_price=199000
              AND category_id=920005 AND brand_id=930001
            """,
                        Integer.class));
        for (long categoryId = 920005; categoryId <= 920012; categoryId++) {
            assertEquals(
                    categoryId == 920011 ? 5 : 10,
                    jdbc.queryForObject(
                            "SELECT COUNT(*) FROM products WHERE category_id=? AND status='ACTIVE'",
                            Integer.class,
                            categoryId));
        }

        assertEquals(
                1,
                jdbc.queryForObject(
                        """
                        SELECT COUNT(*) FROM orders o
                        JOIN payments p ON p.order_id=o.id
                        WHERE o.id=1001102 AND o.status='RETURNED'
                          AND p.payment_status='REFUNDED'
                          AND p.refund_amount=p.amount
                          AND p.collected_at IS NOT NULL
                          AND p.refunded_at > p.collected_at
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
    void catalogMatchesManifestAndEverySkuReconcilesWithItsLedger() throws Exception {
        seeder.seed();
        var manifest = new ClassPathResource("devseed/image-manifest.csv");
        var folders = new TreeMap<String, Integer>();
        try (var reader =
                new BufferedReader(
                        new InputStreamReader(manifest.getInputStream(), StandardCharsets.UTF_8))) {
            reader.readLine();
            for (String line; (line = reader.readLine()) != null; ) {
                String file = line.substring(line.lastIndexOf(',') + 1);
                String folder = file.substring(0, file.lastIndexOf('/'));
                folders.merge(folder, 1, Integer::sum);
            }
        }
        assertEquals(40, folders.size());
        for (var entry : folders.entrySet()) {
            assertEquals(5, entry.getValue());
            String folder = entry.getKey();
            String sourceId = folder.substring(folder.lastIndexOf('_') + 1);
            assertEquals(
                    folder.startsWith("07_vo/") ? 1 : 2,
                    jdbc.queryForObject(
                            "SELECT COUNT(*) FROM products WHERE sku LIKE ?",
                            Integer.class,
                            "DEMO-" + sourceId + "%"));
        }
        assertEquals(
                36,
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM products WHERE parent_product_id IS NULL",
                        Integer.class));
        assertEquals(
                0,
                jdbc.queryForObject(
                        """
            SELECT COUNT(*) FROM products p JOIN products parent ON parent.id=p.parent_product_id
            WHERE parent.parent_product_id IS NOT NULL OR p.brand_id<>parent.brand_id
              OR p.category_id<>parent.category_id OR p.name IS NULL OR p.description IS NULL
            """,
                        Integer.class));
        assertEquals(
                0,
                jdbc.queryForObject(
                        """
            SELECT COUNT(*) FROM (
                SELECT i.product_id FROM inventories i
                LEFT JOIN inventory_transactions t ON t.warehouse_id=i.warehouse_id AND t.product_id=i.product_id
                GROUP BY i.warehouse_id,i.product_id,i.quantity_on_hand
                HAVING i.quantity_on_hand<>COALESCE(SUM(t.quantity_delta),0)
            ) mismatched
            """,
                        Integer.class));
        assertEquals(
                75,
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM inventory_transactions WHERE transaction_type='OPENING'",
                        Integer.class));
        assertEquals(
                0,
                jdbc.queryForObject(
                        """
            SELECT COUNT(*) FROM order_items oi JOIN products p ON p.id=oi.product_id
            WHERE oi.sku_snapshot<>p.sku OR oi.product_name_snapshot<>p.name OR oi.image_url_snapshot<>''
            """,
                        Integer.class));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM product_images", Integer.class));
        assertEquals(
                1,
                jdbc.queryForObject(
                        """
            SELECT COUNT(*) FROM product_attribute_values v
            JOIN attributes a ON a.id=v.attribute_id
            JOIN attribute_options o ON o.id=v.option_id
            WHERE v.product_id=960038 AND a.code='SIZE_CHILD_AGE' AND o.`value`='1-1.5Y'
            """,
                        Integer.class));
        for (var snapshot :
                jdbc.queryForList("SELECT attribute_snapshot FROM order_items", String.class)) {
            for (var attribute : json.readTree(snapshot)) {
                assertEquals(
                        1,
                        jdbc.queryForObject(
                                "SELECT COUNT(*) FROM attribute_options WHERE id=? AND attribute_id=?",
                                Integer.class,
                                attribute.get("option_id").asLong(),
                                attribute.get("attribute_id").asLong()));
            }
        }
    }

    @Test
    void publicCatalogExposesSellableFamiliesWithoutSeededImages() throws Exception {
        seeder.seed();
        var summary = call("GET", "/api/v1/catalog/products?page_size=100", null, null);
        assertEquals(200, summary.status(), String.valueOf(summary.body()));
        assertEquals(36, summary.body().get("meta").get("total").asInt());
        for (var product : summary.body().get("data")) {
            assertTrue(product.get("parent_product_id").isNull());
        }
        for (long categoryId = 920005; categoryId <= 920012; categoryId++) {
            var category =
                    call("GET", "/api/v1/catalog/products?category_id=" + categoryId, null, null);
            assertEquals(200, category.status(), String.valueOf(category.body()));
            assertEquals(
                    categoryId == 920009 ? 1 : 5, category.body().get("meta").get("total").asInt());
        }
        for (var sample : Map.of(960001L, 2, 960021L, 10, 960031L, 1).entrySet()) {
            var detail = call("GET", "/api/v1/catalog/products/" + sample.getKey(), null, null);
            assertEquals(200, detail.status(), String.valueOf(detail.body()));
            assertEquals(
                    sample.getValue(),
                    detail.body().get("data").get("family").get("members").size());
        }
    }

    @Test
    void catalogConflictRollsBackEarlierSeedWrites() {
        jdbc.update(
                "INSERT INTO brands(id,name,slug,status) VALUES (899001,'Existing brand','slazenger','ACTIVE')");
        assertThrows(DataAccessException.class, seeder::seed);
        assertEquals(
                0,
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM accounts WHERE id BETWEEN 900001 AND 900008",
                        Integer.class));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM categories", Integer.class));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM brands", Integer.class));
    }

    @Test
    void reportsDistinguishSeedPeriodFromEmptyRecentRange() throws Exception {
        seeder.seed();
        var login =
                call(
                        "POST",
                        "/api/v1/auth/login",
                        null,
                        Map.of(
                                "phone",
                                "+84909000001",
                                "password",
                                DevDataSeedService.DEFAULT_PASSWORD));
        assertEquals(200, login.status(), String.valueOf(login.body()));
        String token = login.body().get("data").get("access_token").asText();

        assertSeedReportRange(token, "2026-09-01", "2026-09-30", 9L, 2_265_000L, 489_000L, 4L);
        assertSeedReportRange(token, "2026-10-18", "2026-11-16", 0L, 0L, 0L, 0L);
    }

    private void assertSeedReportRange(
            String token,
            String from,
            String to,
            long expectedOrders,
            long expectedSales,
            long expectedReturns,
            long expectedUnits)
            throws Exception {
        String query = "?from=" + from + "&to=" + to;
        String base = "/api/v1/admin/reports/";
        var overview = call("GET", base + "overview" + query, token, null);
        assertEquals(200, overview.status(), String.valueOf(overview.body()));
        var data = overview.body().get("data");
        assertEquals(expectedSales, data.get("completed_sales").asLong());
        assertEquals(expectedReturns, data.get("returned_adjustment").asLong());
        assertEquals(expectedSales - expectedReturns, data.get("net_sales").asLong());
        long orderCount = 0;
        for (var count : data.get("orders_by_status")) orderCount += count.asLong();
        assertEquals(expectedOrders, orderCount);

        var sales = call("GET", base + "sales-trend" + query, token, null);
        assertEquals(200, sales.status(), String.valueOf(sales.body()));
        long netSales = 0;
        for (var point : sales.body().get("data").get("points")) {
            netSales += point.get("net_sales").asLong();
        }
        assertEquals(expectedSales - expectedReturns, netSales);

        var orders = call("GET", base + "orders-trend" + query, token, null);
        assertEquals(200, orders.status(), String.valueOf(orders.body()));
        long trendCount = 0;
        for (var point : orders.body().get("data").get("points")) {
            trendCount += point.get("total_orders").asLong();
        }
        assertEquals(expectedOrders, trendCount);

        var products = call("GET", base + "product-performance" + query, token, null);
        assertEquals(200, products.status(), String.valueOf(products.body()));
        long units = 0;
        for (var item : products.body().get("data").get("items")) {
            units += item.get("net_units").asLong();
        }
        assertEquals(expectedUnits, units);
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
                        "SELECT COUNT(*) FROM accounts WHERE id=900003", Integer.class));
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
