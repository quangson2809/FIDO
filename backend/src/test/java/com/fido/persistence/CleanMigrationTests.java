package com.fido.persistence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class CleanMigrationTests {

    @Test
    void cleanThenMigrateRebuildsAnIsolatedTestDatabase() {
        // Deliberately never uses TEST_DB_URL: clean must not target a shared/external database.
        var dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:phase14-clean-" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1",
                "sa", "");
        verifyCleanAndRebuild(dataSource);
    }

    @Test
    @EnabledIfEnvironmentVariable(named = "TEST_DB_DRIVER", matches = "com\\.mysql\\.cj\\.jdbc\\.Driver")
    void cleanThenMigrateRebuildsAnIsolatedMysqlDatabase() {
        String testUrl = System.getenv("TEST_DB_URL");
        URI server = URI.create(testUrl.substring("jdbc:".length()));
        assertEquals("mysql", server.getScheme());
        assertTrue("127.0.0.1".equals(server.getHost()) || "localhost".equals(server.getHost()),
                "Destructive migration verification is restricted to a local test server");
        String username = System.getenv("TEST_DB_USERNAME");
        String password = System.getenv("TEST_DB_PASSWORD");
        var admin = new JdbcTemplate(new DriverManagerDataSource(testUrl, username, password));
        String database = "phase14_clean_" + UUID.randomUUID().toString().replace("-", "");
        String isolatedUrl = "jdbc:mysql://" + server.getRawAuthority() + "/" + database
                + (server.getRawQuery() == null ? "" : "?" + server.getRawQuery());

        // CREATE must succeed before entering the cleanup block; never reuse a pre-existing schema.
        admin.execute("CREATE DATABASE " + database);
        try {
            verifyCleanAndRebuild(new DriverManagerDataSource(isolatedUrl, username, password));
        } finally {
            admin.execute("DROP DATABASE " + database);
        }
    }

    private void verifyCleanAndRebuild(DriverManagerDataSource dataSource) {
        var flyway = Flyway.configure().dataSource(dataSource)
                .locations("classpath:db/migration").cleanDisabled(false).load();
        try {
            assertEquals(5, flyway.migrate().migrationsExecuted);
            var jdbc = new JdbcTemplate(dataSource);
            jdbc.update("INSERT INTO categories(name) VALUES ('phase14-before-clean')");

            flyway.clean();
            assertEquals(5, flyway.migrate().migrationsExecuted);
            flyway.validate();
            assertEquals("5", flyway.info().current().getVersion().getVersion());
            assertEquals(0, flyway.info().pending().length);
            assertEquals(0, flyway.migrate().migrationsExecuted);
            assertEquals(0, jdbc.queryForObject(
                    "SELECT COUNT(*) FROM categories WHERE name='phase14-before-clean'", Integer.class));
            assertEquals(0, jdbc.queryForObject(
                    "SELECT COUNT(sort_order) FROM product_images", Integer.class));
            assertEquals(0, jdbc.queryForObject(
                    "SELECT COUNT(image_url_snapshot) FROM order_items", Integer.class));
        } finally {
            flyway.clean();
        }
    }
}
