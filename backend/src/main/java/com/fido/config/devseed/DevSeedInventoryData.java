package com.fido.config.devseed;

import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Profile({"dev", "test"})
public class DevSeedInventoryData {

    private final JdbcTemplate jdbc;

    public DevSeedInventoryData(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void seedInventoryRows() {
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

    public void seedReceivingAndLedger() {
        seedSuppliers();
        seedGoodsReceipts();
        seedGoodsReceiptItems();
        seedInventoryTransactions();
    }

    private void seedSuppliers() {
        jdbc.update("""
                INSERT INTO suppliers(
                    supplier_id,name,phone,email,address,usage_status,note
                ) VALUES
                (1020001,'Nhà cung cấp Seed Hà Nội','02439999999',
                    'supplier@fido.local','Hà Nội','ACTIVE','Seed Postman'),
                (1020002,'Nhà cung cấp Ngừng dùng',NULL,NULL,
                    'Hà Nội','INACTIVE','Dùng để test filter')
                """);
    }

    private void seedGoodsReceipts() {
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
    }

    private void seedGoodsReceiptItems() {
        jdbc.update("""
                INSERT INTO goods_receipt_items(
                    receipt_item_id,receipt_id,variant_id,quantity
                ) VALUES
                (1030001,1010001,970003,10),
                (1030002,1010002,970001,20),
                (1030003,1010003,970004,5)
                """);
    }

    private void seedInventoryTransactions() {
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
}
