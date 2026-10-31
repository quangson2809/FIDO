package com.fido.config.devseed;

import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Product-based demo catalog. Attributes are defined directly and Product values select predefined Options only.
 */
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
        seedAttributes();
        seedAttributeOptions();
        seedProducts();
        seedProductAttributeValues();
        seedImages();
    }

    private void seedCategories() {
        jdbc.update(
                """
                INSERT INTO categories(id,parent_category_id,name,slug,status) VALUES
                (920001,NULL,'Áo','ao','ACTIVE'),
                (920002,NULL,'Quần','quan','ACTIVE'),
                (920003,NULL,'Váy & Đầm','vay-dam','ACTIVE'),
                (920004,NULL,'Áo khoác','ao-khoac','ACTIVE'),
                (920005,920001,'Áo thun','ao-thun','ACTIVE'),
                (920006,920002,'Quần Jeans','quan-jeans','ACTIVE'),
                (920007,920003,'Đầm liền','dam-lien','ACTIVE'),
                (920008,920004,'Áo khoác nhẹ','ao-khoac-nhe','ACTIVE')
                """);
    }

    private void seedBrands() {
        jdbc.update(
                """
                INSERT INTO brands(id,name,slug,status) VALUES
                (930001,'FIDO Basics','fido-basics','ACTIVE'),
                (930002,'FIDO Denim','fido-denim','ACTIVE')
                """);
    }

    private void seedAttributes() {
        jdbc.update(
                """
                INSERT INTO attributes(
                    id,code,name,is_required,is_variant_defining,sort_order
                ) VALUES
                (940001,'SIZE','Kích thước',FALSE,FALSE,1),
                (940002,'COLOR','Màu sắc',FALSE,FALSE,2)
                """);
    }

    private void seedAttributeOptions() {
        jdbc.update(
                """
                INSERT INTO attribute_options(id,attribute_id,\u0060value\u0060,label,sort_order) VALUES
                (941001,940001,'S','S',1),
                (941002,940001,'M','M',2),
                (941003,940001,'L','L',3),
                (941004,940002,'BLACK','Đen',1),
                (941005,940002,'WHITE','Trắng',2),
                (941006,940002,'NAVY','Xanh navy',3),
                (941007,940002,'BLUE','Xanh denim',4)
                """);
    }

    private void seedProducts() {
        jdbc.update(
                """
                INSERT INTO products(
                    id,parent_product_id,category_id,brand_id,name,slug,sku,description,
                    selling_price,cost_price,status,created_at,updated_at
                ) VALUES
                (960001,NULL,920005,930001,'FIDO Essential Tee','fido-essential-tee',
                    'FIDO-TEE-001','Áo thun cotton cơ bản',199000,95000,'ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960002,NULL,920006,930002,'FIDO Denim Straight','fido-denim-straight',
                    'FIDO-DENIM-001','Quần jeans straight fit',499000,260000,'ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960003,NULL,920005,930001,'FIDO Archive Tee','fido-archive-tee',
                    'FIDO-TEE-003','Sản phẩm ngừng bán',179000,80000,'INACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960004,NULL,920007,930001,'FIDO Linen Midi Dress','fido-linen-midi-dress',
                    'FIDO-DRESS-001','Đầm midi linen tối giản',459000,220000,'ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960005,NULL,920008,930001,'FIDO Utility Jacket','fido-utility-jacket',
                    'FIDO-JACKET-001','Áo khoác nhẹ dáng utility',699000,350000,'ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960006,960001,920005,930001,'FIDO Heavyweight Tee','fido-heavyweight-tee',
                    'FIDO-TEE-006','Áo thun cotton định lượng dày',259000,125000,'ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960007,NULL,920005,930001,'FIDO Oxford Shirt','fido-oxford-shirt',
                    'FIDO-SHIRT-001','Áo sơ mi oxford tối giản',329000,155000,'ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960008,NULL,920005,930001,'FIDO Everyday Sweatshirt','fido-everyday-sweatshirt',
                    'FIDO-SWEAT-001','Áo nỉ cơ bản cho ngày thường',389000,190000,'ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960009,NULL,920006,930002,'FIDO Chino Trousers','fido-chino-trousers',
                    'FIDO-CHINO-001','Quần chino dáng regular',429000,210000,'ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960010,NULL,920006,930002,'FIDO Denim Shorts','fido-denim-shorts',
                    'FIDO-SHORTS-001','Quần short denim cơ bản',399000,190000,'ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960011,NULL,920006,930002,'FIDO Wide Leg Jeans','fido-wide-leg-jeans',
                    'FIDO-JEANS-011','Quần jeans ống rộng',559000,280000,'ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960012,NULL,920007,930001,'FIDO Shirt Dress','fido-shirt-dress',
                    'FIDO-DRESS-012','Đầm sơ mi dáng suông',529000,250000,'ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960013,NULL,920007,930001,'FIDO Linen Maxi Dress','fido-linen-maxi-dress',
                    'FIDO-DRESS-013','Đầm maxi linen tối giản',579000,285000,'ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960014,NULL,920007,930001,'FIDO Pleated Midi Dress','fido-pleated-midi-dress',
                    'FIDO-DRESS-014','Đầm midi xếp ly',499000,245000,'ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960015,NULL,920008,930001,'FIDO Bomber Jacket','fido-bomber-jacket',
                    'FIDO-JACKET-015','Áo khoác bomber tối giản',699000,345000,'ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960016,NULL,920008,930001,'FIDO Overshirt Jacket','fido-overshirt-jacket',
                    'FIDO-JACKET-016','Áo khoác overshirt nhẹ',599000,295000,'ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (960017,NULL,920008,930001,'FIDO Minimal Blazer','fido-minimal-blazer',
                    'FIDO-BLAZER-017','Áo blazer phom tối giản',799000,390000,'ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00')
                """);
    }

    private void seedProductAttributeValues() {
        jdbc.update(
                """
                INSERT INTO product_attribute_values(product_id,attribute_id,option_id) VALUES
                (960001,940001,941002),
                (960001,940002,941004),
                (960002,940001,941003),
                (960002,940002,941007),
                (960006,940001,941001),
                (960006,940002,941005)
                """);
    }

    private void seedImages() {
        jdbc.update(
                """
                INSERT INTO product_images(id,product_id,image_url,is_primary,sort_order) VALUES
                (961001,960001,'https://example.invalid/fido/tee-black-v1.jpg',TRUE,0),
                (961002,960002,'https://example.invalid/fido/denim-blue-v1.jpg',TRUE,0),
                (961003,960003,'https://example.invalid/fido/archive-v1.jpg',TRUE,0),
                (961004,960004,'https://example.invalid/fido/dress-midi-v1.jpg',TRUE,0),
                (961005,960005,'https://example.invalid/fido/jacket-utility-v1.jpg',TRUE,0),
                (961006,960006,'https://example.invalid/fido/tee-heavyweight-v1.jpg',TRUE,0),
                (961007,960007,'https://example.invalid/fido/oxford-shirt-v1.jpg',TRUE,0),
                (961008,960008,'https://example.invalid/fido/sweatshirt-v1.jpg',TRUE,0),
                (961009,960009,'https://example.invalid/fido/chino-trousers-v1.jpg',TRUE,0),
                (961010,960010,'https://example.invalid/fido/denim-shorts-v1.jpg',TRUE,0),
                (961011,960011,'https://example.invalid/fido/wide-leg-jeans-v1.jpg',TRUE,0),
                (961012,960012,'https://example.invalid/fido/shirt-dress-v1.jpg',TRUE,0),
                (961013,960013,'https://example.invalid/fido/linen-maxi-dress-v1.jpg',TRUE,0),
                (961014,960014,'https://example.invalid/fido/pleated-midi-dress-v1.jpg',TRUE,0),
                (961015,960015,'https://example.invalid/fido/bomber-jacket-v1.jpg',TRUE,0),
                (961016,960016,'https://example.invalid/fido/overshirt-jacket-v1.jpg',TRUE,0),
                (961017,960017,'https://example.invalid/fido/minimal-blazer-v1.jpg',TRUE,0)
                """);
    }
}
