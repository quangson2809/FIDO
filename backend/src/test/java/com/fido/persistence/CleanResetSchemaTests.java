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
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

@EnabledIfEnvironmentVariable(named = "CLEAN_RESET_TEST_DB_URL", matches = "jdbc:mysql:.*")
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
            Map.entry("account_roles", Set.of("account_id","role_id")),
            Map.entry("accounts", Set.of("created_at","deleted_at","email","full_name","id","password_hash","phone","phone_active_key","status","updated_at")),
            Map.entry("addresses", Set.of("account_id","address_line","created_at","district","id","is_default","province","recipient_name","recipient_phone","updated_at","ward")),
            Map.entry("attribute_options", Set.of("attribute_id","id","label","sort_order","value")),
            Map.entry("attribute_types", Set.of("code","data_type","id","name")),
            Map.entry("attributes", Set.of("attribute_type_id","code","id","is_required","is_variant_defining","name","sort_order")),
            Map.entry("audit_logs", Set.of("action","actor_account_id","after_data","before_data","correlation_id","created_at","entity_id","entity_type","id")),
            Map.entry("brands", Set.of("id","name","slug","status")),
            Map.entry("cart_items", Set.of("added_at","cart_id","id","product_id","quantity","updated_at")),
            Map.entry("carts", Set.of("account_id","created_at","id","status","updated_at")),
            Map.entry("categories", Set.of("created_at","id","name","parent_category_id","slug","status","updated_at")),
            Map.entry("content_pages", Set.of("content","id","slug","status","title","updated_at","updated_by")),
            Map.entry("goods_receipt_items", Set.of("goods_receipt_id","id","product_id","quantity_received","unit_cost")),
            Map.entry("goods_receipts", Set.of("confirmed_at","confirmed_by","created_at","created_by","id","receipt_number","status","supplier_id","updated_at","warehouse_id")),
            Map.entry("inventories", Set.of("product_id","quantity_on_hand","updated_at","version","warehouse_id")),
            Map.entry("inventory_transactions", Set.of("created_at","created_by","goods_receipt_item_id","id","idempotency_key","order_item_id","product_id","quantity_delta","reason_code","reverses_transaction_id","transaction_type","warehouse_id")),
            Map.entry("order_addresses", Set.of("address_line","district","order_id","province","recipient_name","recipient_phone","ward")),
            Map.entry("order_items", Set.of("attribute_snapshot","discount_amount","id","image_url_snapshot","line_total","order_id","product_id","product_name_snapshot","quantity","sku_snapshot","unit_price")),
            Map.entry("order_voucher_snapshots", Set.of("discount_amount_snapshot","discount_type_snapshot","discount_value_snapshot","order_id","voucher_code_snapshot")),
            Map.entry("orders", Set.of("account_id","created_at","currency","discount_amount","id","idempotency_key","order_number","placed_at","request_fingerprint","shipping_fee","status","subtotal","total_amount","updated_at","voucher_id")),
            Map.entry("payments", Set.of("amount","collected_at","collected_by_account_id","created_at","currency","method","order_id","payment_status","refund_amount","refund_reason","refunded_at","refunded_by_account_id","updated_at")),
            Map.entry("permissions", Set.of("code","description","id","name")),
            Map.entry("product_attribute_values", Set.of("attribute_id","boolean_value","number_value","option_id","product_id","text_value")),
            Map.entry("product_images", Set.of("created_at","id","image_url","is_primary","product_id","sort_order")),
            Map.entry("products", Set.of("brand_id","category_id","cost_price","created_at","deleted_at","description","id","name","parent_product_id","selling_price","sku","slug","status","updated_at")),
            Map.entry("role_permissions", Set.of("permission_id","role_id")),
            Map.entry("roles", Set.of("code","description","id","name","status")),
            Map.entry("shipping_infos", Set.of("carrier_name","delivered_at","order_id","recipient_name","recipient_phone","shipped_at","shipping_status","tracking_number","updated_at")),
            Map.entry("suppliers", Set.of("code","created_at","email","id","name","phone","status","updated_at")),
            Map.entry("vouchers", Set.of("code","discount_type","discount_value","ends_at","id","maximum_discount","minimum_order_value","starts_at","status","usage_count","usage_limit")),
            Map.entry("warehouses", Set.of("code","id","name","status"))
    );

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
            assertEquals(13, jdbc.queryForObject("SELECT COUNT(*) FROM permissions", Integer.class));
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
            assertEquals(13, jdbc.queryForObject("SELECT COUNT(*) FROM permissions", Integer.class));
            assertEquals(
                    Set.of(
                            "CATALOG_READ", "CATALOG_WRITE", "INVENTORY_READ", "INVENTORY_WRITE",
                            "ORDER_READ", "ORDER_EDIT", "ORDER_PAYMENT", "ORDER_AFTER_SALES",
                            "AUDIT_READ", "CONTENT_READ", "CONTENT_WRITE", "CUSTOMER_READ", "REPORT_READ"),
                    new TreeSet<>(jdbc.queryForList("SELECT code FROM permissions", String.class)));
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
                    "SELECT COUNT(*) FROM products WHERE parent_product_id=30001 AND name IS NULL AND selling_price=195000",
                    Integer.class));
            assertThrows(DataAccessException.class, () -> jdbc.update(
                    "INSERT INTO products(sku,selling_price,status) VALUES (?,?,?)",
                    "NO-PRICE", null, "ACTIVE"));
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
    void phoneIsUniqueAmongActiveAccountsAndReusableAfterSoftDeleteWhileEmailMayRepeat() {
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

            assertEquals(1, jdbc.update(
                    "UPDATE accounts SET deleted_at = CURRENT_TIMESTAMP(6) WHERE phone = ?",
                    "+84900000001"));
            jdbc.update("INSERT INTO accounts(full_name,email,phone,password_hash,status) VALUES (?,?,?,?,?)",
                    "Phone Reused", "reused@example.invalid", "+84900000001", "test-only-hash", "ACTIVE");
            assertEquals(2, jdbc.queryForObject(
                    "SELECT COUNT(*) FROM accounts WHERE phone = '+84900000001'", Integer.class));
            assertEquals(1, jdbc.queryForObject(
                    "SELECT COUNT(*) FROM accounts WHERE phone = '+84900000001' AND deleted_at IS NULL",
                    Integer.class));
        } finally {
            flyway.clean();
        }
    }

    @Test
    void targetCheckConstraintsRejectNegativeInventoryOverLimitVoucherAndMismatchedAttributeOption()
            throws SQLException {
        var dataSource = newTestDataSource("check-constraints");
        Flyway flyway = Flyway.configure().dataSource(dataSource)
                .locations("classpath:db/clean-reset").cleanDisabled(false).load();
        try {
            migrate(flyway);
            try (Connection connection = dataSource.getConnection()) {
                ScriptUtils.executeSqlScript(connection, new ClassPathResource("clean-reset/dev-seed.sql"));
            }
            JdbcTemplate jdbc = new JdbcTemplate(dataSource);
            assertThrows(DataAccessException.class, () -> jdbc.update(
                    "UPDATE inventories SET quantity_on_hand = -1 WHERE warehouse_id = 50001 AND product_id = 30002"));
            assertThrows(DataAccessException.class, () -> jdbc.update(
                    "UPDATE vouchers SET usage_count = usage_limit + 1 WHERE code = 'DEMO10'"));
            assertThrows(DataAccessException.class, () -> jdbc.update(
                    "INSERT INTO product_attribute_values(product_id,attribute_id,option_id) VALUES (30001,41002,42001)"));
        } finally {
            flyway.clean();
        }
    }
}
