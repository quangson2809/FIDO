package com.fido.config.devseed;

import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;

import java.util.Objects;

/** Nạp catalog dev/test theo manifest ảnh; Product cha và con đều có SKU, giá và thuộc tính riêng. */
@Component
@Profile({"dev", "test"})
public class DevSeedCatalogData {
    private final JdbcTemplate jdbc;

    public DevSeedCatalogData(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void seed() {
        // Dùng kết nối của giao dịch seed hiện tại; dữ liệu này không thuộc migration Flyway.
        new ResourceDatabasePopulator(new ClassPathResource("devseed/catalog.sql"))
                .execute(Objects.requireNonNull(jdbc.getDataSource()));
    }
}
