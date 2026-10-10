package com.fido.modules.report.repository;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@Sql("/persistence-fixture.sql")
class ReportRepositoryTests {
    @Autowired ReportRepository reports;
    @Autowired JdbcTemplate jdbc;
    private static final LocalDateTime START = LocalDateTime.parse("2020-01-01T17:00:00");
    private static final LocalDateTime END = LocalDateTime.parse("2020-01-03T17:00:00");

    private void completedOrder(long id, String status, String completed) {
        jdbc.update("""
                INSERT INTO orders(order_id,order_code,order_status,recipient_phone,recipient_address,
                    subtotal_snapshot,discount_snapshot,shipping_fee_snapshot,total_snapshot,created_at,updated_at,completed_at)
                VALUES (?,? ,?,'0900000000','Report fixture',100,0,0,100,'2020-01-02 00:00:00','2020-01-02 00:00:00',?)
                """, id, "report-" + id, status, completed);
    }
    private void item(long id, long order, long variant, int quantity) {
        jdbc.update("""
                INSERT INTO order_items(order_item_id,order_id,variant_id,product_name_snapshot,size_snapshot,color_snapshot,
                    unit_price_snapshot,quantity,line_total_snapshot)
                VALUES (?,?,?,'Original name','M','Black',100,?,?)
                """, id, order, variant, quantity, quantity * 100);
    }
    @Test
    void variantsReturnsImagesAndCatalogChangesDoNotLoseOrMultiplyHistoricalUnits() {
        jdbc.update("INSERT INTO colors(color_id,code,name) VALUES(2,'report-color','Color')");
        jdbc.update("INSERT INTO product_variants(variant_id,product_id,size_value_id,color_id,sale_status,created_at,updated_at) VALUES(2,1,1,2,'STOPPED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)");
        jdbc.update("UPDATE products SET name='Renamed stopped product',sale_status='STOPPED',base_price=999999 WHERE product_id=1");
        jdbc.update("INSERT INTO product_images(image_id,product_id,image_url,sort_order) VALUES(2,1,'https://example.invalid/second.png',1)");
        completedOrder(2, "COMPLETED", "2020-01-01 17:00:00");
        completedOrder(3, "RETURNED", "2020-01-02 16:59:59.999999");
        jdbc.update("UPDATE orders SET returned_at='2020-02-01 00:00:00' WHERE order_id=3");
        completedOrder(4, "SHIPPING", "2020-01-02 00:00:00");
        completedOrder(5, "COMPLETED", "2020-01-03 17:00:00");
        item(2, 2, 1, 3); item(3, 2, 2, 5); item(4, 3, 1, 2); item(5, 4, 1, 900); item(6, 5, 1, 800);
        var result = reports.topProducts(START, END, 10);
        assertEquals(1, result.size());
        var product = result.get(0);
        assertEquals(1, product.product_id());
        assertEquals("Renamed stopped product", product.product_name());
        assertEquals("https://example.invalid/test.png", product.thumbnail());
        assertEquals(10, product.completed_units());
        assertEquals(2, product.returned_units());
        assertEquals(8, product.net_units());
        jdbc.update("DELETE FROM product_images WHERE product_id=1");
        assertNull(reports.topProducts(START, END, 10).get(0).thumbnail());
        // FK prevents deletion of the Product/Variant referenced by immutable historical items.
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () -> jdbc.update("DELETE FROM product_variants WHERE variant_id=2"));
    }

    @Test
    void tiesUseCompletedUnitsThenProductIdAndLimitIsAppliedAfterAggregation() {
        for (int product = 2; product <= 4; product++) {
            jdbc.update("INSERT INTO products(product_id,category_id,size_system_id,name,base_price,sale_status,created_at,updated_at) VALUES(?,1,1,?,100,'STOPPED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)", product, "Product " + product);
            jdbc.update("INSERT INTO product_variants(variant_id,product_id,size_value_id,color_id,sale_status,created_at,updated_at) VALUES(?,?,1,1,'STOPPED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)", product, product);
            completedOrder(product, "COMPLETED", "2020-01-02 00:00:00");
            item(product, product, product, 5);
        }
        completedOrder(5, "RETURNED", "2020-01-02 00:00:00");
        item(5, 5, 4, 3);
        var result = reports.topProducts(START, END, 2);
        assertEquals(java.util.List.of(4L, 2L), result.stream().map(item -> item.product_id()).toList());
        assertEquals(8, result.get(0).completed_units());
        assertEquals(5, result.get(0).net_units());
    }

    @Test
    void mysqlExplainExecutesTheActualParameterizedAggregateQueries() throws Exception {
        try (var connection = jdbc.getDataSource().getConnection()) {
            if (!connection.getMetaData().getDatabaseProductName().equals("MySQL")) return;
        }
        for (String sql : java.util.List.of(ReportRepository.DAILY_SALES_SQL, ReportRepository.DAILY_ORDERS_SQL, ReportRepository.TOP_PRODUCTS_SQL)) {
            Object[] parameters = sql.equals(ReportRepository.TOP_PRODUCTS_SQL) ? new Object[]{START, END, 10} : new Object[]{START, END};
            var plan = jdbc.queryForList("EXPLAIN " + sql, parameters);
            assertFalse(plan.isEmpty());
            System.out.println("REPORT EXPLAIN: " + plan);
        }
    }
}
