package com.fido.persistence;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.util.List;
import java.util.UUID;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:mysql:.*")
class ReusableCartMigrationTests {
    @Test
    void upgradePreservesNonemptyCartAndItemsAndDeduplicatesOnlyEmptyCarts() throws Exception {
        try (var database = new LegacyDatabase()) {
            var jdbc = database.jdbc;
            jdbc.update(
                    "INSERT INTO carts(id,account_id,status) VALUES "
                            + "(10,1,'COMPLETED'),(11,1,'ABANDONED'),(12,1,'OPEN'),"
                            + "(20,2,'COMPLETED'),(21,2,'OPEN'),(30,3,'OPEN')");
            jdbc.update(
                    "INSERT INTO cart_items(id,cart_id,product_id,quantity) VALUES (101,11,1,3)");
            var cartBefore =
                    jdbc.queryForMap(
                            "SELECT id,account_id,created_at,updated_at FROM carts WHERE id=11");
            var linesBefore = jdbc.queryForList("SELECT * FROM cart_items ORDER BY id");

            database.upgrade();

            assertEquals(
                    List.of(11L, 20L, 30L),
                    jdbc.queryForList("SELECT id FROM carts ORDER BY id", Long.class));
            assertEquals(cartBefore, jdbc.queryForMap("SELECT * FROM carts WHERE id=11"));
            assertEquals(linesBefore, jdbc.queryForList("SELECT * FROM cart_items ORDER BY id"));
            assertEquals(
                    0,
                    jdbc.queryForObject(
                            "SELECT COUNT(*) FROM carts WHERE account_id=4", Integer.class));
            assertEquals(
                    0,
                    jdbc.queryForObject(
                            "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='carts' AND column_name='status'",
                            Integer.class));
            assertEquals(
                    1,
                    jdbc.queryForObject(
                            "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name='carts' AND constraint_name='uq_carts_account' AND constraint_type='UNIQUE'",
                            Integer.class));
            assertEquals(
                    0,
                    jdbc.queryForObject(
                            "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='carts' AND index_name='ix_carts_account_status'",
                            Integer.class));
            assertEquals(
                    0,
                    jdbc.queryForObject(
                            "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name='carts' AND constraint_name='ck_carts_status'",
                            Integer.class));
            assertThrows(
                    DataAccessException.class,
                    () -> jdbc.update("INSERT INTO carts(account_id) VALUES (1)"));
        }
    }

    @Test
    void ambiguousNonemptyCartsAbortBeforeAnyDataOrSchemaChange() throws Exception {
        try (var database = new LegacyDatabase()) {
            var jdbc = database.jdbc;
            jdbc.update(
                    "INSERT INTO carts(id,account_id,status) VALUES "
                            + "(10,1,'COMPLETED'),(11,1,'OPEN'),(20,2,'OPEN'),(21,2,'CHECKOUT')");
            jdbc.update(
                    "INSERT INTO cart_items(id,cart_id,product_id,quantity) VALUES (101,20,1,2),(102,21,1,3)");
            var cartsBefore = jdbc.queryForList("SELECT * FROM carts ORDER BY id");
            var linesBefore = jdbc.queryForList("SELECT * FROM cart_items ORDER BY id");

            var failure = assertThrows(DataAccessException.class, database::upgrade);
            assertTrue(
                    failure.getMostSpecificCause()
                            .getMessage()
                            .contains("Multiple nonempty carts"));
            assertEquals(cartsBefore, jdbc.queryForList("SELECT * FROM carts ORDER BY id"));
            assertEquals(linesBefore, jdbc.queryForList("SELECT * FROM cart_items ORDER BY id"));
            assertEquals(
                    1,
                    jdbc.queryForObject(
                            "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='carts' AND column_name='status'",
                            Integer.class));
        }
    }

    private static class LegacyDatabase implements AutoCloseable {
        final String name = "reusable_cart_" + UUID.randomUUID().toString().replace("-", "");
        final JdbcTemplate admin;
        final DriverManagerDataSource dataSource;
        final JdbcTemplate jdbc;

        LegacyDatabase() {
            String testUrl = System.getenv("TEST_DB_URL");
            URI server = URI.create(testUrl.substring("jdbc:".length()));
            if (!"mysql".equals(server.getScheme())
                    || !("127.0.0.1".equals(server.getHost())
                            || "localhost".equals(server.getHost()))) {
                throw new IllegalStateException(
                        "Migration verification requires a local disposable MySQL server");
            }
            String username = System.getenv().getOrDefault("TEST_DB_USERNAME", "root");
            String password = System.getenv().getOrDefault("TEST_DB_PASSWORD", "");
            admin = new JdbcTemplate(new DriverManagerDataSource(testUrl, username, password));
            admin.execute("CREATE DATABASE " + name);
            String isolatedUrl =
                    "jdbc:mysql://"
                            + server.getRawAuthority()
                            + "/"
                            + name
                            + (server.getRawQuery() == null ? "" : "?" + server.getRawQuery());
            dataSource = new DriverManagerDataSource(isolatedUrl, username, password);
            jdbc = new JdbcTemplate(dataSource);
            try {
                jdbc.execute("CREATE TABLE accounts(id BIGINT PRIMARY KEY)");
                jdbc.execute("CREATE TABLE products(id BIGINT PRIMARY KEY)");
                jdbc.execute(
                        """
                        CREATE TABLE carts (
                            id BIGINT NOT NULL AUTO_INCREMENT,
                            account_id BIGINT NOT NULL,
                            status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
                            created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                            updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                            CONSTRAINT pk_carts PRIMARY KEY (id),
                            CONSTRAINT fk_carts_account FOREIGN KEY (account_id) REFERENCES accounts(id),
                            CONSTRAINT ck_carts_status CHECK (status IN ('OPEN','CHECKOUT','COMPLETED','ABANDONED'))
                        )
                        """);
                jdbc.execute("CREATE INDEX ix_carts_account_status ON carts(account_id,status)");
                jdbc.execute(
                        """
                        CREATE TABLE cart_items (
                            id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                            cart_id BIGINT NOT NULL,
                            product_id BIGINT NOT NULL,
                            quantity INT NOT NULL CHECK(quantity>0),
                            updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                            UNIQUE(cart_id,product_id),
                            FOREIGN KEY(cart_id) REFERENCES carts(id),
                            FOREIGN KEY(product_id) REFERENCES products(id)
                        )
                        """);
                jdbc.update("INSERT INTO accounts(id) VALUES (1),(2),(3),(4)");
                jdbc.update("INSERT INTO products(id) VALUES (1)");
            } catch (RuntimeException failure) {
                close();
                throw failure;
            }
        }

        void upgrade() throws Exception {
            String script =
                    Files.readString(Path.of("../ops/sql/2026-11-18-reusable-cart.sql"))
                            .replaceAll("(?m)^DELIMITER.*$", "");
            try (Connection connection = dataSource.getConnection()) {
                ScriptUtils.executeSqlScript(
                        connection,
                        new EncodedResource(
                                new ByteArrayResource(script.getBytes(StandardCharsets.UTF_8))),
                        false,
                        false,
                        "--",
                        "$$",
                        "/*",
                        "*/");
            }
        }

        @Override
        public void close() {
            admin.execute("DROP DATABASE " + name);
        }
    }
}
