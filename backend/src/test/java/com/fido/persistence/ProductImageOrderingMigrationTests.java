package com.fido.persistence;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ProductImageOrderingMigrationTests {

    @Test
    void v4BackfillsLegacyImageOrderPerProductByImageId() {
        String url = "jdbc:h2:mem:image-order-" + UUID.randomUUID()
                + ";MODE=MySQL;DB_CLOSE_DELAY=-1";
        DriverManagerDataSource dataSource = new DriverManagerDataSource(url, "sa", "");

        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target("3")
                .load()
                .migrate();

        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        jdbc.update("INSERT INTO categories (category_id,parent_category_id,name) VALUES (1,NULL,'Root')");
        jdbc.update("INSERT INTO size_systems (size_system_id,code,name) VALUES (1,'default','Default')");
        jdbc.update("""
                INSERT INTO products (
                    product_id, category_id, brand_id, size_system_id, name,
                    description, gender, season, style, material_care,
                    base_price, sale_status, created_at, updated_at
                ) VALUES
                    (1,1,NULL,1,'Product 1',NULL,NULL,NULL,NULL,NULL,100.00,'ON_SALE',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
                    (2,1,NULL,1,'Product 2',NULL,NULL,NULL,NULL,NULL,100.00,'ON_SALE',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """);
        jdbc.update("INSERT INTO product_images (image_id,product_id,image_url,alt_text) VALUES (10,1,'p1-10',NULL)");
        jdbc.update("INSERT INTO product_images (image_id,product_id,image_url,alt_text) VALUES (2,1,'p1-2',NULL)");
        jdbc.update("INSERT INTO product_images (image_id,product_id,image_url,alt_text) VALUES (7,1,'p1-7',NULL)");
        jdbc.update("INSERT INTO product_images (image_id,product_id,image_url,alt_text) VALUES (5,2,'p2-5',NULL)");

        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .load()
                .migrate();

        assertEquals(0, sortOrder(jdbc, 2L));
        assertEquals(1, sortOrder(jdbc, 7L));
        assertEquals(2, sortOrder(jdbc, 10L));
        assertEquals(0, sortOrder(jdbc, 5L));
    }

    private int sortOrder(JdbcTemplate jdbc, Long imageId) {
        return jdbc.queryForObject(
                "SELECT sort_order FROM product_images WHERE image_id=?",
                Integer.class,
                imageId
        );
    }
}
