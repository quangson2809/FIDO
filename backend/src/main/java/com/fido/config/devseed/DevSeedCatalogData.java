package com.fido.config.devseed;

import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Profile({"dev", "test"})
public class DevSeedCatalogData {

    private final JdbcTemplate jdbc;

    public DevSeedCatalogData(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void seed() {
        seedCategories();
        seedBrands();
        seedSizes();
        seedColors();
        seedProducts();
        seedImages();
        seedVariants();
    }

    private void seedCategories() {
        jdbc.update("""
                INSERT INTO categories(category_id,parent_category_id,name) VALUES
                (920001,NULL,'Áo'),
                (920002,NULL,'Quần'),
                (920003,NULL,'Váy & Đầm'),
                (920004,NULL,'Áo khoác'),
                (920005,920001,'Áo thun'),
                (920006,920002,'Quần Jeans'),
                (920007,920003,'Đầm liền'),
                (920008,920004,'Áo khoác nhẹ')
                """);
    }

    private void seedBrands() {
        jdbc.update("""
                INSERT INTO brands(brand_id,name) VALUES
                (930001,'FIDO Basics'),
                (930002,'FIDO Denim')
                """);
    }

    private void seedSizes() {
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
    }

    private void seedColors() {
        jdbc.update("""
                INSERT INTO colors(color_id,code,name) VALUES
                (950001,'BLACK','Đen'),
                (950002,'WHITE','Trắng'),
                (950003,'NAVY','Xanh navy'),
                (950004,'BLUE','Xanh denim')
                """);
    }

    private void seedProducts() {
        jdbc.update("""
                INSERT INTO products(
                    product_id,category_id,brand_id,size_system_id,name,description,
                    gender,season,style,material_care,base_price,sale_status,
                    created_at,updated_at
                ) VALUES
                (960001,920005,930001,940001,'FIDO Essential Tee',
                    'Áo thun cotton cơ bản','UNISEX','ALL_SEASON','BASIC',
                    'Cotton; giặt nhẹ.',199000.00,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960002,920006,930002,940002,'FIDO Denim Straight',
                    'Quần jeans straight fit','UNISEX','ALL_SEASON','DENIM',
                    'Giặt mặt trái.',499000.00,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960003,920005,930001,940001,'FIDO Archive Tee',
                    'Sản phẩm ngừng bán','UNISEX','ALL_SEASON','BASIC',
                    NULL,179000.00,'STOPPED',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960004,920007,930001,940001,'FIDO Linen Midi Dress',
                    'Đầm midi linen tối giản','UNISEX','ALL_SEASON','MINIMAL',
                    'Linen; giặt nhẹ.',459000.00,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960005,920008,930001,940001,'FIDO Utility Jacket',
                    'Áo khoác nhẹ dáng utility','UNISEX','ALL_SEASON','UTILITY',
                    'Cotton blend; giặt nhẹ.',699000.00,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960006,920005,930001,940001,'FIDO Heavyweight Tee',
                    'Áo thun cotton định lượng dày','UNISEX','ALL_SEASON','BASIC',
                    'Cotton compact; giặt nhẹ.',259000.00,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960007,920005,930001,940001,'FIDO Oxford Shirt',
                    'Áo sơ mi oxford tối giản','UNISEX','ALL_SEASON','SMART_CASUAL',
                    'Cotton oxford; giặt nhẹ.',329000.00,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960008,920005,930001,940001,'FIDO Everyday Sweatshirt',
                    'Áo nỉ cơ bản cho ngày thường','UNISEX','ALL_SEASON','CASUAL',
                    'Cotton blend; giặt nhẹ.',389000.00,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960009,920006,930002,940002,'FIDO Chino Trousers',
                    'Quần chino dáng regular','UNISEX','ALL_SEASON','SMART_CASUAL',
                    'Cotton twill; giặt mặt trái.',429000.00,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960010,920006,930002,940002,'FIDO Denim Shorts',
                    'Quần short denim cơ bản','UNISEX','SUMMER','CASUAL',
                    'Denim; giặt mặt trái.',399000.00,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960011,920006,930002,940002,'FIDO Wide Leg Jeans',
                    'Quần jeans ống rộng','UNISEX','ALL_SEASON','DENIM',
                    'Denim; giặt mặt trái.',559000.00,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960012,920007,930001,940001,'FIDO Shirt Dress',
                    'Đầm sơ mi dáng suông','UNISEX','ALL_SEASON','MINIMAL',
                    'Cotton blend; giặt nhẹ.',529000.00,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960013,920007,930001,940001,'FIDO Linen Maxi Dress',
                    'Đầm maxi linen tối giản','UNISEX','SUMMER','MINIMAL',
                    'Linen; giặt nhẹ.',579000.00,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960014,920007,930001,940001,'FIDO Pleated Midi Dress',
                    'Đầm midi xếp ly','UNISEX','ALL_SEASON','MINIMAL',
                    'Poly blend; giặt nhẹ.',499000.00,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960015,920008,930001,940001,'FIDO Bomber Jacket',
                    'Áo khoác bomber tối giản','UNISEX','ALL_SEASON','UTILITY',
                    'Cotton blend; giặt nhẹ.',699000.00,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960016,920008,930001,940001,'FIDO Overshirt Jacket',
                    'Áo khoác overshirt nhẹ','UNISEX','ALL_SEASON','SMART_CASUAL',
                    'Cotton twill; giặt nhẹ.',599000.00,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960017,920008,930001,940001,'FIDO Minimal Blazer',
                    'Áo blazer phom tối giản','UNISEX','ALL_SEASON','SMART_CASUAL',
                    'Poly blend; giặt nhẹ.',799000.00,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00')
                """);
    }

    private void seedImages() {
        jdbc.update("""
                INSERT INTO product_images(
                    image_id,product_id,image_url,alt_text,sort_order
                ) VALUES
                (961001,960001,'https://example.com/fido/tee-black.jpg',
                    'FIDO Essential Tee',0),
                (961002,960002,'https://example.com/fido/denim-blue.jpg',
                    'FIDO Denim Straight',0),
                (961003,960003,'https://example.com/fido/archive.jpg',
                    'FIDO Archive Tee',0),
                (961004,960004,'https://example.com/fido/dress-midi.jpg',
                    'FIDO Linen Midi Dress',0),
                (961005,960005,'https://example.com/fido/jacket-utility.jpg',
                    'FIDO Utility Jacket',0),
                (961006,960006,'https://example.com/fido/tee-heavyweight.jpg','FIDO Heavyweight Tee',0),
                (961007,960007,'https://example.com/fido/oxford-shirt.jpg','FIDO Oxford Shirt',0),
                (961008,960008,'https://example.com/fido/sweatshirt.jpg','FIDO Everyday Sweatshirt',0),
                (961009,960009,'https://example.com/fido/chino-trousers.jpg','FIDO Chino Trousers',0),
                (961010,960010,'https://example.com/fido/denim-shorts.jpg','FIDO Denim Shorts',0),
                (961011,960011,'https://example.com/fido/wide-leg-jeans.jpg','FIDO Wide Leg Jeans',0),
                (961012,960012,'https://example.com/fido/shirt-dress.jpg','FIDO Shirt Dress',0),
                (961013,960013,'https://example.com/fido/linen-maxi-dress.jpg','FIDO Linen Maxi Dress',0),
                (961014,960014,'https://example.com/fido/pleated-midi-dress.jpg','FIDO Pleated Midi Dress',0),
                (961015,960015,'https://example.com/fido/bomber-jacket.jpg','FIDO Bomber Jacket',0),
                (961016,960016,'https://example.com/fido/overshirt-jacket.jpg','FIDO Overshirt Jacket',0),
                (961017,960017,'https://example.com/fido/minimal-blazer.jpg','FIDO Minimal Blazer',0)
                """);
    }

    private void seedVariants() {
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
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (970006,960004,941002,950002,'DRESS-M-WHT',NULL,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (970007,960005,941003,950001,'JACKET-L-BLK',NULL,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (970008,960006,941001,950003,'TEE-HEAVY-S-NVY',NULL,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (970009,960007,941002,950002,'OXFORD-M-WHT',NULL,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (970010,960008,941003,950001,'SWEAT-L-BLK',NULL,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (970011,960009,941004,950003,'CHINO-28-NVY',NULL,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (970012,960010,941005,950004,'SHORTS-30-BLU',NULL,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (970013,960011,941006,950001,'WIDEJEANS-32-BLK',NULL,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (970014,960012,941001,950002,'SHIRTDRESS-S-WHT',NULL,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (970015,960013,941002,950003,'MAXIDRESS-M-NVY',NULL,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (970016,960014,941003,950001,'PLEATED-L-BLK',NULL,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (970017,960015,941002,950001,'BOMBER-M-BLK',NULL,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (970018,960016,941003,950003,'OVERSHIRT-L-NVY',NULL,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (970019,960017,941001,950002,'BLAZER-S-WHT',NULL,'ON_SALE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00')
                """);
    }
}
