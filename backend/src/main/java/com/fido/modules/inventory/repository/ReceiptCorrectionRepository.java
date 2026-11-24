package com.fido.modules.inventory.repository;

import com.fido.modules.inventory.dto.response.ReceiptCorrectionDto;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public class ReceiptCorrectionRepository {
    private final JdbcTemplate jdbc;

    public ReceiptCorrectionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Prior(long id, String fingerprint) {}

    public Optional<Prior> prior(long receipt, String key) {
        return jdbc
                .query(
                        "SELECT id,request_fingerprint FROM goods_receipt_corrections WHERE goods_receipt_id=? AND source_operation_id=? FOR UPDATE",
                        (r, n) -> new Prior(r.getLong(1), r.getString(2)),
                        receipt,
                        key)
                .stream()
                .findFirst();
    }

    public Long latest(long receipt) {
        return jdbc.queryForObject(
                "SELECT MAX(id) FROM goods_receipt_corrections WHERE goods_receipt_id=?",
                Long.class,
                receipt);
    }

    public Optional<ReceiptCorrectionDto.Line> latestLine(long source) {
        return jdbc
                .query(
                        "SELECT * FROM goods_receipt_correction_items WHERE goods_receipt_item_id=? ORDER BY correction_id DESC LIMIT 1",
                        (r, n) -> line(r),
                        source)
                .stream()
                .findFirst();
    }

    public long create(long receipt, String key, String hash, String reason, long actor) {
        var holder = new GeneratedKeyHolder();
        jdbc.update(
                c -> {
                    var p =
                            c.prepareStatement(
                                    "INSERT INTO goods_receipt_corrections(goods_receipt_id,source_operation_id,request_fingerprint,reason,created_by) VALUES (?,?,?,?,?)",
                                    new String[] {"id"});
                    p.setLong(1, receipt);
                    p.setString(2, key);
                    p.setString(3, hash);
                    p.setString(4, reason);
                    p.setLong(5, actor);
                    return p;
                },
                holder);
        return holder.getKey().longValue();
    }

    public void line(long id, ReceiptCorrectionDto.Line line) {
        jdbc.update(
                "INSERT INTO goods_receipt_correction_items(correction_id,goods_receipt_item_id,before_quantity,after_quantity,before_unit_cost,after_unit_cost,quantity_delta,value_delta) VALUES (?,?,?,?,?,?,?,?)",
                id,
                line.receipt_item_id(),
                line.before_quantity(),
                line.corrected_quantity(),
                line.before_unit_cost(),
                line.corrected_unit_cost(),
                line.quantity_delta(),
                line.value_delta());
    }

    private ReceiptCorrectionDto.Line line(java.sql.ResultSet r) throws java.sql.SQLException {
        return new ReceiptCorrectionDto.Line(
                r.getLong("goods_receipt_item_id"),
                r.getInt("before_quantity"),
                r.getInt("after_quantity"),
                r.getLong("before_unit_cost"),
                r.getLong("after_unit_cost"),
                r.getInt("quantity_delta"),
                r.getLong("value_delta"));
    }

    public List<ReceiptCorrectionDto> list(long receipt) {
        return jdbc.query(
                "SELECT * FROM goods_receipt_corrections WHERE goods_receipt_id=? ORDER BY id",
                (r, n) ->
                        new ReceiptCorrectionDto(
                                r.getLong("id"),
                                r.getLong("goods_receipt_id"),
                                r.getString("source_operation_id"),
                                r.getString("reason"),
                                r.getLong("created_by"),
                                r.getTimestamp("created_at").toLocalDateTime(),
                                jdbc.query(
                                        "SELECT * FROM goods_receipt_correction_items WHERE correction_id=? ORDER BY goods_receipt_item_id",
                                        (l, i) -> line(l),
                                        r.getLong("id"))),
                receipt);
    }
}
