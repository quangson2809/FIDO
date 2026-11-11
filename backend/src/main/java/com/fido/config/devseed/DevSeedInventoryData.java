package com.fido.config.devseed;

import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Product-based target-schema warehouse, balance and append-only ledger demo data. */
@Component
@Profile({"dev", "test"})
public class DevSeedInventoryData {
    private final JdbcTemplate jdbc;

    public DevSeedInventoryData(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void seedInventoryRows() {
        jdbc.update(
                "INSERT INTO warehouses(id,code,name,status) VALUES (1021001,'MAIN','Kho chính','ACTIVE')");

        jdbc.update(
                """
                INSERT INTO inventories(warehouse_id,product_id,quantity_on_hand,version,updated_at) VALUES
                (1021001,960001,99,2,'2026-09-26 02:00:00'),
                (1021001,960002,99,2,'2026-09-15 07:00:00'),
                (1021001,960003,100,1,'2026-09-01 01:00:00'),
                (1021001,960004,98,3,'2026-09-13 08:00:00'),
                (1021001,960005,100,1,'2026-09-01 01:00:00'),
                (1021001,960006,99,2,'2026-09-08 02:10:00'),
                (1021001,960007,98,2,'2026-09-15 07:00:00'),
                (1021001,960008,100,1,'2026-09-18 03:00:00'),
                (1021001,960009,120,2,'2026-09-18 03:00:00'),
                (1021001,960010,100,1,'2026-09-01 01:00:00'),
                (1021001,960011,100,1,'2026-09-01 01:00:00'),
                (1021001,960012,99,2,'2026-09-14 07:00:00'),
                (1021001,960013,100,1,'2026-09-01 01:00:00'),
                (1021001,960014,100,1,'2026-09-01 01:00:00'),
                (1021001,960015,100,1,'2026-09-01 01:00:00'),
                (1021001,960016,100,1,'2026-09-01 01:00:00'),
                (1021001,960017,100,1,'2026-09-01 01:00:00')
                """);
    }

    public void seedReceivingAndLedger() {
        seedSuppliers();
        seedGoodsReceipts();
        seedGoodsReceiptItems();
        seedInventoryTransactions();
    }

    private void seedSuppliers() {
        jdbc.update(
                """
                INSERT INTO suppliers(id,code,name,phone,email,status) VALUES
                (1020001,'SEED-SUP-001','Nhà cung cấp Seed Hà Nội','02439999999',
                    'supplier@fido.local','ACTIVE'),
                (1020002,'SEED-SUP-002','Nhà cung cấp ngừng dùng',NULL,NULL,'INACTIVE')
                """);
    }

    private void seedGoodsReceipts() {
        jdbc.update(
                """
                INSERT INTO goods_receipts(
                    id,supplier_id,warehouse_id,receipt_number,status,created_by,confirmed_by,
                    confirmed_at,created_at,updated_at
                ) VALUES
                (1010001,1020001,1021001,'SEED-GR-DRAFT','DRAFT',900004,NULL,NULL,
                    '2026-09-20 01:00:00','2026-09-20 01:00:00'),
                (1010002,1020001,1021001,'SEED-GR-CONFIRMED','CONFIRMED',900004,900004,
                    '2026-09-18 03:00:00','2026-09-18 01:00:00','2026-09-18 03:00:00'),
                (1010003,1020001,1021001,'SEED-GR-CANCELLED','CANCELLED',900004,NULL,NULL,
                    '2026-09-19 01:00:00','2026-09-19 02:00:00')
                """);
    }

    private void seedGoodsReceiptItems() {
        jdbc.update(
                """
                INSERT INTO goods_receipt_items(id,goods_receipt_id,product_id,quantity_received,unit_cost) VALUES
                (1030001,1010001,960008,10,180000),
                (1030002,1010002,960009,20,210000),
                (1030003,1010003,960010,5,185000)
                """);
    }

    private void seedInventoryTransactions() {
        jdbc.update(
                """
                INSERT INTO inventory_transactions(
                    id,warehouse_id,product_id,transaction_type,quantity_delta,
                    goods_receipt_item_id,order_item_id,idempotency_key,reason_code,
                    reverses_transaction_id,created_by,created_at
                ) VALUES
                (1040001,1021001,960001,'OPENING',100,NULL,NULL,'opening:1021001:960001','OPENING',NULL,900001,'2026-09-01 01:00:00'),
                (1040002,1021001,960002,'OPENING',100,NULL,NULL,'opening:1021001:960002','OPENING',NULL,900001,'2026-09-01 01:00:00'),
                (1040003,1021001,960003,'OPENING',100,NULL,NULL,'opening:1021001:960003','OPENING',NULL,900001,'2026-09-01 01:00:00'),
                (1040004,1021001,960004,'OPENING',100,NULL,NULL,'opening:1021001:960004','OPENING',NULL,900001,'2026-09-01 01:00:00'),
                (1040005,1021001,960005,'OPENING',100,NULL,NULL,'opening:1021001:960005','OPENING',NULL,900001,'2026-09-01 01:00:00'),
                (1040006,1021001,960006,'OPENING',100,NULL,NULL,'opening:1021001:960006','OPENING',NULL,900001,'2026-09-01 01:00:00'),
                (1040007,1021001,960007,'OPENING',100,NULL,NULL,'opening:1021001:960007','OPENING',NULL,900001,'2026-09-01 01:00:00'),
                (1040008,1021001,960008,'OPENING',100,NULL,NULL,'opening:1021001:960008','OPENING',NULL,900001,'2026-09-01 01:00:00'),
                (1040009,1021001,960009,'OPENING',100,NULL,NULL,'opening:1021001:960009','OPENING',NULL,900001,'2026-09-01 01:00:00'),
                (1040010,1021001,960010,'OPENING',100,NULL,NULL,'opening:1021001:960010','OPENING',NULL,900001,'2026-09-01 01:00:00'),
                (1040011,1021001,960011,'OPENING',100,NULL,NULL,'opening:1021001:960011','OPENING',NULL,900001,'2026-09-01 01:00:00'),
                (1040012,1021001,960012,'OPENING',100,NULL,NULL,'opening:1021001:960012','OPENING',NULL,900001,'2026-09-01 01:00:00'),
                (1040013,1021001,960013,'OPENING',100,NULL,NULL,'opening:1021001:960013','OPENING',NULL,900001,'2026-09-01 01:00:00'),
                (1040014,1021001,960014,'OPENING',100,NULL,NULL,'opening:1021001:960014','OPENING',NULL,900001,'2026-09-01 01:00:00'),
                (1040015,1021001,960015,'OPENING',100,NULL,NULL,'opening:1021001:960015','OPENING',NULL,900001,'2026-09-01 01:00:00'),
                (1040016,1021001,960016,'OPENING',100,NULL,NULL,'opening:1021001:960016','OPENING',NULL,900001,'2026-09-01 01:00:00'),
                (1040017,1021001,960017,'OPENING',100,NULL,NULL,'opening:1021001:960017','OPENING',NULL,900001,'2026-09-01 01:00:00'),
                (1040018,1021001,960009,'GOODS_RECEIPT',20,1030002,NULL,'goods-receipt-item:1030002:GOODS_RECEIPT',NULL,NULL,900004,'2026-09-18 03:00:00'),
                (1040019,1021001,960006,'ORDER',-1,NULL,1101002,'order:1001002:item:1101002:ORDER','ORDER_CONFIRM',NULL,900001,'2026-09-08 02:10:00'),
                (1040020,1021001,960004,'ORDER',-1,NULL,1101003,'order:1001003:item:1101003:ORDER','ORDER_CONFIRM',NULL,900001,'2026-09-09 02:10:00'),
                (1040021,1021001,960002,'ORDER',-1,NULL,1101004,'order:1001004:item:1101004:ORDER','ORDER_CONFIRM',NULL,900001,'2026-09-10 02:10:00'),
                (1040022,1021001,960001,'ORDER',-1,NULL,1101005,'order:1001005:item:1101005:ORDER','ORDER_CONFIRM',NULL,900001,'2026-09-11 02:10:00'),
                (1040023,1021001,960012,'ORDER',-1,NULL,1101006,'order:1001006:item:1101006:ORDER','ORDER_CONFIRM',NULL,900001,'2026-09-12 02:10:00'),
                (1040024,1021001,960007,'ORDER',-2,NULL,1101007,'order:1001101:item:1101007:ORDER','ORDER_CONFIRM',NULL,900001,'2026-09-10 01:10:00'),
                (1040025,1021001,960004,'ORDER',-1,NULL,1101008,'order:1001102:item:1101008:ORDER','ORDER_CONFIRM',NULL,900001,'2026-09-11 01:10:00')
                """);
    }
}
