package com.fido.modules.report.repository;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@Sql("/persistence-fixture.sql")
class ReportRepositoryTests {
    @Autowired ReportRepository reports;
    @Autowired JdbcTemplate jdbc;
    private static final LocalDateTime START = LocalDateTime.parse("2020-01-01T17:00:00");
    private static final LocalDateTime END = LocalDateTime.parse("2020-01-03T17:00:00");

    private long completedOrder(String status, String delivered) {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        String fingerprint = suffix + UUID.randomUUID().toString().replace("-", "");
        jdbc.update("""
                INSERT INTO orders(
                    account_id,order_number,idempotency_key,request_fingerprint,status,
                    subtotal,discount_amount,shipping_fee,total_amount,currency,
                    placed_at,created_at,updated_at)
                VALUES (1,?,?,?, ?,100,0,0,100,'VND',
                    '2020-01-02 00:00:00','2020-01-02 00:00:00','2020-01-02 00:00:00')
                """, "RPT-" + suffix.substring(0, 24), "report-idem-" + suffix, fingerprint, status);
        long orderId = jdbc.queryForObject(
                "SELECT id FROM orders WHERE order_number=?", Long.class, "RPT-" + suffix.substring(0, 24));
        String shippingStatus = delivered != null ? "DELIVERED" : "SHIPPED";
        jdbc.update("""
                INSERT INTO shipping_infos(
                    order_id,recipient_name,recipient_phone,shipping_status,shipped_at,delivered_at,updated_at)
                VALUES (?,'Report recipient','0900000000',?,?,?,CURRENT_TIMESTAMP(6))
                """, orderId, shippingStatus, delivered, delivered);
        return orderId;
    }

    private void item(long orderId, long productId, int quantity) {
        jdbc.update("""
                INSERT INTO order_items(
                    order_id,product_id,sku_snapshot,product_name_snapshot,attribute_snapshot,
                    image_url_snapshot,quantity,unit_price,discount_amount,line_total)
                VALUES (?,?,'REPORT-SNAPSHOT','Original historical name','{}','',?,100,0,?)
                """, orderId, productId, quantity, quantity * 100L);
    }

    private long createIndependentChildProduct(String name, String slug, String sku, long price) {
        jdbc.update("""
                INSERT INTO products(parent_product_id,category_id,brand_id,name,slug,sku,
                    selling_price,cost_price,status)
                VALUES (1,1,1,?,?,?,? ,0,'ACTIVE')
                """, name, slug, sku, price);
        return jdbc.queryForObject("SELECT id FROM products WHERE sku=?", Long.class, sku);
    }

    @Test
    void independentlySellableProductsKeepTheirOwnHistoricalUnitsAfterCatalogChanges() {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        long child = createIndependentChildProduct(
                "Second independent product", "report-child-" + suffix, "RPT-SKU-" + suffix, 999999);
        jdbc.update("""
                INSERT INTO product_images(product_id,image_url,is_primary,sort_order)
                VALUES (?, 'https://example.invalid/second.png', TRUE, 0)
                """, child);

        long completed = completedOrder("COMPLETED", "2020-01-01 17:00:00");
        long returned = completedOrder("RETURNED", "2020-01-02 16:59:59.999999");
        long shipping = completedOrder("SHIPPING", null);
        completedOrder("COMPLETED", "2020-01-03 17:00:00");
        item(completed, 1, 3);
        item(completed, child, 5);
        item(returned, 1, 2);
        item(shipping, 1, 900);

        jdbc.update("UPDATE products SET name='Renamed inactive product',status='INACTIVE',selling_price=999999 WHERE id=1");
        jdbc.update("UPDATE products SET name='Renamed independent child',status='INACTIVE' WHERE id=?", child);

        var result = reports.topProducts(START, END, 10);
        assertEquals(2, result.size());
        var childItem = result.get(0);
        assertEquals(child, childItem.product_id());
        assertEquals("Renamed independent child", childItem.product_name());
        assertEquals("https://example.invalid/second.png", childItem.thumbnail());
        assertEquals(5, childItem.completed_units());
        assertEquals(0, childItem.returned_units());
        assertEquals(5, childItem.net_units());

        var parentItem = result.get(1);
        assertEquals(1, parentItem.product_id());
        assertEquals("Renamed inactive product", parentItem.product_name());
        assertEquals("https://example.invalid/test.png", parentItem.thumbnail());
        assertEquals(5, parentItem.completed_units());
        assertEquals(2, parentItem.returned_units());
        assertEquals(3, parentItem.net_units());

        jdbc.update("DELETE FROM product_images WHERE product_id=?", child);
        assertNull(reports.topProducts(START, END, 10).get(0).thumbnail());
        assertThrows(
                org.springframework.dao.DataIntegrityViolationException.class,
                () -> jdbc.update("DELETE FROM products WHERE id=?", child));
    }

    @Test
    void tiesUseCompletedUnitsThenProductIdAndLimitIsAppliedAfterAggregation() {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        List<Long> products = new ArrayList<>();
        for (int i = 2; i <= 4; i++) {
            products.add(createIndependentChildProduct(
                    "Product " + i, "report-tie-" + i + "-" + suffix, "RPT-TIE-" + i + "-" + suffix, 100));
        }
        long productTwo = products.get(0);
        long productThree = products.get(1);
        long productFour = products.get(2);
        long twoOrder = completedOrder("COMPLETED", "2020-01-02 00:00:00");
        long threeOrder = completedOrder("COMPLETED", "2020-01-02 00:00:00");
        long fourOrder = completedOrder("COMPLETED", "2020-01-02 00:00:00");
        long returnOrder = completedOrder("RETURNED", "2020-01-02 00:00:00");
        item(twoOrder, productTwo, 5);
        item(threeOrder, productThree, 5);
        item(fourOrder, productFour, 8);
        item(returnOrder, productFour, 3);

        var result = reports.topProducts(START, END, 2);
        assertEquals(List.of(productFour, Math.min(productTwo, productThree)),
                result.stream().map(item -> item.product_id()).toList());
        assertEquals(8, result.get(0).completed_units());
        assertEquals(3, result.get(0).returned_units());
        assertEquals(5, result.get(0).net_units());
    }

    @Test
    void mysqlExplainExecutesTheActualParameterizedAggregateQueries() throws Exception {
        try (var connection = jdbc.getDataSource().getConnection()) {
            if (!connection.getMetaData().getDatabaseProductName().equals("MySQL")) return;
        }
        for (String sql : List.of(
                ReportRepository.DAILY_SALES_SQL,
                ReportRepository.DAILY_ORDERS_SQL,
                ReportRepository.TOP_PRODUCTS_SQL)) {
            Object[] parameters = sql.equals(ReportRepository.TOP_PRODUCTS_SQL)
                    ? new Object[] {START, END, 10}
                    : new Object[] {START, END};
            var plan = jdbc.queryForList("EXPLAIN " + sql, parameters);
            assertFalse(plan.isEmpty());
        }
    }
}
