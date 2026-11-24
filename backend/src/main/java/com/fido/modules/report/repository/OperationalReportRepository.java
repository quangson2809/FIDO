package com.fido.modules.report.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.*;

@Repository
public class OperationalReportRepository {
    private final JdbcTemplate jdbc;

    public OperationalReportRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Totals(long count, java.math.BigDecimal total) {}

    public Totals placedTotals(LocalDateTime from, LocalDateTime to) {
        return jdbc.queryForObject(
                "SELECT COUNT(*),COALESCE(SUM(total_amount),0) FROM orders WHERE created_at>=? AND created_at<?",
                (r, n) -> new Totals(r.getLong(1), r.getBigDecimal(2)),
                from,
                to);
    }

    public Map<String, Long> statusCounts(LocalDateTime from, LocalDateTime to) {
        Map<String, Long> counts = new LinkedHashMap<>();
        jdbc.query(
                "SELECT status,COUNT(*) FROM orders WHERE created_at>=? AND created_at<? GROUP BY status",
                r -> {
                    counts.put(r.getString(1), r.getLong(2));
                },
                from,
                to);
        return counts;
    }

    public record OrderRow(
            long order_id,
            String order_code,
            String status,
            long total_amount,
            LocalDateTime created_at) {}

    public long orderCount(LocalDateTime from, LocalDateTime to, String status) {
        return jdbc.queryForObject(
                "SELECT COUNT(*) FROM orders WHERE created_at>=? AND created_at<? AND (? IS NULL OR status=?)",
                Long.class,
                from,
                to,
                status,
                status);
    }

    public List<OrderRow> orderRows(
            LocalDateTime from, LocalDateTime to, String status, int limit, long offset) {
        return jdbc.query(
                "SELECT id,order_number,status,total_amount,created_at FROM orders WHERE created_at>=? AND created_at<? AND (? IS NULL OR status=?) ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?",
                (r, n) ->
                        new OrderRow(
                                r.getLong(1),
                                r.getString(2),
                                r.getString(3),
                                r.getLong(4),
                                r.getTimestamp(5).toLocalDateTime()),
                from,
                to,
                status,
                status,
                limit,
                offset);
    }

    private static final String SLOW =
            """
        FROM inventories i JOIN products p ON p.id=i.product_id JOIN warehouses w ON w.id=i.warehouse_id
        WHERE i.quantity_on_hand>0 AND w.status='ACTIVE' AND NOT EXISTS (
            SELECT 1 FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN payments pay ON pay.order_id=o.id
            WHERE oi.product_id=p.id AND o.status='COMPLETED' AND pay.payment_status='PAID' AND pay.collected_at>=? AND pay.collected_at<?)
        """;

    public record SlowProduct(
            long product_id,
            String sku,
            String name,
            int quantity_on_hand,
            LocalDateTime last_sale_at) {}

    public long slowCount(LocalDateTime from, LocalDateTime to) {
        return jdbc.queryForObject("SELECT COUNT(*) " + SLOW, Long.class, from, to);
    }

    public List<SlowProduct> slowRows(
            LocalDateTime from, LocalDateTime to, int limit, long offset) {
        return jdbc.query(
                """
        SELECT p.id,p.sku,p.name,i.quantity_on_hand,(SELECT MAX(pay.collected_at) FROM order_items oi
        JOIN orders o ON o.id=oi.order_id JOIN payments pay ON pay.order_id=o.id
        WHERE oi.product_id=p.id AND o.status='COMPLETED' AND pay.payment_status='PAID') last_sale_at
        """
                        + SLOW
                        + " ORDER BY i.quantity_on_hand DESC,p.id LIMIT ? OFFSET ?",
                (r, n) ->
                        new SlowProduct(
                                r.getLong(1),
                                r.getString(2),
                                r.getString(3),
                                r.getInt(4),
                                r.getTimestamp(5) == null
                                        ? null
                                        : r.getTimestamp(5).toLocalDateTime()),
                from,
                to,
                limit,
                offset);
    }
}
