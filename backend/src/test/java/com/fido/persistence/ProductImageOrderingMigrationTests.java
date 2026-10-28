package com.fido.persistence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.net.URI;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

@EnabledIfEnvironmentVariable(named = "CLEAN_RESET_TEST_DB_URL", matches = "jdbc:mysql:.*")
class ProductImageOrderingMigrationTests {

    @Test
    void canonicalBaselineEnforcesUniqueImageOrderPerProductOnMySql() throws Exception {
        String baseUrl = System.getenv("CLEAN_RESET_TEST_DB_URL");
        URI server = URI.create(baseUrl.substring("jdbc:".length()));
        if (!"mysql".equals(server.getScheme())
                || !("127.0.0.1".equals(server.getHost()) || "localhost".equals(server.getHost()))) {
            throw new IllegalStateException("Schema test is restricted to a local disposable MySQL server");
        }
        String username = System.getenv().getOrDefault("CLEAN_RESET_TEST_DB_USERNAME", "root");
        String password = System.getenv().getOrDefault("CLEAN_RESET_TEST_DB_PASSWORD", "");
        String database = "image_order_" + UUID.randomUUID().toString().replace("-", "");
        DriverManagerDataSource adminDataSource =
                new DriverManagerDataSource("jdbc:mysql://" + server.getRawAuthority()
                        + (server.getRawQuery() == null ? "" : "?" + server.getRawQuery()), username, password);
        JdbcTemplate admin = new JdbcTemplate(adminDataSource);
        admin.execute("CREATE DATABASE " + database);
        String isolatedUrl = "jdbc:mysql://" + server.getRawAuthority() + "/" + database
                + (server.getRawQuery() == null ? "" : "?" + server.getRawQuery());
        DriverManagerDataSource dataSource = new DriverManagerDataSource(isolatedUrl, username, password);
        try {
            try (Connection connection = dataSource.getConnection()) {
                ScriptUtils.executeSqlScript(
                        connection, new ClassPathResource("db/migration/V1__fido_target_schema.sql"));
            }
            JdbcTemplate jdbc = new JdbcTemplate(dataSource);
            jdbc.update("INSERT INTO products(sku,selling_price,status) VALUES (?,?,?)",
                    "P1-ORDER-A", 1000L, "DRAFT");
            jdbc.update("INSERT INTO products(sku,selling_price,status) VALUES (?,?,?)",
                    "P1-ORDER-B", 1000L, "DRAFT");
            long a = jdbc.queryForObject("SELECT id FROM products WHERE sku='P1-ORDER-A'", Long.class);
            long b = jdbc.queryForObject("SELECT id FROM products WHERE sku='P1-ORDER-B'", Long.class);
            jdbc.update("INSERT INTO product_images(product_id,image_url,sort_order,is_primary) VALUES (?,?,?,?)",
                    a, "https://example.test/a-0.png", 0, true);
            jdbc.update("INSERT INTO product_images(product_id,image_url,sort_order,is_primary) VALUES (?,?,?,?)",
                    a, "https://example.test/a-1.png", 1, false);
            assertThrows(DataAccessException.class, () ->
                    jdbc.update("INSERT INTO product_images(product_id,image_url,sort_order,is_primary) VALUES (?,?,?,?)",
                            a, "https://example.test/a-duplicate.png", 1, false));
            jdbc.update("INSERT INTO product_images(product_id,image_url,sort_order,is_primary) VALUES (?,?,?,?)",
                    b, "https://example.test/b-0.png", 0, true);
            assertEquals(2, jdbc.queryForObject(
                    "SELECT COUNT(*) FROM product_images WHERE product_id=?", Integer.class, a));
            assertEquals(1, jdbc.queryForObject(
                    "SELECT COUNT(*) FROM product_images WHERE product_id=? AND sort_order=0", Integer.class, b));
        } finally {
            admin.execute("DROP DATABASE " + database);
        }
    }
}
