-- Development/test demo data ONLY; not a Flyway migration and never auto-run in production.
-- Execute only after applying db/clean-reset migrations to a disposable target-schema database.
-- This fixture creates no user accounts or passwords.

INSERT INTO categories (id,parent_category_id,name,slug,status)
VALUES (10001,NULL,'Áo','ao-demo','ACTIVE');
INSERT INTO brands (id,name,slug,status) VALUES (20001,'FIDO Demo','fido-demo','ACTIVE');

INSERT INTO products (id,parent_product_id,category_id,brand_id,name,slug,sku,description,selling_price,cost_price,status)
VALUES (30001,NULL,10001,20001,'Áo thun cơ bản','ao-thun-co-ban-demo','DEMO-TSHIRT',
 'Sản phẩm cha minh họa cho mô hình Product cha/con.',250000.00,100000.00,'ACTIVE');
INSERT INTO products (id,parent_product_id,category_id,brand_id,name,slug,sku,description,selling_price,cost_price,status)
VALUES (30002,30001,NULL,NULL,NULL,NULL,'DEMO-TSHIRT-WHT-S',NULL,NULL,NULL,'ACTIVE');

INSERT INTO attribute_types (id,code,name,data_type) VALUES
 (40001,'SIZE','Kích thước','OPTION'),(40002,'COLOR','Màu sắc','OPTION');
INSERT INTO attributes (id,attribute_type_id,code,name,is_required,is_variant_defining,sort_order) VALUES
 (41001,40001,'SIZE','Kích thước',TRUE,TRUE,1),(41002,40002,'COLOR','Màu sắc',TRUE,TRUE,2);
INSERT INTO attribute_options (id,attribute_id,value,label,sort_order) VALUES
 (42001,41001,'S','S',1),(42002,41002,'WHITE','Trắng',1);
INSERT INTO product_attribute_values (product_id,attribute_id,option_id,text_value,number_value,boolean_value) VALUES
 (30002,41001,42001,NULL,NULL,NULL),(30002,41002,42002,NULL,NULL,NULL);

INSERT INTO product_images (id,product_id,image_url,is_primary,sort_order)
VALUES (43001,30001,'https://example.invalid/fido-demo-shirt.png',TRUE,0);
INSERT INTO warehouses (id,code,name,status) VALUES (50001,'MAIN','Kho chính','ACTIVE');
INSERT INTO inventories (warehouse_id,product_id,quantity_on_hand,version) VALUES (50001,30002,50,0);
INSERT INTO vouchers (id,code,discount_type,discount_value,minimum_order_value,maximum_discount,starts_at,ends_at,usage_limit,status)
VALUES (60001,'DEMO10','PERCENT',10.00,0.00,50000.00,'2026-01-01 00:00:00','2030-12-31 23:59:59',100,'ACTIVE');
