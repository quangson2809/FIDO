package com.fido.config.devseed;

import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

/** Demo Cart, Voucher and Order snapshots using the current Product-based target schema. */
@Component
@Profile({"dev", "test"})
public class DevSeedOrderData {
    private static final long CUSTOMER_ID = 900002L;
    private static final long PAYMENT_ACTOR_ID = 900001L;
    private static final long SHIPPING_FEE = 30_000L;

    private static final String SIZE_M_BLACK =
            "[{\"attribute_id\":940001,\"attribute_code_snapshot\":\"SIZE\",\"attribute_name_snapshot\":\"Kích thước\",\"data_type\":\"OPTION\",\"option_value_snapshot\":\"M\",\"option_label_snapshot\":\"M\"},"
                    + "{\"attribute_id\":940002,\"attribute_code_snapshot\":\"COLOR\",\"attribute_name_snapshot\":\"Màu sắc\",\"data_type\":\"OPTION\",\"option_value_snapshot\":\"BLACK\",\"option_label_snapshot\":\"Đen\"}]";
    private static final String SIZE_S_WHITE =
            "[{\"attribute_id\":940001,\"attribute_code_snapshot\":\"SIZE\",\"attribute_name_snapshot\":\"Kích thước\",\"data_type\":\"OPTION\",\"option_value_snapshot\":\"S\",\"option_label_snapshot\":\"S\"},"
                    + "{\"attribute_id\":940002,\"attribute_code_snapshot\":\"COLOR\",\"attribute_name_snapshot\":\"Màu sắc\",\"data_type\":\"OPTION\",\"option_value_snapshot\":\"WHITE\",\"option_label_snapshot\":\"Trắng\"}]";
    private static final String SIZE_L_BLUE =
            "[{\"attribute_id\":940001,\"attribute_code_snapshot\":\"SIZE\",\"attribute_name_snapshot\":\"Kích thước\",\"data_type\":\"OPTION\",\"option_value_snapshot\":\"L\",\"option_label_snapshot\":\"L\"},"
                    + "{\"attribute_id\":940002,\"attribute_code_snapshot\":\"COLOR\",\"attribute_name_snapshot\":\"Màu sắc\",\"data_type\":\"OPTION\",\"option_value_snapshot\":\"BLUE\",\"option_label_snapshot\":\"Xanh denim\"}]";

    private static final List<SeedOrder> ORDERS =
            List.of(
                    order(1001001, 1101001, 960001, "FIDO-TEE-001", "FIDO Essential Tee",
                            SIZE_M_BLACK, 2, 199000, "PENDING",
                            "2026-09-05 02:00:00", "PENDING", null, null,
                            "UNPAID", null, null, null),
                    order(1001002, 1101002, 960006, "FIDO-TEE-006", "FIDO Heavyweight Tee",
                            SIZE_S_WHITE, 1, 259000, "CONFIRMED",
                            "2026-09-08 02:00:00", "PENDING", null, null,
                            "UNPAID", null, null, null),
                    order(1001003, 1101003, 960004, "FIDO-DRESS-001", "FIDO Linen Midi Dress",
                            "{}", 1, 459000, "SHIPPING",
                            "2026-09-09 02:00:00", "SHIPPED", "2026-09-09 04:00:00", null,
                            "UNPAID", null, null, null),
                    order(1001004, 1101004, 960002, "FIDO-DENIM-001", "FIDO Denim Straight",
                            SIZE_L_BLUE, 1, 499000, "COMPLETED",
                            "2026-09-10 02:00:00", "DELIVERED", "2026-09-10 04:00:00", "2026-09-10 05:00:00",
                            "PAID", "2026-09-10 05:00:00", null, null),
                    order(1001005, 1101005, 960001, "FIDO-TEE-001", "FIDO Essential Tee",
                            SIZE_M_BLACK, 1, 199000, "DELIVERY_FAILED",
                            "2026-09-11 02:00:00", "FAILED", "2026-09-11 04:00:00", null,
                            "UNPAID", null, null, null),
                    order(1001006, 1101006, 960012, "FIDO-DRESS-012", "FIDO Shirt Dress",
                            "{}", 1, 529000, "COMPLETED",
                            "2026-09-12 02:00:00", "DELIVERED", "2026-09-14 06:00:00", "2026-09-14 07:00:00",
                            "PAID", "2026-09-14 07:00:00", null, null),
                    order(1001101, 1101007, 960007, "FIDO-SHIRT-001", "FIDO Oxford Shirt",
                            "{}", 2, 329000, "COMPLETED",
                            "2026-09-10 01:00:00", "DELIVERED", "2026-09-15 06:00:00", "2026-09-15 07:00:00",
                            "PAID", "2026-09-15 07:00:00", null, null),
                    order(1001102, 1101008, 960004, "FIDO-DRESS-001", "FIDO Linen Midi Dress",
                            "{}", 1, 459000, "RETURNED",
                            "2026-09-11 01:00:00", "DELIVERED", "2026-09-12 06:00:00", "2026-09-12 07:00:00",
                            "REFUNDED", "2026-09-12 07:00:00", "2026-09-13 08:00:00",
                            "Seed demo whole-order COD refund"),
                    order(1001103, 1101009, 960001, "FIDO-TEE-001", "FIDO Essential Tee",
                            SIZE_M_BLACK, 1, 199000, "CANCELLED",
                            "2026-09-26 02:00:00", "CANCELLED", null, null,
                            "UNPAID", null, null, null));

    private final JdbcTemplate jdbc;

    public DevSeedOrderData(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
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
                INSERT INTO cart_items(id,cart_id,product_id,quantity,added_at,updated_at) VALUES
                (981001,980001,960001,1,'2026-09-05 00:00:00','2026-09-05 00:00:00'),
                (981002,980002,960006,1,'2026-09-05 00:00:00','2026-09-05 00:00:00')
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
            long subtotal = Math.multiplyExact(order.unitPrice(), (long) order.quantity());
            long total = Math.addExact(subtotal, SHIPPING_FEE);

            jdbc.update(
                    """
                    INSERT INTO orders(
                        id,account_id,voucher_id,order_number,idempotency_key,request_fingerprint,
                        status,subtotal,discount_amount,shipping_fee,total_amount,currency,
                        placed_at,created_at,updated_at
                    ) VALUES (?,?,NULL,?,?,?,?,?,0,?,?,'VND',?,?,?)
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
                    order.placedAt(),
                    order.placedAt(),
                    order.placedAt());

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
                    order.skuSnapshot(),
                    order.productName(),
                    order.attributeSnapshot(),
                    imageSnapshot(order.productId()),
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
                        order_id,method,payment_status,amount,currency,collected_by_account_id,collected_at,
                        refund_amount,refunded_by_account_id,refunded_at,refund_reason,created_at,updated_at
                    ) VALUES (?,'COD',?,?,'VND',?,?,?,?,?,?,?,?)
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
                    order.placedAt(),
                    order.placedAt());

            jdbc.update(
                    """
                    INSERT INTO shipping_infos(
                        order_id,recipient_name,recipient_phone,carrier_name,tracking_number,
                        shipping_status,shipped_at,delivered_at,updated_at
                    ) VALUES (?,?,?,?,?,?,?,?,?)
                    """,
                    order.orderId(),
                    "Demo Customer",
                    "+84909000002",
                    order.shippedAt() == null ? null : "FIDO Local",
                    order.shippedAt() == null ? null : "DEV-" + order.orderId(),
                    order.shippingStatus(),
                    order.shippedAt(),
                    order.deliveredAt(),
                    order.deliveredAt() == null
                            ? (order.shippedAt() == null ? order.placedAt() : order.shippedAt())
                            : order.deliveredAt());
        }
    }

    private static String imageSnapshot(long productId) {
        return switch ((int) productId) {
            case 960001 -> "https://example.invalid/fido/tee-black-v1.jpg";
            case 960002 -> "https://example.invalid/fido/denim-blue-v1.jpg";
            case 960004 -> "https://example.invalid/fido/dress-midi-v1.jpg";
            case 960006 -> "https://example.invalid/fido/tee-heavyweight-v1.jpg";
            case 960007 -> "https://example.invalid/fido/oxford-shirt-v1.jpg";
            case 960012 -> "https://example.invalid/fido/shirt-dress-v1.jpg";
            default -> "https://example.invalid/fido/seed-product-v1.jpg";
        };
    }

    private static String fingerprint(long orderId) {
        try {
            byte[] digest =
                    MessageDigest.getInstance("SHA-256")
                            .digest(("fido-dev-seed-order:" + orderId).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is required by the Java runtime", exception);
        }
    }

    private static SeedOrder order(
            long orderId,
            long orderItemId,
            long productId,
            String sku,
            String productName,
            String attributeSnapshot,
            int quantity,
            long unitPrice,
            String orderStatus,
            String placedAt,
            String shippingStatus,
            String shippedAt,
            String deliveredAt,
            String paymentStatus,
            String collectedAt,
            String refundedAt,
            String refundReason) {
        return new SeedOrder(
                orderId, orderItemId, productId, sku, productName, attributeSnapshot, quantity,
                unitPrice, orderStatus, placedAt,
                shippingStatus, shippedAt, deliveredAt, paymentStatus, collectedAt, refundedAt, refundReason);
    }

    private record SeedOrder(
            long orderId,
            long orderItemId,
            long productId,
            String skuSnapshot,
            String productName,
            String attributeSnapshot,
            int quantity,
            long unitPrice,
            String orderStatus,
            String placedAt,
            String shippingStatus,
            String shippedAt,
            String deliveredAt,
            String paymentStatus,
            String collectedAt,
            String refundedAt,
            String refundReason) {}
}
