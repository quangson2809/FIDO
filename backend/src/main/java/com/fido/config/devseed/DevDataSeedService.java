package com.fido.config.devseed;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Profile({"dev", "test"})
public class DevDataSeedService {

    public static final String DEFAULT_PASSWORD = "Fido@123";

    private static final Logger log =
            LoggerFactory.getLogger(DevDataSeedService.class);

    private static final List<SeedProbe> SEED_PROBES = List.of(
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
            probe("orders", "order_id BETWEEN 1001001 AND 1001103", 9),
            probe("order_items", "order_item_id BETWEEN 1101001 AND 1101103", 9),
            probe("payments", "order_id BETWEEN 1001001 AND 1001103", 9),
            probe("shipping_infos", "order_id BETWEEN 1001001 AND 1001102", 7),
            probe("suppliers", "supplier_id BETWEEN 1020001 AND 1020002", 2),
            probe("goods_receipts", "receipt_id BETWEEN 1010001 AND 1010003", 3),
            probe("goods_receipt_items", "receipt_item_id BETWEEN 1030001 AND 1030003", 3),
            probe("inventories", "variant_id BETWEEN 970001 AND 970005", 5),
            probe(
                    "inventory_transactions",
                    "txn_id IN (1040001,1040002,1040003,1040004,1040005,"
                            + "1040010,1040011,1040012,1040013,1040014,1040015,1040016)",
                    12
            ),
            probe("audit_logs", "audit_id BETWEEN 1050001 AND 1050003", 3),
            probe("content_pages", "page_id BETWEEN 1060001 AND 1060003", 3)
    );

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwords;

    public DevDataSeedService(
            JdbcTemplate jdbc,
            PasswordEncoder passwords
    ) {
        this.jdbc = jdbc;
        this.passwords = passwords;
    }

    @Transactional
    public void seed() {
        SeedState initial = inspectSeedState();

        if (initial.complete()) {
            log.info("FIDO development seed is already complete; skipping");
            return;
        }

        if (initial.anyPresent()) {
            throw new IllegalStateException(
                    "Partial FIDO development seed detected. "
                            + "Refusing to overwrite existing local data. "
                            + initial.mismatchSummary()
            );
        }

        String passwordHash = passwords.encode(DEFAULT_PASSWORD);

        seedAccessControl();
        seedAccounts(passwordHash);
        seedCatalog();
        seedCartAndPromotion();
        seedOrders();
        seedReceivingAndInventoryLedger();
        seedOperations();

        SeedState finalState = inspectSeedState();

        if (!finalState.complete()) {
            throw new IllegalStateException(
                    "Development seed finished with incomplete data. "
                            + finalState.mismatchSummary()
            );
        }

        log.info(
                "FIDO development seed created: 28 baseline tables, "
                        + "8 accounts, password={}",
                DEFAULT_PASSWORD
        );
    }

    private void seedAccessControl() {
        jdbc.update("""
                INSERT INTO permissions(permission_id, code, name) VALUES
                (900201,'CATALOG_READ','Đọc catalog quản trị'),
                (900202,'CATALOG_WRITE','Ghi catalog quản trị'),
                (900203,'INVENTORY_READ','Đọc tồn kho và phiếu nhập'),
                (900204,'INVENTORY_WRITE','Ghi tồn kho và phiếu nhập'),
                (900205,'ORDER_READ','Đọc đơn hàng quản trị'),
                (900206,'ORDER_EDIT','Cập nhật thông tin đơn'),
                (900207,'ORDER_PROCESS','Xác nhận và chuẩn bị đơn'),
                (900208,'ORDER_FULFILLMENT','Xuất/giao/hoàn tất đơn'),
                (900209,'ORDER_EXCEPTION','Hủy/giao thất bại/hàng giao quay lại'),
                (900210,'ORDER_PAYMENT','Thu COD và hoàn tiền'),
                (900211,'ORDER_AFTER_SALES','Xử lý sau bán'),
                (900212,'AUDIT_READ','Đọc audit log'),
                (900213,'CONTENT_READ','Đọc nội dung quản trị'),
                (900214,'CONTENT_WRITE','Ghi nội dung quản trị'),
                (900215,'CUSTOMER_READ','Đọc khách hàng back-office')
                """);

        jdbc.update("""
                INSERT INTO roles(role_id, code, name, description) VALUES
                (900101,'FIDO_SEED_CATALOG','Seed Catalog Staff',
                    'Role kỹ thuật phục vụ Postman - Catalog'),
                (900102,'FIDO_SEED_INVENTORY','Seed Inventory Staff',
                    'Role kỹ thuật phục vụ Postman - Inventory'),
                (900103,'FIDO_SEED_ORDER','Seed Order Staff',
                    'Role kỹ thuật phục vụ Postman - Order/COD/After-sales'),
                (900104,'FIDO_SEED_OPS','Seed Ops Staff',
                    'Role kỹ thuật phục vụ Postman - Audit/Content/Customer')
                """);

        jdbc.update("""
                INSERT INTO role_permissions(role_id, permission_id) VALUES
                (900101,900201),(900101,900202),
                (900102,900203),(900102,900204),
                (900103,900205),(900103,900206),(900103,900207),
                (900103,900208),(900103,900209),(900103,900210),(900103,900211),
                (900104,900212),(900104,900213),(900104,900214),(900104,900215)
                """);
    }

    private void seedAccounts(String passwordHash) {
        jdbc.update("""
                INSERT INTO accounts(
                    account_id,password_hash,phone,email,created_at,updated_at
                ) VALUES
                (900001,?,'0909000001','superadmin@fido.local',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900002,?,'0909000002','customer@fido.local',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900003,?,'0909000003','catalog@fido.local',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900004,?,'0909000004','inventory@fido.local',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900005,?,'0909000005','order@fido.local',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900006,?,'0909000006','ops@fido.local',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900007,?,'0909000007','admin.noperm@fido.local',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900008,?,'0909000008','customer2@fido.local',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00')
                """,
                passwordHash,
                passwordHash,
                passwordHash,
                passwordHash,
                passwordHash,
                passwordHash,
                passwordHash,
                passwordHash
        );

        jdbc.update("""
                INSERT INTO addresses(
                    address_id,account_id,address_text,created_at
                ) VALUES
                (910001,900002,'123 Cầu Giấy, Hà Nội','2026-09-01 00:00:00'),
                (910002,900002,'45 Xuân Thủy, Cầu Giấy, Hà Nội','2026-09-01 00:00:00'),
                (910003,900008,'88 Hồ Tùng Mậu, Hà Nội','2026-09-01 00:00:00')
                """);

        assignSystemRole(900001L, "SUPERADMIN");

        assignSystemRole(900003L, "ADMIN");
        assignSeedRole(900003L, 900101L);

        assignSystemRole(900004L, "ADMIN");
        assignSeedRole(900004L, 900102L);

        assignSystemRole(900005L, "ADMIN");
        assignSeedRole(900005L, 900103L);

        assignSystemRole(900006L, "ADMIN");
        assignSeedRole(900006L, 900104L);

        assignSystemRole(900007L, "ADMIN");
    }

    private void seedCatalog() {
        jdbc.update("""
                INSERT INTO categories(category_id,parent_category_id,name) VALUES
                (920001,NULL,'Thời trang'),
                (920002,920001,'Áo'),
                (920003,920002,'Áo thun'),
                (920004,920001,'Quần'),
                (920005,920004,'Quần Jeans')
                """);

        jdbc.update("""
                INSERT INTO brands(brand_id,name) VALUES
                (930001,'FIDO Basics'),
                (930002,'FIDO Denim')
                """);

        jdbc.update("""
                INSERT INTO size_systems(size_system_id,code,name) VALUES
                (940001,'CLOTHING_ALPHA','Alpha S/M/L'),
                (940002,'DENIM_WAIST','Denim waist')
                """);

        jdbc.update("""
                INSERT INTO size_values(
                    size_value_id,size_system_id,code,display_name,sort_order
                ) VALUES
                (941001,940001,'S','Small',1),
                (941002,940001,'M','Medium',2),
                (941003,940001,'L','Large',3),
                (941004,940002,'28','Waist 28',1),
                (941005,940002,'30','Waist 30',2),
                (941006,940002,'32','Waist 32',3)
                """);

        jdbc.update("""
                INSERT INTO colors(color_id,code,name) VALUES
                (950001,'BLACK','Đen'),
                (950002,'WHITE','Trắng'),
                (950003,'NAVY','Xanh navy'),
                (950004,'BLUE','Xanh denim')
                """);

        jdbc.update("""
                INSERT INTO products(
                    product_id,category_id,brand_id,size_system_id,name,description,
                    gender,season,style,material_care,base_price,sale_status,
                    created_at,updated_at
                ) VALUES
                (960001,920003,930001,940001,'FIDO Essential Tee',
                    'Áo thun cotton cơ bản','UNISEX','ALL_SEASON','BASIC',
                    'Cotton; giặt nhẹ.',199000.00,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960002,920005,930002,940002,'FIDO Denim Straight',
                    'Quần jeans straight fit','UNISEX','ALL_SEASON','DENIM',
                    'Giặt mặt trái.',499000.00,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960003,920003,930001,940001,'FIDO Archive Tee',
                    'Sản phẩm ngừng bán','UNISEX','ALL_SEASON','BASIC',
                    NULL,179000.00,'STOPPED',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00')
                """);

        jdbc.update("""
                INSERT INTO product_images(
                    image_id,product_id,image_url,alt_text
                ) VALUES
                (961001,960001,'https://example.com/fido/tee-black.jpg',
                    'FIDO Essential Tee'),
                (961002,960002,'https://example.com/fido/denim-blue.jpg',
                    'FIDO Denim Straight'),
                (961003,960003,'https://example.com/fido/archive.jpg',
                    'FIDO Archive Tee')
                """);

        jdbc.update("""
                INSERT INTO product_variants(
                    variant_id,product_id,size_value_id,color_id,sku,override_price,
                    sale_status,created_at,updated_at
                ) VALUES
                (970001,960001,941002,950001,'TEE-M-BLK',NULL,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (970002,960001,941003,950002,'TEE-L-WHT',219000.00,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (970003,960002,941005,950004,'DENIM-30-BLU',529000.00,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (970004,960002,941006,950003,'DENIM-32-NVY',NULL,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (970005,960003,941002,950001,'ARCHIVE-M-BLK',NULL,'STOPPED',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00')
                """);

        jdbc.update("""
                INSERT INTO inventories(
                    variant_id,available_quantity,updated_at
                ) VALUES
                (970001,69,'2026-09-20 03:00:00'),
                (970002,25,'2026-09-20 03:00:00'),
                (970003,23,'2026-09-20 03:00:00'),
                (970004,14,'2026-09-20 03:00:00'),
                (970005,0,'2026-09-20 03:00:00')
                """);
    }

    private void seedCartAndPromotion() {
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

    private void seedReceivingAndInventoryLedger() {
        jdbc.update("""
                INSERT INTO suppliers(
                    supplier_id,name,phone,email,address,usage_status,note
                ) VALUES
                (1020001,'Nhà cung cấp Seed Hà Nội','02439999999',
                    'supplier@fido.local','Hà Nội','ACTIVE','Seed Postman'),
                (1020002,'Nhà cung cấp Ngừng dùng',NULL,NULL,
                    'Hà Nội','INACTIVE','Dùng để test filter')
                """);

        jdbc.update("""
                INSERT INTO goods_receipts(
                    receipt_id,receipt_code,supplier_id,receipt_status,receipt_date,
                    created_by_account_id,confirmed_by_account_id,confirmed_at,
                    note,created_at,updated_at
                ) VALUES
                (1010001,'SEED-GR-DRAFT',1020001,'DRAFT','2026-09-20',
                    900004,NULL,NULL,'Phiếu nhập để test Postman',
                    '2026-09-20 01:00:00','2026-09-20 01:00:00'),
                (1010002,'SEED-GR-CONFIRMED',1020001,'CONFIRMED','2026-09-18',
                    900004,900004,'2026-09-18 03:00:00','Phiếu đã xác nhận',
                    '2026-09-18 01:00:00','2026-09-18 03:00:00'),
                (1010003,'SEED-GR-CANCELLED',1020001,'CANCELLED','2026-09-19',
                    900004,NULL,NULL,'Phiếu đã hủy',
                    '2026-09-19 01:00:00','2026-09-19 02:00:00')
                """);

        jdbc.update("""
                INSERT INTO goods_receipt_items(
                    receipt_item_id,receipt_id,variant_id,quantity
                ) VALUES
                (1030001,1010001,970003,10),
                (1030002,1010002,970001,20),
                (1030003,1010003,970004,5)
                """);

        jdbc.update("""
                INSERT INTO inventory_transactions(
                    txn_id,variant_id,quantity_delta,transaction_type,order_id,
                    goods_receipt_id,actor_account_id,reason,created_at
                ) VALUES
                (1040001,970001,50,'ADJUSTMENT_IN',NULL,NULL,900004,
                    'Seed opening stock','2026-09-01 01:00:00'),
                (1040002,970002,30,'ADJUSTMENT_IN',NULL,NULL,900004,
                    'Seed opening stock','2026-09-01 01:00:00'),
                (1040003,970003,25,'ADJUSTMENT_IN',NULL,NULL,900004,
                    'Seed opening stock','2026-09-01 01:00:00'),
                (1040004,970004,15,'ADJUSTMENT_IN',NULL,NULL,900004,
                    'Seed opening stock','2026-09-01 01:00:00'),
                (1040005,970001,20,'RECEIPT_IN',NULL,1010002,900004,
                    NULL,'2026-09-18 03:00:00'),
                (1040010,970002,-1,'ORDER_CONFIRM_OUT',1001002,NULL,900005,
                    'Seed confirmed order','2026-09-08 02:10:00'),
                (1040011,970003,-1,'ORDER_CONFIRM_OUT',1001003,NULL,900005,
                    'Seed shipping order','2026-09-09 02:10:00'),
                (1040012,970004,-1,'ORDER_CONFIRM_OUT',1001004,NULL,900005,
                    'Seed shipping paid order','2026-09-10 02:10:00'),
                (1040013,970001,-1,'ORDER_CONFIRM_OUT',1001005,NULL,900005,
                    'Seed delivery failed order','2026-09-11 02:10:00'),
                (1040014,970002,-2,'ORDER_CONFIRM_OUT',1001006,NULL,900005,
                    'Seed completed order','2026-09-12 02:10:00'),
                (1040015,970002,-2,'ORDER_CONFIRM_OUT',1001101,NULL,900005,
                    'Seed report completed','2026-09-10 01:10:00'),
                (1040016,970003,-1,'ORDER_CONFIRM_OUT',1001102,NULL,900005,
                    'Seed report returned','2026-09-11 01:10:00')
                """);
    }

    private void seedOperations() {
        jdbc.update("""
                INSERT INTO audit_logs(
                    audit_id,actor_account_id,action,target_type,target_id,
                    description,created_at
                ) VALUES
                (1050001,900005,'ORDER_CONFIRM','ORDER','1001002',
                    'Seed audit order confirm','2026-09-08 02:10:00'),
                (1050002,900004,'GOODS_RECEIPT_CONFIRM','GOODS_RECEIPT','1010002',
                    'Seed audit receipt confirm','2026-09-18 03:00:00'),
                (1050003,900001,'CONTENT_UPDATE','CONTENT_PAGE','1060001',
                    'Seed audit content','2026-09-01 00:00:00')
                """);

        jdbc.update("""
                INSERT INTO content_pages(
                    page_id,page_code,title,content,updated_by_account_id,updated_at
                ) VALUES
                (1060001,'shipping-policy','Chính sách giao hàng',
                    'Nội dung seed cho chính sách giao hàng.',
                    900001,'2026-09-01 00:00:00'),
                (1060002,'return-policy','Chính sách đổi trả',
                    'Nội dung seed cho chính sách đổi trả.',
                    900001,'2026-09-01 00:00:00'),
                (1060003,'privacy-policy','Chính sách bảo mật',
                    'Nội dung seed cho chính sách bảo mật.',
                    900001,'2026-09-01 00:00:00')
                """);
    }

    private void assignSystemRole(
            long accountId,
            String roleCode
    ) {
        int inserted = jdbc.update("""
                INSERT INTO account_roles(account_id,role_id)
                SELECT ?, role_id
                FROM roles
                WHERE code=?
                """, accountId, roleCode);

        if (inserted != 1) {
            throw new IllegalStateException(
                    "Required system role is missing: " + roleCode
            );
        }
    }

    private void assignSeedRole(
            long accountId,
            long roleId
    ) {
        jdbc.update(
                "INSERT INTO account_roles(account_id,role_id) VALUES (?,?)",
                accountId,
                roleId
        );
    }

    private SeedState inspectSeedState() {
        List<ProbeResult> results = new ArrayList<>(SEED_PROBES.size());

        for (SeedProbe probe : SEED_PROBES) {
            Integer count = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM "
                            + probe.table()
                            + " WHERE "
                            + probe.predicate(),
                    Integer.class
            );

            results.add(
                    new ProbeResult(
                            probe,
                            count == null ? 0 : count
                    )
            );
        }

        return new SeedState(results);
    }

    private static SeedProbe probe(
            String table,
            String predicate,
            int expected
    ) {
        return new SeedProbe(
                table,
                predicate,
                expected
        );
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

    private record SeedState(
            List<ProbeResult> results
    ) {
        boolean complete() {
            return results.stream().allMatch(ProbeResult::matches);
        }

        boolean anyPresent() {
            return results.stream().anyMatch(result -> result.actual() > 0);
        }

        String mismatchSummary() {
            return results.stream()
                    .filter(result -> !result.matches())
                    .map(result ->
                            result.probe().table()
                                    + "="
                                    + result.actual()
                                    + "/"
                                    + result.probe().expected()
                    )
                    .collect(Collectors.joining(", "));
        }
    }
}
