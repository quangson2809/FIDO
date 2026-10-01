package com.fido.modules.report.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Read projections only; report owns no Order entity or aggregate table. */
@Repository
public class ReportRepository {

    private final JdbcTemplate jdbc;

    public ReportRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record SalesTotals(BigDecimal completed, BigDecimal returned) {
    }

    public SalesTotals sales(LocalDateTime startUtc, LocalDateTime endUtc) {
        return jdbc.queryForObject("""
                SELECT COALESCE(SUM(p.amount_received), 0) AS completed_sales,
                       COALESCE(SUM(CASE WHEN o.order_status = 'RETURNED'
                           THEN o.total_snapshot ELSE 0 END), 0) AS returned_adjustment
                FROM orders o
                JOIN payments p ON p.order_id = o.order_id
                WHERE o.order_status IN ('COMPLETED', 'RETURNED')
                  AND o.completed_at >= ? AND o.completed_at < ?
                """,
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
}
