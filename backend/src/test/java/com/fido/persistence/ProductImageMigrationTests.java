package com.fido.persistence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;

class ProductImageMigrationTests {

    @Test
    void migrationBackfillsExistingImagesByLegacyImageIdOrder() throws Exception {
        String url = "jdbc:h2:mem:product-image-migration-"
                + UUID.randomUUID()
                + ";MODE=MySQL;DB_CLOSE_DELAY=-1";

        Flyway.configure()
                .dataSource(url, "sa", "")
                .target(MigrationVersion.fromVersion("3"))
                .load()
                .migrate();

        try (var connection = DriverManager.getConnection(url, "sa", "");
                var statement = connection.createStatement()) {
            statement.executeUpdate(
                    "INSERT INTO categories(category_id,parent_category_id,name) "
                            + "VALUES (100,NULL,'Migration root')"
            );
            statement.executeUpdate(
                    "INSERT INTO size_systems(size_system_id,code,name) "
                            + "VALUES (100,'migration-size','Migration size')"
            );
            statement.executeUpdate(
                    """
                    INSERT INTO products(
                        product_id,category_id,brand_id,size_system_id,name,
                        description,gender,season,style,material_care,
                        base_price,sale_status,created_at,updated_at
                    ) VALUES (
                        100,100,NULL,100,'Migration product',
                        NULL,NULL,NULL,NULL,NULL,
                        100.00,'ON_SALE',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
                    )
                    """
            );
            statement.executeUpdate(
                    """
                    INSERT INTO product_images(image_id,product_id,image_url,alt_text)
                    VALUES
                        (20,100,'https://example.test/second.png',NULL),
                        (10,100,'https://example.test/first.png',NULL)
                    """
            );
        }

        Flyway.configure()
                .dataSource(url, "sa", "")
                .load()
                .migrate();

        List<String> orderedUrls = new ArrayList<>();
        List<Integer> sortOrders = new ArrayList<>();

        try (var connection = DriverManager.getConnection(url, "sa", "");
                var statement = connection.createStatement();
                var result = statement.executeQuery(
                        "SELECT image_url,sort_order FROM product_images "
                                + "WHERE product_id=100 ORDER BY sort_order"
                )) {
            while (result.next()) {
                orderedUrls.add(result.getString(1));
                sortOrders.add(result.getInt(2));
            }
        }

        assertEquals(
                List.of(
                        "https://example.test/first.png",
                        "https://example.test/second.png"
                ),
                orderedUrls
        );
        assertEquals(List.of(0, 1), sortOrders);

        assertThrows(SQLException.class, () -> {
            try (var connection = DriverManager.getConnection(url, "sa", "");
                    var statement = connection.createStatement()) {
                statement.executeUpdate(
                        """
                        INSERT INTO product_images(
                            image_id,product_id,image_url,alt_text,sort_order
                        ) VALUES (
                            30,100,'https://example.test/duplicate.png',NULL,0
                        )
                        """
                );
            }
        });
    }
}
