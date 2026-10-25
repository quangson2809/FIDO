package com.fido.persistence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.UUID;

class ProductImageOrderingMigrationTests {
    @Test
    void canonicalBaselineEnforcesUniqueImageOrderPerProduct() {
        var dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:image-order-" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1",
                "sa", "");
        Flyway flyway = Flyway.configure().dataSource(dataSource)
                .locations("classpath:db/migration").cleanDisabled(false).load();
        try {
            assertEquals(1, flyway.migrate().migrationsExecuted);
            JdbcTemplate jdbc = new JdbcTemplate(dataSource);
            jdbc.update("INSERT INTO products(sku,selling_price) VALUES (?,?)", "P1-ORDER-A", 1000L);
            jdbc.update("INSERT INTO products(sku,selling_price) VALUES (?,?)", "P1-ORDER-B", 1000L);
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
            flyway.clean();
        }
    }
}
