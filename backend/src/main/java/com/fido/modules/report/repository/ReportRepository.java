package com.fido.modules.report.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import com.fido.modules.report.dto.response.ProductPerformanceDto;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Read projections only; report owns no Order entity or aggregate table. */
@Repository
public class ReportRepository {

    private static final String SALES_COLUMNS = """
            COALESCE(SUM(p.amount_received), 0) AS completed_sales,
            COALESCE(SUM(CASE WHEN o.order_status = 'RETURNED'
                THEN o.total_snapshot ELSE 0 END), 0) AS returned_adjustment
            """;
    private static final String SALES_COHORT = """
            FROM orders o JOIN payments p ON p.order_id = o.order_id
            WHERE o.order_status IN ('COMPLETED', 'RETURNED')
              AND o.completed_at >= ? AND o.completed_at < ?
            """;

    static final String DAILY_SALES_SQL = "SELECT CAST(TIMESTAMPADD(HOUR, 7, o.completed_at) AS DATE) AS local_day, "
                        + SALES_COLUMNS + SALES_COHORT + " GROUP BY local_day ORDER BY local_day";

    static final String DAILY_ORDERS_SQL = """
                SELECT CAST(TIMESTAMPADD(HOUR, 7, created_at) AS DATE) AS local_day,
                       order_status, COUNT(*) AS order_count
                FROM orders WHERE created_at >= ? AND created_at < ?
                GROUP BY local_day, order_status ORDER BY local_day, order_status
                """;

    static final String TOP_PRODUCTS_SQL = """
                SELECT totals.product_id, p.name AS product_name, image.image_url AS thumbnail,
                       totals.completed_units, totals.returned_units, totals.net_units
                FROM (
                    SELECT v.product_id, SUM(oi.quantity) AS completed_units,
                           SUM(CASE WHEN o.order_status = 'RETURNED' THEN oi.quantity ELSE 0 END) AS returned_units,
                           SUM(CASE WHEN o.order_status = 'RETURNED' THEN 0 ELSE oi.quantity END) AS net_units
                    FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
                    JOIN product_variants v ON v.variant_id = oi.variant_id
                    WHERE o.order_status IN ('COMPLETED', 'RETURNED')
                      AND o.completed_at >= ? AND o.completed_at < ?
                    GROUP BY v.product_id
                ) totals
                JOIN products p ON p.product_id = totals.product_id
                LEFT JOIN (
                    SELECT product_id, image_url,
                           ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY sort_order, image_id) AS image_rank
                    FROM product_images
                ) image ON image.product_id = totals.product_id AND image.image_rank = 1
                ORDER BY totals.net_units DESC, totals.completed_units DESC, totals.product_id ASC
                LIMIT ?
                """;

    private final JdbcTemplate jdbc;

    public ReportRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record SalesTotals(BigDecimal completed, BigDecimal returned) {
    }

    public SalesTotals sales(LocalDateTime startUtc, LocalDateTime endUtc) {
        return jdbc.queryForObject("SELECT " + SALES_COLUMNS + SALES_COHORT,
                (rs, row) -> new SalesTotals(
                        rs.getBigDecimal("completed_sales"),
                        rs.getBigDecimal("returned_adjustment")
                ),
                startUtc, endUtc
        );
    }

    public Map<String, Long> countsByStatus(LocalDateTime startUtc, LocalDateTime endUtc) {
        return jdbc.query("""
                SELECT order_status, COUNT(*) AS order_count
                FROM orders
                WHERE created_at >= ? AND created_at < ?
                GROUP BY order_status
                """, rs -> {
                    Map<String, Long> counts = new LinkedHashMap<>();
                    while (rs.next()) {
                        counts.put(rs.getString("order_status"), rs.getLong("order_count"));
                    }
                    return counts;
                }, startUtc, endUtc);
    }

    public record DailySales(LocalDate date, BigDecimal completed, BigDecimal returned) {}
    public record DailyOrders(LocalDate date, String status, long count) {}

    public List<DailySales> dailySales(LocalDateTime startUtc, LocalDateTime endUtc) {
        return jdbc.query(DAILY_SALES_SQL,
                (rs, row) -> new DailySales(rs.getObject("local_day", LocalDate.class),
                        rs.getBigDecimal("completed_sales"), rs.getBigDecimal("returned_adjustment")),
                startUtc, endUtc);
    }

    public List<DailyOrders> dailyOrders(LocalDateTime startUtc, LocalDateTime endUtc) {
        return jdbc.query(DAILY_ORDERS_SQL, (rs, row) -> new DailyOrders(rs.getObject("local_day", LocalDate.class),
                        rs.getString("order_status"), rs.getLong("order_count")), startUtc, endUtc);
    }

    public List<ProductPerformanceDto.Item> topProducts(LocalDateTime startUtc, LocalDateTime endUtc, int limit) {
        // Aggregate before joining the single thumbnail. Catalog FKs protect historical references.
        return jdbc.query(TOP_PRODUCTS_SQL, (rs, row) -> new ProductPerformanceDto.Item(rs.getLong("product_id"),
                        rs.getString("product_name"), rs.getString("thumbnail"),
                        rs.getLong("completed_units"), rs.getLong("returned_units"), rs.getLong("net_units")),
                startUtc, endUtc, limit);
    }
}
