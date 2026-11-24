package com.fido.modules.inventory.repository;

import com.fido.modules.inventory.dto.response.StocktakeDto;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public class StocktakeRepository {
    private final JdbcTemplate jdbc;

    public StocktakeRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Prior(long id, String fingerprint) {}

    public Optional<Prior> prior(String key) {
        return jdbc
                .query(
                        "SELECT id,request_fingerprint FROM stocktakes WHERE source_operation_id=?",
                        (r, n) -> new Prior(r.getLong(1), r.getString(2)),
                        key)
                .stream()
                .findFirst();
    }

    public long create(long warehouse, String key, String hash, String reason, long actor) {
        var holder = new GeneratedKeyHolder();
        jdbc.update(
                c -> {
                    var p =
                            c.prepareStatement(
                                    "INSERT INTO stocktakes(warehouse_id,source_operation_id,request_fingerprint,reason,created_by) VALUES (?,?,?,?,?)",
                                    new String[] {"id"});
                    p.setLong(1, warehouse);
                    p.setString(2, key);
                    p.setString(3, hash);
                    p.setString(4, reason);
                    p.setLong(5, actor);
                    return p;
                },
                holder);
        return holder.getKey().longValue();
    }

    public void line(long id, long product, int expected, int version, int counted) {
        jdbc.update(
                "INSERT INTO stocktake_items(stocktake_id,product_id,expected_quantity,expected_version,counted_quantity) VALUES (?,?,?,?,?)",
                id,
                product,
                expected,
                version,
                counted);
    }

    public StocktakeDto detail(long id, boolean lock) {
        var rows =
                jdbc.query(
                        "SELECT * FROM stocktakes WHERE id=?" + (lock ? " FOR UPDATE" : ""),
                        (r, n) ->
                                new StocktakeDto(
                                        r.getLong("id"),
                                        r.getLong("warehouse_id"),
                                        r.getString("status"),
                                        r.getString("reason"),
                                        r.getLong("created_by"),
                                        r.getObject("confirmed_by", Long.class),
                                        r.getTimestamp("created_at").toLocalDateTime(),
                                        r.getTimestamp("confirmed_at") == null
                                                ? null
                                                : r.getTimestamp("confirmed_at").toLocalDateTime(),
                                        jdbc.query(
                                                "SELECT * FROM stocktake_items WHERE stocktake_id=? ORDER BY product_id",
                                                (l, i) ->
                                                        new StocktakeDto.Line(
                                                                l.getLong("product_id"),
                                                                l.getInt("expected_quantity"),
                                                                l.getInt("counted_quantity"),
                                                                l.getInt("expected_version"),
                                                                l.getInt("counted_quantity")
                                                                        - l.getInt(
                                                                                "expected_quantity")),
                                                id)),
                        id);
        if (rows.isEmpty())
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.NOT_FOUND, "STOCKTAKE_NOT_FOUND");
        return rows.get(0);
    }

    public List<StocktakeDto> list() {
        return jdbc.query(
                "SELECT id FROM stocktakes ORDER BY id DESC LIMIT 100",
                (r, n) -> detail(r.getLong(1), false));
    }

    public void confirm(long id, long actor) {
        jdbc.update(
                "UPDATE stocktakes SET status='CONFIRMED',confirmed_by=?,confirmed_at=CURRENT_TIMESTAMP(6) WHERE id=?",
                actor,
                id);
    }

    public void cancel(long id) {
        jdbc.update("UPDATE stocktakes SET status='CANCELLED' WHERE id=?", id);
    }
}
