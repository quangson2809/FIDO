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
                    'FIDO Utility Jacket',0)
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
                    '2026-09-01 00:00:00','2026-09-01 00:00:00')
                """);
    }
}
