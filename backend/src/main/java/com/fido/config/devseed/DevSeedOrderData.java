package com.fido.config.devseed;

import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

/** Tạo giỏ, voucher và snapshot đơn demo theo Product của schema hiện tại. */
@Component
@Profile({"dev", "test"})
public class DevSeedOrderData {
    private static final long CUSTOMER_ID = 900002L;
    private static final long PAYMENT_ACTOR_ID = 900001L;
    private static final long SHIPPING_FEE = 30_000L;

    private static final List<SeedOrder> ORDERS =
            List.of(
                    new SeedOrder(
                            1001001L,
                            1101001L,
                            960001L,
                            2,
                            199000L,
                            "PENDING",
                            "2026-09-05 02:00:00",
                            "PENDING",
                            null,
                            null,
                            "UNPAID",
                            null,
                            null,
                            null),
                    new SeedOrder(
                            1001002L,
                            1101002L,
                            960006L,
                            1,
                            259000L,
                            "CONFIRMED",
                            "2026-09-08 02:00:00",
                            "PENDING",
                            null,
                            null,
                            "UNPAID",
                            null,
                            null,
                            null),
                    new SeedOrder(
                            1001003L,
                            1101003L,
                            960004L,
                            1,
                            459000L,
                            "SHIPPING",
                            "2026-09-09 02:00:00",
                            "SHIPPED",
                            "2026-09-09 04:00:00",
                            null,
                            "UNPAID",
                            null,
                            null,
                            null),
                    new SeedOrder(
                            1001004L,
                            1101004L,
                            960002L,
                            1,
                            499000L,
                            "COMPLETED",
                            "2026-09-10 02:00:00",
                            "DELIVERED",
                            "2026-09-10 04:00:00",
                            "2026-09-10 05:00:00",
                            "PAID",
                            "2026-09-10 05:00:00",
                            null,
                            null),
                    new SeedOrder(
                            1001005L,
                            1101005L,
                            960001L,
                            1,
                            199000L,
                            "DELIVERY_FAILED",
                            "2026-09-11 02:00:00",
                            "FAILED",
                            "2026-09-11 04:00:00",
                            null,
                            "UNPAID",
                            null,
                            null,
                            null),
                    new SeedOrder(
                            1001006L,
                            1101006L,
                            960012L,
                            1,
                            529000L,
                            "COMPLETED",
                            "2026-09-12 02:00:00",
                            "DELIVERED",
                            "2026-09-14 06:00:00",
                            "2026-09-14 07:00:00",
                            "PAID",
                            "2026-09-14 07:00:00",
                            null,
                            null),
                    new SeedOrder(
                            1001101L,
                            1101007L,
                            960007L,
                            2,
                            329000L,
                            "COMPLETED",
                            "2026-09-10 01:00:00",
                            "DELIVERED",
                            "2026-09-15 06:00:00",
                            "2026-09-15 07:00:00",
                            "PAID",
                            "2026-09-15 07:00:00",
                            null,
                            null),
                    new SeedOrder(
                            1001102L,
                            1101008L,
                            960004L,
                            1,
                            459000L,
                            "RETURNED",
                            "2026-09-11 01:00:00",
                            "DELIVERED",
                            "2026-09-12 06:00:00",
                            "2026-09-12 07:00:00",
                            "REFUNDED",
                            "2026-09-12 07:00:00",
                            "2026-09-13 08:00:00",
                            "Hoàn COD toàn đơn mẫu"),
                    new SeedOrder(
                            1001103L,
                            1101009L,
                            960001L,
                            1,
                            199000L,
                            "CANCELLED",
                            "2026-09-26 02:00:00",
                            "CANCELLED",
                            null,
                            null,
                            "UNPAID",
                            null,
                            null,
                            null));

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public DevSeedOrderData(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public void seed() {
        seedCarts();
        seedVoucher();
        seedOrders();
    }

    private void seedCarts() {
        jdbc.update(
                """
                INSERT INTO carts(id,account_id,status,created_at,updated_at) VALUES
                (980001,900002,'OPEN','2026-09-05 00:00:00','2026-09-05 00:00:00'),
                (980002,900008,'OPEN','2026-09-05 00:00:00','2026-09-05 00:00:00')
                """);
        jdbc.update(
                """
                INSERT INTO cart_items(id,cart_id,product_id,quantity,updated_at) VALUES
                (981001,980001,960001,1,'2026-09-05 00:00:00'),
                (981002,980002,960006,1,'2026-09-05 00:00:00')
                """);
    }

    private void seedVoucher() {
        jdbc.update(
                """
                INSERT INTO vouchers(
                    id,code,discount_type,discount_value,minimum_order_value,maximum_discount,
                    starts_at,ends_at,usage_limit,usage_count,status
                ) VALUES (
                    990001,'WELCOME10','PERCENT',1000,0,50000,
                    '2026-01-01 00:00:00','2030-12-31 23:59:59',100,0,'ACTIVE'
                )
                """);
    }

    private void seedOrders() {
        for (SeedOrder order : ORDERS) {
            // Snapshot lấy từ SKU catalog vừa seed, tránh tên và Option cũ lệch bộ ảnh.
            var product =
                    jdbc.queryForMap("SELECT sku,name FROM products WHERE id=?", order.productId());
            var attributes =
                    jdbc.query(
                            """
                SELECT a.id, a.code, a.name, o.id AS option_id, o.`value`, o.label
                FROM product_attribute_values v
                JOIN attributes a ON a.id=v.attribute_id
                JOIN attribute_options o ON o.id=v.option_id AND o.attribute_id=a.id
                WHERE v.product_id=? ORDER BY a.sort_order,a.id
                """,
                            (rs, row) ->
                                    Map.of(
                                            "attribute_id", rs.getLong("id"),
                                            "attribute_code_snapshot", rs.getString("code"),
                                            "attribute_name_snapshot", rs.getString("name"),
                                            "option_id", rs.getLong("option_id"),
                                            "option_value_snapshot", rs.getString("value"),
                                            "option_label_snapshot", rs.getString("label")),
                            order.productId());
            long subtotal = Math.multiplyExact(order.unitPrice(), (long) order.quantity());
            long total = Math.addExact(subtotal, SHIPPING_FEE);

            jdbc.update(
                    """
                    INSERT INTO orders(
                        id,account_id,voucher_id,order_number,idempotency_key,request_fingerprint,status,subtotal,
                        discount_amount,shipping_fee,total_amount,created_at,updated_at
                    ) VALUES (?,?,NULL,?,?,?,?,?,0,?,?,?,?)
                    """,
                    order.orderId(),
                    CUSTOMER_ID,
                    "SEED-ORD-" + order.orderId(),
                    "dev-seed-order:" + order.orderId(),
                    fingerprint(order.orderId()),
                    order.orderStatus(),
                    subtotal,
                    SHIPPING_FEE,
                    total,
                    order.createdAt(),
                    order.createdAt());

            jdbc.update(
                    """
                    INSERT INTO order_items(
                        id,order_id,product_id,sku_snapshot,product_name_snapshot,attribute_snapshot,
                        image_url_snapshot,quantity,unit_price,discount_amount,line_total
                    ) VALUES (?,?,?,?,?,?,?,?,?,0,?)
                    """,
                    order.orderItemId(),
                    order.orderId(),
                    order.productId(),
                    product.get("sku"),
                    product.get("name"),
                    json.writeValueAsString(attributes),
                    "",
                    order.quantity(),
                    order.unitPrice(),
                    subtotal);

            jdbc.update(
                    """
                    INSERT INTO order_addresses(
                        order_id,recipient_name,recipient_phone,province,district,ward,address_line
                    ) VALUES (?,?,?,?,?,?,?)
                    """,
                    order.orderId(),
                    "Demo Customer",
                    "+84909000002",
                    "Hà Nội",
                    "Cầu Giấy",
                    "Dịch Vọng",
                    "123 Cầu Giấy");

            long refundAmount = "REFUNDED".equals(order.paymentStatus()) ? total : 0L;
            String collectedAt = order.collectedAt();
            String refundedAt = order.refundedAt();

            jdbc.update(
                    """
                    INSERT INTO payments(
                        order_id,payment_status,amount,collected_by_account_id,collected_at,refund_amount,
                        refunded_by_account_id,refunded_at,refund_reason,created_at,updated_at
                    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
                    """,
                    order.orderId(),
                    order.paymentStatus(),
                    total,
                    collectedAt == null ? null : PAYMENT_ACTOR_ID,
                    collectedAt,
                    refundAmount,
                    refundedAt == null ? null : PAYMENT_ACTOR_ID,
                    refundedAt,
                    order.refundReason(),
                    order.createdAt(),
                    order.createdAt());

            jdbc.update(
                    """
                    INSERT INTO shipping_infos(
                        order_id,carrier_name,tracking_number,shipping_status,shipped_at,delivered_at,updated_at
                    ) VALUES (?,?,?,?,?,?,?)
                    """,
                    order.orderId(),
                    order.shippedAt() == null ? null : "FIDO Local",
                    order.shippedAt() == null ? null : "DEV-" + order.orderId(),
                    order.shippingStatus(),
                    order.shippedAt(),
                    order.deliveredAt(),
                    order.deliveredAt() == null
                            ? (order.shippedAt() == null ? order.createdAt() : order.shippedAt())
                            : order.deliveredAt());
        }
    }

    private static String fingerprint(long orderId) {
        try {
            byte[] digest =
                    MessageDigest.getInstance("SHA-256")
                            .digest(
                                    ("fido-dev-seed-order:" + orderId)
                                            .getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is required by the Java runtime", exception);
        }
    }

    private record SeedOrder(
            long orderId,
            long orderItemId,
            long productId,
            int quantity,
            long unitPrice,
            String orderStatus,
            String createdAt,
            String shippingStatus,
            String shippedAt,
            String deliveredAt,
            String paymentStatus,
            String collectedAt,
            String refundedAt,
            String refundReason) {}
}
