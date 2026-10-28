package com.fido.modules.report.repository;

import com.fido.modules.report.dto.response.ProductPerformanceDto;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Read-only report projections against the target schema.
 *
 * <p>Money is aggregated from persisted integer-VND Order snapshots. The Payment and
 * ShippingInfo joins enforce the approved COD completion/refund facts and date basis;
 * current catalog fields are used only for optional display data.</p>
 */
@Repository
public class ReportRepository {

    private static final String SALES_COLUMNS = """
            COALESCE(SUM(o.total_amount), 0) AS completed_sales,
            COALESCE(SUM(CASE WHEN o.status = 'RETURNED'
                THEN o.total_amount ELSE 0 END), 0) AS returned_adjustment
            """;

    private static final String SALES_COHORT = """
            FROM orders o
            JOIN payments p ON p.order_id = o.id
            JOIN shipping_infos s ON s.order_id = o.id
            WHERE o.status IN ('COMPLETED', 'RETURNED')
              AND s.shipping_status = 'DELIVERED'
              AND s.delivered_at >= ? AND s.delivered_at < ?
              AND o.currency = 'VND'
              AND p.currency = 'VND'
              AND p.amount = o.total_amount
              AND (
                  (o.status = 'COMPLETED'
                   AND p.payment_status = 'PAID'
                   AND p.collected_at IS NOT NULL
                   AND p.refund_amount = 0
                   AND p.refunded_at IS NULL)
                  OR
                  (o.status = 'RETURNED'
                   AND p.payment_status = 'REFUNDED'
                   AND p.refund_amount = p.amount
                   AND p.refunded_at IS NOT NULL)
              )
            """;

    static final String DAILY_SALES_SQL =
            "SELECT CAST(TIMESTAMPADD(HOUR, 7, s.delivered_at) AS DATE) AS local_day, "
                    + SALES_COLUMNS
                    + SALES_COHORT
                    + " GROUP BY local_day ORDER BY local_day";

    static final String DAILY_ORDERS_SQL = """
            SELECT CAST(TIMESTAMPADD(HOUR, 7, o.created_at) AS DATE) AS local_day,
                   o.status, COUNT(*) AS order_count
            FROM orders o
            WHERE o.created_at >= ? AND o.created_at < ?
            GROUP BY local_day, o.status
            ORDER BY local_day, o.status
            """;

    static final String TOP_PRODUCTS_SQL = """
            SELECT totals.product_id,
                   p.name AS product_name,
                   image.image_url AS thumbnail,
                   totals.completed_units,
                   totals.returned_units,
                   totals.completed_units - totals.returned_units AS net_units
            FROM (
                SELECT oi.product_id,
                       SUM(oi.quantity) AS completed_units,
                       SUM(CASE WHEN o.status = 'RETURNED'
                           THEN oi.quantity ELSE 0 END) AS returned_units
                FROM orders o
                JOIN shipping_infos s ON s.order_id = o.id
                JOIN order_items oi ON oi.order_id = o.id
                WHERE o.status IN ('COMPLETED', 'RETURNED')
                  AND s.shipping_status = 'DELIVERED'
                  AND s.delivered_at >= ? AND s.delivered_at < ?
                GROUP BY oi.product_id
            ) totals
            JOIN products p ON p.id = totals.product_id
            LEFT JOIN (
                SELECT product_id, image_url,
                       ROW_NUMBER() OVER (
                           PARTITION BY product_id
                           ORDER BY is_primary DESC, sort_order ASC, id ASC
                       ) AS image_rank
                FROM product_images
            ) image ON image.product_id = totals.product_id AND image.image_rank = 1
            ORDER BY net_units DESC, totals.completed_units DESC, totals.product_id ASC
            LIMIT ?
            """;

    private final JdbcTemplate jdbc;

    public ReportRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record SalesTotals(long completed, long returned) {}

    public SalesTotals sales(LocalDateTime startUtc, LocalDateTime endUtc) {
        return jdbc.queryForObject(
                "SELECT " + SALES_COLUMNS + SALES_COHORT,
                (rs, row) ->
                        new SalesTotals(
                                exactAggregate(rs, "completed_sales"),
                                exactAggregate(rs, "returned_adjustment")),
                startUtc,
                endUtc);
    }

    public Map<String, Long> countsByStatus(LocalDateTime startUtc, LocalDateTime endUtc) {
        return jdbc.query(
                """
                SELECT status, COUNT(*) AS order_count
                FROM orders
                WHERE created_at >= ? AND created_at < ?
                GROUP BY status
                """,
                rs -> {
                    Map<String, Long> counts = new LinkedHashMap<>();
                    while (rs.next()) {
                        counts.put(rs.getString("status"), rs.getLong("order_count"));
                    }
                    return counts;
                },
                startUtc,
                endUtc);
    }

    public record DailySales(LocalDate date, long completed, long returned) {}

    public record DailyOrders(LocalDate date, String status, long count) {}

    public List<DailySales> dailySales(LocalDateTime startUtc, LocalDateTime endUtc) {
        return jdbc.query(
                DAILY_SALES_SQL,
                (rs, row) ->
                        new DailySales(
                                rs.getObject("local_day", LocalDate.class),
                                exactAggregate(rs, "completed_sales"),
                                exactAggregate(rs, "returned_adjustment")),
                startUtc,
                endUtc);
    }

    public List<DailyOrders> dailyOrders(LocalDateTime startUtc, LocalDateTime endUtc) {
        return jdbc.query(
                DAILY_ORDERS_SQL,
                (rs, row) ->
                        new DailyOrders(
                                rs.getObject("local_day", LocalDate.class),
                                rs.getString("status"),
                                rs.getLong("order_count")),
                startUtc,
                endUtc);
    }

    public List<ProductPerformanceDto.Item> topProducts(
            LocalDateTime startUtc, LocalDateTime endUtc, int limit) {
        return jdbc.query(
                TOP_PRODUCTS_SQL,
                (rs, row) ->
                        new ProductPerformanceDto.Item(
                                rs.getLong("product_id"),
                                rs.getString("product_name"),
                                rs.getString("thumbnail"),
                                exactAggregate(rs, "completed_units"),
                                exactAggregate(rs, "returned_units"),
                                exactAggregate(rs, "net_units")),
                startUtc,
                endUtc,
                limit);
    }

    /**
     * MySQL returns SUM(BIGINT) as DECIMAL. Convert exactly so an aggregate cannot
     * silently truncate, round, or overflow the API's signed-BIGINT integer VND contract.
     */
    private static long exactAggregate(ResultSet result, String column) throws SQLException {
        BigDecimal value = result.getBigDecimal(column);
        if (value == null) {
            return 0L;
        }
        try {
            return value.longValueExact();
        } catch (ArithmeticException exception) {
            throw new SQLException("Report aggregate exceeds the supported integer range", exception);
        }
    }
}
