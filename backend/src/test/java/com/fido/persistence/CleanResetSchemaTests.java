package com.fido.persistence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Set;
import java.util.Map;
import java.util.TreeSet;
import java.util.UUID;
import java.sql.Connection;
import java.sql.SQLException;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

class CleanResetSchemaTests {

    private static final Set<String> TARGET_TABLES = Set.of(
            "accounts", "addresses", "roles", "permissions", "account_roles",
            "role_permissions", "categories", "brands", "products", "attribute_types",
            "attributes", "attribute_options", "product_attribute_values", "product_images",
            "carts", "cart_items", "vouchers", "orders", "order_items", "order_addresses",
            "order_voucher_snapshots", "payments", "shipping_infos", "suppliers",
            "goods_receipts", "goods_receipt_items", "warehouses", "inventories",
            "inventory_transactions", "audit_logs", "content_pages");

    private boolean usesMySqlTestDatabase() {
        String url = System.getenv("CLEAN_RESET_TEST_DB_URL");
        return url != null && !url.isBlank();
    }

    private MigrateResult migrate(Flyway flyway) {
        try {
            return flyway.migrate();
        } catch (RuntimeException failure) {
            StringBuilder details = new StringBuilder("Target Flyway migration failed");
            Throwable current = failure;
            while (current != null) {
                details.append("\n - ").append(current.getClass().getName())
                        .append(": ").append(current.getMessage());
                current = current.getCause();
            }
            throw new IllegalStateException(details.toString(), failure);
        }
    }

    private DriverManagerDataSource newTestDataSource(String name) {
        String mysqlUrl = System.getenv("CLEAN_RESET_TEST_DB_URL");
        if (mysqlUrl == null || mysqlUrl.isBlank()) {
            return new DriverManagerDataSource(
                    "jdbc:h2:mem:clean-reset-" + name + "-" + UUID.randomUUID()
                            + ";MODE=MySQL;DB_CLOSE_DELAY=-1",
                    "sa",
                    "");
        }

        java.net.URI server = java.net.URI.create(mysqlUrl.substring("jdbc:".length()));
        if (!"mysql".equals(server.getScheme())
                || !("127.0.0.1".equals(server.getHost()) || "localhost".equals(server.getHost()))) {
            throw new IllegalStateException(
                    "Clean reset integration tests are restricted to a local disposable MySQL server");
        }
        String driver = System.getenv().getOrDefault("CLEAN_RESET_TEST_DB_DRIVER", "com.mysql.cj.jdbc.Driver");
        String username = System.getenv().getOrDefault("CLEAN_RESET_TEST_DB_USERNAME", "root");
        String password = System.getenv().getOrDefault("CLEAN_RESET_TEST_DB_PASSWORD", "");
        DriverManagerDataSource dataSource = new DriverManagerDataSource(mysqlUrl, username, password);
        dataSource.setDriverClassName(driver);
        return dataSource;
    }

    private static final Map<String, Set<String>> TARGET_COLUMNS = Map.ofEntries(
            Map.entry("accounts", Set.of("id","full_name","email","phone","password_hash","status","created_at","updated_at")),
            Map.entry("addresses", Set.of("id","account_id","recipient_name","recipient_phone","province","district","ward","address_line","is_default","created_at","updated_at")),
            Map.entry("roles", Set.of("id","code","name","description","status")),
            Map.entry("permissions", Set.of("id","code","name","description")),
            Map.entry("account_roles", Set.of("account_id","role_id")),
            Map.entry("role_permissions", Set.of("role_id","permission_id")),
            Map.entry("categories", Set.of("id","parent_category_id","name","slug","status","created_at","updated_at")),
            Map.entry("brands", Set.of("id","name","slug","status")),
            Map.entry("products", Set.of("id","parent_product_id","category_id","brand_id","name","slug","sku","description","selling_price","cost_price","status","deleted_at","created_at","updated_at")),
            Map.entry("attribute_types", Set.of("id","code","name","data_type")),
            Map.entry("attributes", Set.of("id","attribute_type_id","code","name","is_required","is_variant_defining","sort_order")),
            Map.entry("attribute_options", Set.of("id","attribute_id","value","label","sort_order")),
            Map.entry("product_attribute_values", Set.of("product_id","attribute_id","option_id","text_value","number_value","boolean_value")),
            Map.entry("product_images", Set.of("id","product_id","image_url","is_primary","sort_order","created_at")),
            Map.entry("carts", Set.of("id","account_id","status","created_at","updated_at")),
            Map.entry("cart_items", Set.of("id","cart_id","product_id","quantity","added_at","updated_at")),
            Map.entry("vouchers", Set.of("id","code","discount_type","discount_value","minimum_order_value","maximum_discount","starts_at","ends_at","usage_limit","status")),
            Map.entry("orders", Set.of("id","account_id","voucher_id","order_number","idempotency_key","status","subtotal","discount_amount","shipping_fee","total_amount","currency","placed_at","created_at","updated_at")),
            Map.entry("order_items", Set.of("id","order_id","product_id","sku_snapshot","product_name_snapshot","attribute_snapshot","quantity","unit_price","discount_amount","line_total")),
            Map.entry("order_addresses", Set.of("order_id","recipient_name","recipient_phone","province","district","ward","address_line")),
            Map.entry("order_voucher_snapshots", Set.of("order_id","voucher_code_snapshot","discount_type_snapshot","discount_value_snapshot","discount_amount_snapshot")),
            Map.entry("payments", Set.of("order_id","method","payment_status","amount","currency","collected_by_account_id","collected_at","created_at","updated_at")),
            Map.entry("shipping_infos", Set.of("order_id","recipient_name","recipient_phone","carrier_name","tracking_number","shipping_status","shipped_at","delivered_at","updated_at")),
            Map.entry("suppliers", Set.of("id","code","name","phone","email","status","created_at","updated_at")),
            Map.entry("goods_receipts", Set.of("id","supplier_id","receipt_number","status","created_by","confirmed_by","confirmed_at","created_at","updated_at")),
            Map.entry("goods_receipt_items", Set.of("id","goods_receipt_id","product_id","quantity_received","unit_cost")),
            Map.entry("warehouses", Set.of("id","code","name","status")),
            Map.entry("inventories", Set.of("warehouse_id","product_id","quantity_on_hand","version","updated_at")),
            Map.entry("inventory_transactions", Set.of("id","warehouse_id","product_id","transaction_type","quantity_delta","goods_receipt_item_id","order_item_id","idempotency_key","created_by","created_at")),
            Map.entry("audit_logs", Set.of("id","actor_account_id","action","entity_type","entity_id","before_data","after_data","correlation_id","created_at")),
            Map.entry("content_pages", Set.of("id","slug","title","content","status","updated_by","updated_at")));

    @Test
    void cleanTargetBaselineCreatesExactlyTheApprovedThirtyOneTables() {
        var dataSource = newTestDataSource("schema");
        Flyway flyway = Flyway.configure().dataSource(dataSource)
                .locations("classpath:db/clean-reset").cleanDisabled(false).load();
        try {
            assertEquals(2, migrate(flyway).migrationsExecuted);
            flyway.validate();
            JdbcTemplate jdbc = new JdbcTemplate(dataSource);
            String currentSchemaExpression = usesMySqlTestDatabase() ? "DATABASE()" : "CURRENT_SCHEMA()";
            String tablesSql = """
                    SELECT LOWER(TABLE_NAME)
                    FROM INFORMATION_SCHEMA.TABLES
                    WHERE TABLE_SCHEMA = CURRENT_SCHEMA()
                      AND TABLE_TYPE = 'BASE TABLE'
                      AND LOWER(TABLE_NAME) <> 'flyway_schema_history'
                    """.replace("TABLE_SCHEMA = CURRENT_SCHEMA()",
                            "TABLE_SCHEMA = " + currentSchemaExpression);
            Set<String> actual = new TreeSet<>(jdbc.queryForList(tablesSql, String.class));
            assertEquals(new TreeSet<>(TARGET_TABLES), actual);
            Map<String, Set<String>> actualColumns = new java.util.TreeMap<>();
            String columnsSql = """
                    SELECT LOWER(TABLE_NAME) AS table_name, LOWER(COLUMN_NAME) AS column_name
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = CURRENT_SCHEMA()
                      AND LOWER(TABLE_NAME) <> 'flyway_schema_history'
                    """.replace("TABLE_SCHEMA = CURRENT_SCHEMA()",
                            "TABLE_SCHEMA = " + currentSchemaExpression);
            jdbc.query(
                    columnsSql,
                    rs -> {
                        String table = rs.getString("table_name");
                        String column = rs.getString("column_name");
                        actualColumns.computeIfAbsent(table, ignored -> new TreeSet<>()).add(column);
                    });
            assertEquals(TARGET_COLUMNS, actualColumns);
            assertEquals("2", flyway.info().current().getVersion().getVersion());
            assertEquals(0, flyway.info().pending().length);
        } finally {
            flyway.clean();
        }
    }

    @Test
    void cleanThenMigrateDropsDevelopmentRowsAndReseedsSystemRows() {
        var dataSource = newTestDataSource("rebuild");
        Flyway flyway = Flyway.configure().dataSource(dataSource)
                .locations("classpath:db/clean-reset").cleanDisabled(false).load();
        try {
            migrate(flyway);
            JdbcTemplate jdbc = new JdbcTemplate(dataSource);
            jdbc.update("INSERT INTO categories(name,slug,status) VALUES (?,?,?)",
                    "Disposable category", "disposable-category", "ACTIVE");
            assertEquals(1, jdbc.queryForObject(
                    "SELECT COUNT(*) FROM categories WHERE slug='disposable-category'", Integer.class));

            flyway.clean();
            assertEquals(2, migrate(flyway).migrationsExecuted);
            flyway.validate();

            assertEquals(0, jdbc.queryForObject(
                    "SELECT COUNT(*) FROM categories WHERE slug='disposable-category'", Integer.class));
            assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM roles", Integer.class));
            assertEquals(16, jdbc.queryForObject("SELECT COUNT(*) FROM permissions", Integer.class));
        } finally {
            flyway.clean();
        }
    }

    @Test
    void cleanTargetSeedsSystemRolesPermissionsAndOnlyGrantsAllPermissionsToSuperadmin() {
        var dataSource = newTestDataSource("seed");
        Flyway flyway = Flyway.configure().dataSource(dataSource)
                .locations("classpath:db/clean-reset").cleanDisabled(false).load();
        try {
            migrate(flyway);
            JdbcTemplate jdbc = new JdbcTemplate(dataSource);
            assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM roles", Integer.class));
            assertEquals(16, jdbc.queryForObject("SELECT COUNT(*) FROM permissions", Integer.class));
            assertEquals(
                    jdbc.queryForObject("SELECT COUNT(*) FROM permissions", Integer.class),
                    jdbc.queryForObject(
                            "SELECT COUNT(*) FROM role_permissions rp JOIN roles r ON r.id=rp.role_id WHERE r.code='SUPERADMIN'",
                            Integer.class));
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM accounts", Integer.class));
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM products", Integer.class));
        } finally {
            flyway.clean();
        }
    }

    @Test
    void developmentFixtureSeedsParentChildAttributesAndInventory() throws SQLException {
        var dataSource = newTestDataSource("demo");
        Flyway flyway = Flyway.configure().dataSource(dataSource)
                .locations("classpath:db/clean-reset").cleanDisabled(false).load();
        try {
            migrate(flyway);
            try (Connection connection = dataSource.getConnection()) {
                ScriptUtils.executeSqlScript(connection, new ClassPathResource("clean-reset/dev-seed.sql"));
            }

            JdbcTemplate jdbc = new JdbcTemplate(dataSource);
            assertEquals(1, jdbc.queryForObject(
                    "SELECT COUNT(*) FROM products WHERE parent_product_id IS NULL AND sku='DEMO-TSHIRT'",
                    Integer.class));
            assertEquals(1, jdbc.queryForObject(
                    "SELECT COUNT(*) FROM products WHERE parent_product_id=30001 AND name IS NULL AND selling_price IS NULL",
                    Integer.class));
            assertEquals(2, jdbc.queryForObject(
                    "SELECT COUNT(*) FROM product_attribute_values WHERE product_id=30002",
                    Integer.class));
            assertEquals(50, jdbc.queryForObject(
                    "SELECT quantity_on_hand FROM inventories WHERE warehouse_id=50001 AND product_id=30002",
                    Integer.class));
        } finally {
            flyway.clean();
        }
    }

    @Test
    void phoneIsUniqueButEmailIsNotUniqueInTheTargetSchema() {
        var dataSource = newTestDataSource("constraints");
        Flyway flyway = Flyway.configure().dataSource(dataSource)
                .locations("classpath:db/clean-reset").cleanDisabled(false).load();
        try {
            migrate(flyway);
            JdbcTemplate jdbc = new JdbcTemplate(dataSource);
            jdbc.update("INSERT INTO accounts(full_name,email,phone,password_hash,status) VALUES (?,?,?,?,?)",
                    "Test One", "same@example.invalid", "+84900000001", "test-only-hash", "ACTIVE");
            jdbc.update("INSERT INTO accounts(full_name,email,phone,password_hash,status) VALUES (?,?,?,?,?)",
                    "Test Two", "same@example.invalid", "+84900000002", "test-only-hash", "ACTIVE");
            assertThrows(DataAccessException.class, () -> jdbc.update(
                    "INSERT INTO accounts(full_name,email,phone,password_hash,status) VALUES (?,?,?,?,?)",
                    "Duplicate Phone", "different@example.invalid", "+84900000001", "test-only-hash", "ACTIVE"));
        } finally {
            flyway.clean();
        }
    }
}
