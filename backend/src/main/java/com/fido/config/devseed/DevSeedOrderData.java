package com.fido.config.devseed;

import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Profile({"dev", "test"})
public class DevSeedOrderData {

    private final JdbcTemplate jdbc;

    public DevSeedOrderData(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void seed() {
        seedCarts();
        seedVoucher();
        seedOrders();
        seedOrderItems();
        seedPayments();
        seedShipping();
    }

    private void seedCarts() {
        jdbc.update("""
                INSERT INTO carts(
                    cart_id,account_id,created_at,updated_at
                ) VALUES
                (980001,900002,'2026-09-05 00:00:00','2026-09-05 00:00:00'),
                (980002,900008,'2026-09-05 00:00:00','2026-09-05 00:00:00')
                """);

        jdbc.update("""
                INSERT INTO cart_items(
                    cart_item_id,cart_id,variant_id,quantity
                ) VALUES
                (981001,980001,970001,1),
                (981002,980001,970002,1)
                """);
    }

    private void seedVoucher() {
        // Baseline Voucher has only voucher_id/code. Discount rules remain TBD.
        jdbc.update("""
                INSERT INTO vouchers(voucher_id,code) VALUES
                (990001,'WELCOME10')
                """);
    }

    private void seedOrders() {
        jdbc.update("""
                INSERT INTO orders(
                    order_id,order_code,customer_account_id,recipient_phone,
                    recipient_email,recipient_address,subtotal_snapshot,
                    discount_snapshot,shipping_fee_snapshot,total_snapshot,
                    voucher_id,order_status,customer_service_note,cancel_reason,
                    completed_at,returned_at,created_at,updated_at
                ) VALUES
                (1001001,'SEED-ORD-PENDING',900002,'0909000002',
                    'customer@fido.local','123 Cầu Giấy, Hà Nội',
                    398000.00,0.00,30000.00,428000.00,NULL,'PENDING',
                    NULL,NULL,NULL,NULL,
                    '2026-09-05 02:00:00','2026-09-05 02:00:00'),
                (1001002,'SEED-ORD-CONFIRMED',900002,'0909000002',
                    'customer@fido.local','123 Cầu Giấy, Hà Nội',
                    219000.00,0.00,30000.00,249000.00,NULL,'CONFIRMED',
                    NULL,NULL,NULL,NULL,
                    '2026-09-08 02:00:00','2026-09-08 02:10:00'),
                (1001003,'SEED-ORD-SHIP-UNPAID',900002,'0909000002',
                    'customer@fido.local','123 Cầu Giấy, Hà Nội',
                    529000.00,0.00,30000.00,559000.00,NULL,'SHIPPING',
                    NULL,NULL,NULL,NULL,
                    '2026-09-09 02:00:00','2026-09-09 04:00:00'),
                (1001004,'SEED-ORD-SHIP-PAID',900002,'0909000002',
                    'customer@fido.local','123 Cầu Giấy, Hà Nội',
                    499000.00,0.00,30000.00,529000.00,NULL,'SHIPPING',
                    NULL,NULL,NULL,NULL,
                    '2026-09-10 02:00:00','2026-09-10 05:00:00'),
                (1001005,'SEED-ORD-DELIVERY-FAILED',900002,'0909000002',
                    'customer@fido.local','123 Cầu Giấy, Hà Nội',
                    199000.00,0.00,30000.00,229000.00,NULL,'DELIVERY_FAILED',
                    NULL,NULL,NULL,NULL,
                    '2026-09-11 02:00:00','2026-09-11 06:00:00'),
                (1001006,'SEED-ORD-COMPLETED-RETURN',900002,'0909000002',
                    'customer@fido.local','123 Cầu Giấy, Hà Nội',
                    438000.00,0.00,30000.00,468000.00,NULL,'COMPLETED',
                    NULL,NULL,'2026-09-14 07:00:00',NULL,
                    '2026-09-12 02:00:00','2026-09-14 07:00:00'),
                (1001101,'SEED-REPORT-COMPLETED',900002,'0909000002',
                    'customer@fido.local','123 Cầu Giấy, Hà Nội',
                    438000.00,0.00,30000.00,468000.00,NULL,'COMPLETED',
                    NULL,NULL,'2026-09-15 07:00:00',NULL,
                    '2026-09-10 01:00:00','2026-09-15 07:00:00'),
                (1001102,'SEED-REPORT-RETURNED',900002,'0909000002',
                    'customer@fido.local','123 Cầu Giấy, Hà Nội',
                    529000.00,0.00,30000.00,559000.00,NULL,'RETURNED',
                    NULL,NULL,'2026-09-12 07:00:00','2026-09-25 08:00:00',
                    '2026-09-11 01:00:00','2026-09-25 08:00:00'),
                (1001103,'SEED-REPORT-CANCELLED',900002,'0909000002',
                    'customer@fido.local','123 Cầu Giấy, Hà Nội',
                    199000.00,0.00,30000.00,229000.00,NULL,'CANCELLED',
                    NULL,'Khách hủy trước xác nhận',NULL,NULL,
                    '2026-09-26 02:00:00','2026-09-26 02:10:00')
                """);
    }

    private void seedOrderItems() {
        jdbc.update("""
                INSERT INTO order_items(
                    order_item_id,order_id,variant_id,product_name_snapshot,
                    sku_snapshot,size_snapshot,color_snapshot,unit_price_snapshot,
                    quantity,line_total_snapshot
                ) VALUES
                (1101001,1001001,970001,'FIDO Essential Tee','TEE-M-BLK',
                    'M','Đen',199000.00,2,398000.00),
                (1101002,1001002,970002,'FIDO Essential Tee','TEE-L-WHT',
                    'L','Trắng',219000.00,1,219000.00),
                (1101003,1001003,970003,'FIDO Denim Straight','DENIM-30-BLU',
                    '30','Xanh denim',529000.00,1,529000.00),
                (1101004,1001004,970004,'FIDO Denim Straight','DENIM-32-NVY',
                    '32','Xanh navy',499000.00,1,499000.00),
                (1101005,1001005,970001,'FIDO Essential Tee','TEE-M-BLK',
                    'M','Đen',199000.00,1,199000.00),
                (1101006,1001006,970002,'FIDO Essential Tee','TEE-L-WHT',
                    'L','Trắng',219000.00,2,438000.00),
                (1101101,1001101,970002,'FIDO Essential Tee','TEE-L-WHT',
                    'L','Trắng',219000.00,2,438000.00),
                (1101102,1001102,970003,'FIDO Denim Straight','DENIM-30-BLU',
                    '30','Xanh denim',529000.00,1,529000.00),
                (1101103,1001103,970001,'FIDO Essential Tee','TEE-M-BLK',
                    'M','Đen',199000.00,1,199000.00)
                """);
    }

    private void seedPayments() {
        jdbc.update("""
                INSERT INTO payments(
                    order_id,payment_status,amount_due,amount_received,
                    amount_refunded,collected_by_account_id,collected_at,
                    refunded_by_account_id,refunded_at
                ) VALUES
                (1001001,'UNPAID',428000.00,0.00,0.00,NULL,NULL,NULL,NULL),
                (1001002,'UNPAID',249000.00,0.00,0.00,NULL,NULL,NULL,NULL),
                (1001003,'UNPAID',559000.00,0.00,0.00,NULL,NULL,NULL,NULL),
                (1001004,'PAID',529000.00,529000.00,0.00,
                    900005,'2026-09-10 05:00:00',NULL,NULL),
                (1001005,'UNPAID',229000.00,0.00,0.00,NULL,NULL,NULL,NULL),
                (1001006,'PAID',468000.00,468000.00,0.00,
                    900005,'2026-09-14 06:30:00',NULL,NULL),
                (1001101,'PAID',468000.00,468000.00,0.00,
                    900005,'2026-09-15 06:30:00',NULL,NULL),
                (1001102,'REFUNDED',559000.00,559000.00,559000.00,
                    900005,'2026-09-12 06:30:00',
                    900005,'2026-09-25 08:00:00'),
                (1001103,'UNPAID',229000.00,0.00,0.00,NULL,NULL,NULL,NULL)
                """);
    }

    private void seedShipping() {
        jdbc.update("""
                INSERT INTO shipping_infos(
                    order_id,delivery_mode,carrier_name
                ) VALUES
                (1001002,'INTERNAL','FIDO Local'),
                (1001003,'EXTERNAL','Seed Carrier'),
                (1001004,'INTERNAL','FIDO Local'),
                (1001005,'EXTERNAL','Seed Carrier'),
                (1001006,'INTERNAL','FIDO Local'),
                (1001101,'INTERNAL','FIDO Local'),
                (1001102,'EXTERNAL','Seed Carrier')
                """);
    }
}
