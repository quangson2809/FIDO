package com.fido.persistence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.sql.Connection;
import java.sql.SQLException;

import org.flywaydb.core.Flyway;
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

    @Test
    void cleanTargetBaselineCreatesExactlyTheApprovedThirtyOneTables() {
        var dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:clean-reset-" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1",
                "sa", "");
        Flyway flyway = Flyway.configure().dataSource(dataSource)
                .locations("classpath:db/clean-reset").cleanDisabled(false).load();
        try {
            assertEquals(2, flyway.migrate().migrationsExecuted);
            flyway.validate();
            JdbcTemplate jdbc = new JdbcTemplate(dataSource);
            Set<String> actual = new TreeSet<>(jdbc.queryForList(
                    """
                    SELECT LOWER(TABLE_NAME)
                    FROM INFORMATION_SCHEMA.TABLES
                    WHERE TABLE_SCHEMA = CURRENT_SCHEMA()
                      AND TABLE_TYPE = 'BASE TABLE'
                      AND LOWER(TABLE_NAME) <> 'flyway_schema_history'
                    """, String.class));
            assertEquals(new TreeSet<>(TARGET_TABLES), actual);
            assertEquals("2", flyway.info().current().getVersion().getVersion());
            assertEquals(0, flyway.info().pending().length);
        } finally {
            flyway.clean();
        }
    }

    @Test
    void cleanTargetSeedsSystemRolesPermissionsAndOnlyGrantsAllPermissionsToSuperadmin() {
        var dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:clean-reset-seed-" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1",
                "sa", "");
        Flyway flyway = Flyway.configure().dataSource(dataSource)
                .locations("classpath:db/clean-reset").cleanDisabled(false).load();
        try {
            flyway.migrate();
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
        var dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:clean-reset-demo-" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1",
                "sa", "");
        Flyway flyway = Flyway.configure().dataSource(dataSource)
                .locations("classpath:db/clean-reset").cleanDisabled(false).load();
        try {
            flyway.migrate();
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
        var dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:clean-reset-constraints-" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1",
                "sa", "");
        Flyway flyway = Flyway.configure().dataSource(dataSource)
                .locations("classpath:db/clean-reset").cleanDisabled(false).load();
        try {
            flyway.migrate();
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
