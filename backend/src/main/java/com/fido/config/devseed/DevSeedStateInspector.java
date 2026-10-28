package com.fido.config.devseed;

import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Detects whether the known demo dataset is absent, complete or partially present.
 * Flyway-owned system roles, permissions and attribute types are intentionally excluded.
 */
@Component
@Profile({"dev", "test"})
public class DevSeedStateInspector {

    private static final List<SeedProbe> PROBES =
            List.of(
                    probe("accounts", "id BETWEEN 900001 AND 900008", 8),
                    probe("addresses", "id BETWEEN 910001 AND 910003", 3),
                    probe("account_roles", "account_id BETWEEN 900001 AND 900008", 8),
                    probe("categories", "id BETWEEN 920001 AND 920008", 8),
                    probe("brands", "id BETWEEN 930001 AND 930002", 2),
                    probe("attributes", "id BETWEEN 940001 AND 940002", 2),
                    probe("attribute_options", "id BETWEEN 941001 AND 941007", 7),
                    probe(
                            "product_attribute_values",
                            "product_id IN (960001,960002,960006)",
                            6),
                    probe("products", "id BETWEEN 960001 AND 960017", 17),
                    probe("product_images", "id BETWEEN 961001 AND 961017", 17),
                    probe("carts", "id BETWEEN 980001 AND 980002", 2),
                    probe("cart_items", "id BETWEEN 981001 AND 981002", 2),
                    probe("vouchers", "id = 990001", 1),
                    probe(
                            "orders",
                            "id IN (1001001,1001002,1001003,1001004,1001005,"
                                    + "1001006,1001101,1001102,1001103)",
                            9),
                    probe(
                            "order_items",
                            "id BETWEEN 1101001 AND 1101009",
                            9),
                    probe(
                            "order_addresses",
                            "order_id IN (1001001,1001002,1001003,1001004,1001005,"
                                    + "1001006,1001101,1001102,1001103)",
                            9),
                    probe(
                            "payments",
                            "order_id IN (1001001,1001002,1001003,1001004,1001005,"
                                    + "1001006,1001101,1001102,1001103)",
                            9),
                    probe(
                            "shipping_infos",
                            "order_id IN (1001001,1001002,1001003,1001004,1001005,"
                                    + "1001006,1001101,1001102,1001103)",
                            9),
                    probe("suppliers", "id BETWEEN 1020001 AND 1020002", 2),
                    probe("warehouses", "id = 1021001", 1),
                    probe("goods_receipts", "id BETWEEN 1010001 AND 1010003", 3),
                    probe("goods_receipt_items", "id BETWEEN 1030001 AND 1030003", 3),
                    probe(
                            "inventories",
                            "warehouse_id = 1021001 AND product_id BETWEEN 960001 AND 960017",
                            17),
                    probe("inventory_transactions", "id BETWEEN 1040001 AND 1040025", 25),
                    probe("audit_logs", "id BETWEEN 1050001 AND 1050003", 3),
                    probe("content_pages", "id BETWEEN 1060001 AND 1060003", 3));

    private final JdbcTemplate jdbc;

    public DevSeedStateInspector(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public SeedState inspect() {
        List<ProbeResult> results = new ArrayList<>(PROBES.size());
        for (SeedProbe probe : PROBES) {
            Integer count =
                    jdbc.queryForObject(
                            "SELECT COUNT(*) FROM " + probe.table() + " WHERE " + probe.predicate(),
                            Integer.class);
            results.add(new ProbeResult(probe, count == null ? 0 : count));
        }
        return new SeedState(results);
    }

    private static SeedProbe probe(String table, String predicate, int expected) {
        return new SeedProbe(table, predicate, expected);
    }

    private record SeedProbe(String table, String predicate, int expected) {}

    private record ProbeResult(SeedProbe probe, int actual) {
        boolean matches() {
            return actual == probe.expected();
        }
    }

    public record SeedState(List<ProbeResult> results) {
        public boolean complete() {
            return results.stream().allMatch(ProbeResult::matches);
        }

        public boolean anyPresent() {
            return results.stream().anyMatch(result -> result.actual() > 0);
        }

        public String mismatchSummary() {
            return results.stream()
                    .filter(result -> !result.matches())
                    .map(
                            result ->
                                    result.probe().table()
                                            + "="
                                            + result.actual()
                                            + "/"
                                            + result.probe().expected())
                    .collect(Collectors.joining(", "));
        }
    }
}
