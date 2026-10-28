-- Minimal deterministic fixture for the approved ERD v2 (31-table) schema.
-- This file is test data only; it must never define legacy/compatibility columns.

INSERT INTO accounts(id,full_name,password_hash,phone,email,status,deleted_at,created_at,updated_at)
VALUES (1,'Fixture account','test-only-hash','0900000001',NULL,'ACTIVE',NULL,CURRENT_TIMESTAMP(6),CURRENT_TIMESTAMP(6));

INSERT INTO addresses(
    id,account_id,recipient_name,recipient_phone,province,district,ward,address_line,is_default,created_at,updated_at
) VALUES (
    1,1,'Fixture recipient','0900000001','Hà Nội','Cầu Giấy','Dịch Vọng','Test address',TRUE,
    CURRENT_TIMESTAMP(6),CURRENT_TIMESTAMP(6)
);

INSERT INTO roles(id,code,name,description,status)
VALUES (101,'fixture-role','Fixture role',NULL,'ACTIVE');
INSERT INTO permissions(id,code,name,description)
VALUES (1001,'FIXTURE_PERMISSION','Fixture permission',NULL);
INSERT INTO account_roles(account_id,role_id) VALUES (1,101);
INSERT INTO role_permissions(role_id,permission_id) VALUES (101,1001);

INSERT INTO categories(id,parent_category_id,name,slug,status,created_at,updated_at)
VALUES (1,NULL,'Root','fixture-root','ACTIVE',CURRENT_TIMESTAMP(6),CURRENT_TIMESTAMP(6));
INSERT INTO brands(id,name,slug,status) VALUES (1,'Fixture brand','fixture-brand','ACTIVE');

INSERT INTO attributes(id,attribute_type_id,code,name,is_required,is_variant_defining,sort_order)
VALUES (1,1,'fixture-option','Fixture option',FALSE,FALSE,0);
INSERT INTO attribute_options(id,attribute_id,`value`,label,sort_order)
VALUES (1,1,'fixture-option','Fixture option',0);

INSERT INTO products(
    id,parent_product_id,category_id,brand_id,name,slug,sku,description,
    selling_price,cost_price,status,deleted_at,created_at,updated_at
) VALUES (
    1,NULL,1,1,'Fixture product','fixture-product','FIXTURE-SKU','Fixture description',
    1000,500,'ACTIVE',NULL,CURRENT_TIMESTAMP(6),CURRENT_TIMESTAMP(6)
);
INSERT INTO product_attribute_values(product_id,attribute_id,option_id,text_value,number_value,boolean_value)
VALUES (1,1,1,NULL,NULL,NULL);
INSERT INTO product_images(id,product_id,image_url,is_primary,sort_order,created_at)
VALUES (1,1,'https://example.invalid/test.png',TRUE,0,CURRENT_TIMESTAMP(6));

INSERT INTO carts(id,account_id,status,created_at,updated_at)
VALUES (1,1,'OPEN',CURRENT_TIMESTAMP(6),CURRENT_TIMESTAMP(6));
INSERT INTO cart_items(id,cart_id,product_id,quantity,added_at,updated_at)
VALUES (1,1,1,1,CURRENT_TIMESTAMP(6),CURRENT_TIMESTAMP(6));

INSERT INTO vouchers(
    id,code,discount_type,discount_value,minimum_order_value,maximum_discount,
    starts_at,ends_at,usage_limit,usage_count,status
) VALUES (1,'FIXTURE-VOUCHER','FIXED',100,0,NULL,NULL,NULL,10,1,'DRAFT');

INSERT INTO orders(
    id,account_id,voucher_id,order_number,idempotency_key,request_fingerprint,status,
    subtotal,discount_amount,shipping_fee,total_amount,currency,placed_at,created_at,updated_at
) VALUES (
    1,1,1,'FIXTURE-ORDER','fixture-idempotency-key',
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    'PENDING',1000,100,30000,30900,'VND',CURRENT_TIMESTAMP(6),CURRENT_TIMESTAMP(6),CURRENT_TIMESTAMP(6)
);
INSERT INTO order_items(
    id,order_id,product_id,sku_snapshot,product_name_snapshot,attribute_snapshot,image_url_snapshot,
    quantity,unit_price,discount_amount,line_total
) VALUES (1,1,1,'FIXTURE-SKU','Historical product','[]','https://example.invalid/test.png',1,1000,100,900);
INSERT INTO order_addresses(
    order_id,recipient_name,recipient_phone,province,district,ward,address_line
) VALUES (1,'Fixture recipient','0900000001','Hà Nội','Cầu Giấy','Dịch Vọng','Test address');
INSERT INTO order_voucher_snapshots(
    order_id,voucher_code_snapshot,discount_type_snapshot,discount_value_snapshot,discount_amount_snapshot
) VALUES (1,'FIXTURE-VOUCHER','FIXED',100,100);
INSERT INTO payments(
    order_id,method,payment_status,amount,currency,collected_by_account_id,collected_at,
    refund_amount,refunded_by_account_id,refunded_at,refund_reason,created_at,updated_at
) VALUES (
    1,'COD','UNPAID',30900,'VND',NULL,NULL,0,NULL,NULL,NULL,CURRENT_TIMESTAMP(6),CURRENT_TIMESTAMP(6)
);
INSERT INTO shipping_infos(
    order_id,recipient_name,recipient_phone,carrier_name,tracking_number,
    shipping_status,shipped_at,delivered_at,updated_at
) VALUES (1,'Fixture recipient','0900000001',NULL,NULL,'PENDING',NULL,NULL,CURRENT_TIMESTAMP(6));

INSERT INTO suppliers(id,code,name,phone,email,status,created_at,updated_at)
VALUES (1,'FIXTURE-SUPPLIER','Fixture supplier',NULL,NULL,'ACTIVE',CURRENT_TIMESTAMP(6),CURRENT_TIMESTAMP(6));
INSERT INTO warehouses(id,code,name,status)
VALUES (1,'FIXTURE-WAREHOUSE','Fixture warehouse','ACTIVE');
INSERT INTO goods_receipts(
    id,supplier_id,warehouse_id,receipt_number,status,created_by,confirmed_by,confirmed_at,created_at,updated_at
) VALUES (1,1,1,'FIXTURE-RECEIPT','DRAFT',1,NULL,NULL,CURRENT_TIMESTAMP(6),CURRENT_TIMESTAMP(6));
INSERT INTO goods_receipt_items(id,goods_receipt_id,product_id,quantity_received,unit_cost)
VALUES (1,1,1,2,500);
INSERT INTO inventories(warehouse_id,product_id,quantity_on_hand,version,updated_at)
VALUES (1,1,10,0,CURRENT_TIMESTAMP(6));
INSERT INTO inventory_transactions(
    id,warehouse_id,product_id,transaction_type,quantity_delta,goods_receipt_item_id,order_item_id,
    idempotency_key,reason_code,reverses_transaction_id,created_by,created_at
) VALUES (1,1,1,'OPENING',10,NULL,NULL,'fixture-opening-stock','FIXTURE',NULL,1,CURRENT_TIMESTAMP(6));

INSERT INTO audit_logs(
    id,actor_account_id,action,entity_type,entity_id,before_data,after_data,correlation_id,created_at
) VALUES (1,1,'FIXTURE_EVENT','fixture','1',NULL,NULL,'fixture-correlation',CURRENT_TIMESTAMP(6));
INSERT INTO content_pages(id,slug,title,content,status,updated_by,updated_at)
VALUES (1,'fixture-page','Fixture page','Fixture content','DRAFT',1,CURRENT_TIMESTAMP(6));
