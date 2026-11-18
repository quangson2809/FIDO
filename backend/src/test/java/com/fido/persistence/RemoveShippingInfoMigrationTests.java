package com.fido.persistence;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
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
import java.util.UUID;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:mysql:.*")
class RemoveShippingInfoMigrationTests {
    @Test
    void removesOnlyShippingTableAndPreservesRemainingDataAndOrderColumns() throws Exception {
        try (var database = new LegacyDatabase()) {
            var jdbc = database.jdbc;
            var ordersBefore = jdbc.queryForList("SELECT * FROM orders ORDER BY id");
            var paymentsBefore = jdbc.queryForList("SELECT * FROM payments ORDER BY order_id");
            var itemsBefore = jdbc.queryForList("SELECT * FROM order_items ORDER BY id");
            var addressesBefore =
                    jdbc.queryForList("SELECT * FROM order_addresses ORDER BY order_id");
            var columnsBefore =
                    jdbc.queryForList(
                            "SELECT column_name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='orders' ORDER BY ordinal_position");

            database.upgrade();

            assertEquals(ordersBefore, jdbc.queryForList("SELECT * FROM orders ORDER BY id"));
            assertEquals(
                    paymentsBefore, jdbc.queryForList("SELECT * FROM payments ORDER BY order_id"));
            assertEquals(itemsBefore, jdbc.queryForList("SELECT * FROM order_items ORDER BY id"));
            assertEquals(
                    addressesBefore,
                    jdbc.queryForList("SELECT * FROM order_addresses ORDER BY order_id"));
            assertEquals(
                    columnsBefore,
                    jdbc.queryForList(
                            "SELECT column_name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='orders' ORDER BY ordinal_position"));
            assertEquals(
                    0,
                    jdbc.queryForObject(
                            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='shipping_infos'",
                            Integer.class));
            assertEquals(
                    29,
                    jdbc.queryForObject(
                            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE'",
                            Integer.class));
        }
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "UPDATE shipping_infos SET delivered_at='2026-11-17 00:00:00' WHERE order_id=1",
                "UPDATE shipping_infos SET shipping_status='FAILED' WHERE order_id=1"
            })
    void mismatchedTimestampOrStateAbortsBeforeDroppingOrRewritingData(String mutation)
            throws Exception {
        try (var database = new LegacyDatabase()) {
            var jdbc = database.jdbc;
            jdbc.update(mutation);
            var shippingBefore =
                    jdbc.queryForList("SELECT * FROM shipping_infos ORDER BY order_id");
            var paymentsBefore = jdbc.queryForList("SELECT * FROM payments ORDER BY order_id");
            var ordersBefore = jdbc.queryForList("SELECT * FROM orders ORDER BY id");
            var failure = assertThrows(DataAccessException.class, database::upgrade);
            assertTrue(failure.getMostSpecificCause().getMessage().contains("mismatch"));
            assertEquals(
                    shippingBefore,
                    jdbc.queryForList("SELECT * FROM shipping_infos ORDER BY order_id"));
            assertEquals(
                    paymentsBefore, jdbc.queryForList("SELECT * FROM payments ORDER BY order_id"));
            assertEquals(ordersBefore, jdbc.queryForList("SELECT * FROM orders ORDER BY id"));
        }
    }

    private static class LegacyDatabase implements AutoCloseable {
        final String name = "remove_shipping_" + UUID.randomUUID().toString().replace("-", "");
        final JdbcTemplate admin;
        final DriverManagerDataSource dataSource;
        final JdbcTemplate jdbc;

        LegacyDatabase() throws Exception {
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
            String url =
                    "jdbc:mysql://"
                            + server.getRawAuthority()
                            + "/"
                            + name
                            + (server.getRawQuery() == null ? "" : "?" + server.getRawQuery());
            dataSource = new DriverManagerDataSource(url, username, password);
            jdbc = new JdbcTemplate(dataSource);
            try {
                try (Connection connection = dataSource.getConnection()) {
                    ScriptUtils.executeSqlScript(
                            connection,
                            new ClassPathResource("db/migration/V1__fido_target_schema.sql"));
                    ScriptUtils.executeSqlScript(
                            connection, new ClassPathResource("persistence-fixture.sql"));
                }
                jdbc.execute(
                        """
                        CREATE TABLE shipping_infos (
                            order_id BIGINT NOT NULL PRIMARY KEY,
                            carrier_name VARCHAR(150), tracking_number VARCHAR(120),
                            shipping_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                            shipped_at TIMESTAMP(6), delivered_at TIMESTAMP(6),
                            updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                            FOREIGN KEY(order_id) REFERENCES orders(id)
                        )
                        """);
                jdbc.update("UPDATE orders SET status='COMPLETED' WHERE id=1");
                jdbc.update(
                        "UPDATE payments SET payment_status='PAID',collected_by_account_id=1,collected_at='2026-11-18 00:00:00' WHERE order_id=1");
                jdbc.update(
                        "INSERT INTO shipping_infos(order_id,carrier_name,tracking_number,shipping_status,shipped_at,delivered_at) VALUES (1,'Legacy carrier','LEGACY-1','DELIVERED','2026-11-17 23:00:00','2026-11-18 00:00:00')");
            } catch (Exception failure) {
                close();
                throw failure;
            }
        }

        void upgrade() throws Exception {
            String script =
                    Files.readString(Path.of("../ops/sql/2026-11-18-remove-shipping-info.sql"))
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
