package com.fido.modules.order.repository;

import com.fido.modules.order.dto.response.ReturnReceiptDto;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class ReturnReceiptRepository {
    private final JdbcTemplate jdbc;

    public ReturnReceiptRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Prior(long id, String fingerprint) {}

    public Optional<Prior> prior(long orderId, String key) {
        return jdbc
                .query(
                        "SELECT id,request_fingerprint FROM order_return_receipts WHERE order_id=? AND source_operation_id=? FOR UPDATE",
                        (r, n) -> new Prior(r.getLong(1), r.getString(2)),
                        orderId,
                        key)
                .stream()
                .findFirst();
    }

    public long previouslyReceived(long itemId) {
        return jdbc.queryForObject(
                "SELECT COALESCE(SUM(received_quantity),0) FROM order_return_receipt_items WHERE order_item_id=?",
                Long.class,
                itemId);
    }

    public long create(long orderId, String key, String fingerprint, long actor, String reason) {
        var holder = new GeneratedKeyHolder();
        jdbc.update(
                connection -> {
                    var ps =
                            connection.prepareStatement(
                                    "INSERT INTO order_return_receipts(order_id,source_operation_id,request_fingerprint,received_by,reason) VALUES (?,?,?,?,?)",
                                    new String[] {"id"});
                    ps.setLong(1, orderId);
                    ps.setString(2, key);
                    ps.setString(3, fingerprint);
                    ps.setLong(4, actor);
                    ps.setString(5, reason);
                    return ps;
                },
                holder);
        return holder.getKey().longValue();
    }

    public void line(long id, long itemId, int received, int sellable) {
        String condition = sellable == received ? "SELLABLE" : sellable == 0 ? "DAMAGED" : "MIXED";
        String disposition =
                sellable == received
                        ? "RESTOCK"
                        : sellable == 0 ? "QUARANTINE" : "RESTOCK_AND_QUARANTINE";
        jdbc.update(
                "INSERT INTO order_return_receipt_items(return_receipt_id,order_item_id,received_quantity,sellable_quantity,condition_code,disposition) VALUES (?,?,?,?,?,?)",
                id,
                itemId,
                received,
                sellable,
                condition,
                disposition);
    }

    public List<ReturnReceiptDto> list(long orderId) {
        return jdbc.query(
                "SELECT * FROM order_return_receipts WHERE order_id=? ORDER BY id",
                (r, n) ->
                        new ReturnReceiptDto(
                                r.getLong("id"),
                                r.getLong("order_id"),
                                r.getString("source_operation_id"),
                                r.getLong("received_by"),
                                r.getString("reason"),
                                r.getTimestamp("created_at").toLocalDateTime(),
                                jdbc.query(
                                        "SELECT * FROM order_return_receipt_items WHERE return_receipt_id=? ORDER BY order_item_id",
                                        (line, i) ->
                                                new ReturnReceiptDto.Line(
                                                        line.getLong("order_item_id"),
                                                        line.getInt("received_quantity"),
                                                        line.getInt("sellable_quantity"),
                                                        line.getString("condition_code"),
                                                        line.getString("disposition")),
                                        r.getLong("id"))),
                orderId);
    }
}
