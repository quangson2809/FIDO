package com.fido.config.devseed;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Profile({"dev", "test"})
public class DevSeedStateInspector {

    private static final List<SeedProbe> PROBES = List.of(
            probe("accounts", "account_id BETWEEN 900001 AND 900008", 8),
            probe("addresses", "address_id BETWEEN 910001 AND 910003", 3),
            probe("roles", "role_id BETWEEN 900101 AND 900104", 4),
            probe("permissions", "permission_id BETWEEN 900201 AND 900215", 15),
            probe("account_roles", "account_id BETWEEN 900001 AND 900008", 10),
            probe("role_permissions", "role_id BETWEEN 900101 AND 900104", 15),
            probe("categories", "category_id BETWEEN 920001 AND 920005", 5),
            probe("brands", "brand_id BETWEEN 930001 AND 930002", 2),
            probe("size_systems", "size_system_id BETWEEN 940001 AND 940002", 2),
            probe("size_values", "size_value_id BETWEEN 941001 AND 941006", 6),
            probe("colors", "color_id BETWEEN 950001 AND 950004", 4),
            probe("products", "product_id BETWEEN 960001 AND 960003", 3),
            probe("product_images", "image_id BETWEEN 961001 AND 961003", 3),
            probe("product_variants", "variant_id BETWEEN 970001 AND 970005", 5),
            probe("carts", "cart_id BETWEEN 980001 AND 980002", 2),
            probe("cart_items", "cart_item_id BETWEEN 981001 AND 981002", 2),
            probe("vouchers", "voucher_id = 990001", 1),
            probe("orders", "order_id IN (1001001,1001002,1001003,1001004,1001005,"
                    + "1001006,1001101,1001102,1001103)", 9),
            probe("order_items", "order_item_id IN (1101001,1101002,1101003,1101004,"
                    + "1101005,1101006,1101101,1101102,1101103)", 9),
            probe("payments", "order_id IN (1001001,1001002,1001003,1001004,1001005,"
                    + "1001006,1001101,1001102,1001103)", 9),
            probe("shipping_infos", "order_id IN (1001002,1001003,1001004,1001005,"
                    + "1001006,1001101,1001102)", 7),
            probe("suppliers", "supplier_id BETWEEN 1020001 AND 1020002", 2),
            probe("goods_receipts", "receipt_id BETWEEN 1010001 AND 1010003", 3),
            probe("goods_receipt_items", "receipt_item_id BETWEEN 1030001 AND 1030003", 3),
            probe("inventories", "variant_id BETWEEN 970001 AND 970005", 5),
            probe("inventory_transactions",
                    "txn_id IN (1040001,1040002,1040003,1040004,1040005,"
                            + "1040010,1040011,1040012,1040013,1040014,1040015,1040016)",
                    12),
            probe("audit_logs", "audit_id BETWEEN 1050001 AND 1050003", 3),
            probe("content_pages", "page_id BETWEEN 1060001 AND 1060003", 3)
    );

    private final JdbcTemplate jdbc;

    public DevSeedStateInspector(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public SeedState inspect() {
        List<ProbeResult> results = new ArrayList<>(PROBES.size());

        for (SeedProbe probe : PROBES) {
            Integer count = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM "
                            + probe.table()
                            + " WHERE "
                            + probe.predicate(),
                    Integer.class
            );
            results.add(new ProbeResult(probe, count == null ? 0 : count));
        }

        return new SeedState(results);
    }

    private static SeedProbe probe(
            String table,
            String predicate,
            int expected
    ) {
        return new SeedProbe(table, predicate, expected);
    }

    private record SeedProbe(
            String table,
            String predicate,
            int expected
    ) {
    }

    private record ProbeResult(
            SeedProbe probe,
            int actual
    ) {
        boolean matches() {
            return actual == probe.expected();
        }
    }

    public record SeedState(
            List<ProbeResult> results
    ) {
        public boolean complete() {
            return results.stream().allMatch(ProbeResult::matches);
        }

        public boolean anyPresent() {
            return results.stream().anyMatch(result -> result.actual() > 0);
        }

        public String mismatchSummary() {
            return results.stream()
                    .filter(result -> !result.matches())
                    .map(result -> result.probe().table()
                            + "="
                            + result.actual()
                            + "/"
                            + result.probe().expected())
                    .collect(Collectors.joining(", "));
        }
    }
}
