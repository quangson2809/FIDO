# FIDO — P0 Baseline & Dependency Audit trước ERD v2

- **Repository:** https://github.com/quangson2809/FIDO
- **Branch baseline:** demo1
- **Baseline SHA:** f931602c86fdf5a59b487d6edd77331b7d64333a
- **Feature branch:** refactor/p0-baseline-audit
- **Ngày kiểm toán:** 2026-10-21 (Asia/Ho_Chi_Minh)
- **Phạm vi:** source tree, Flyway DDL, JPA entities/repositories/services/controllers/DTO, tests, architecture docs và CI.
- **Không thực hiện:** sửa business logic, API/schema, chạy migration thay đổi DB, chuyển đổi dữ liệu thật, PR/merge.

## 1. Kết luận và trạng thái nghiệm thu

**P0 = PARTIAL.** Đã kiểm toán được source tại SHA xác định, chuỗi migration V1–V6, các dependency chính của ProductVariant và luồng giá/tồn kho/cart/checkout/voucher/order/report, workflow CI và bộ persistence tests. Không thể nghiệm thu PASS toàn bộ vì thiếu ba bằng chứng:

1. **BLOCKED:** không clone/checkout được working copy để chạy lệnh local. Clone thất bại do container không phân giải được github.com (DNS; exit code 128). Không quan sát được working tree cục bộ của người dùng; không được suy diễn là sạch.
2. **BLOCKED:** không có kết nối/credential tới database ứng dụng để đọc row count, data distribution, DDL live hoặc kiểm tra duplicate/null/key collision trên dữ liệu thật. Schema dưới đây là DDL suy từ migration, không phải database introspection.
3. **BLOCKED:** không tìm thấy ERD v2 diagram/DDL trong tree tại baseline. Chỉ có mô tả khái niệm trong yêu cầu, không có bảng/cột/kiểu/constraint đích để so sánh chính xác.

CI tại đúng baseline đã pass cả bước H2 và bước migration/mapping/test trên MySQL 8.4. Đây là bằng chứng CI độc lập, không thay cho kiểm tra working tree, DB live hoặc ERD v2.

## 2. Baseline Git và CI — P0.1

### 2.1 Git

- GitHub API xác nhận demo1 trỏ tới SHA f931602c86fdf5a59b487d6edd77331b7d64333a.
- HEAD message: “Merge PR #22: verify design patterns against Refactoring.Guru”; timestamp 2026-10-21T16:06:34Z; merge parents: 78f6d0f015abae7a4f5afc1fb0180cab3a029e2a và 37b7ddb92ccd83162a1c8aec8473bab5bc2c1b7b.
- Remote branch refactor/p0-baseline-audit đã được tạo từ đúng SHA f931602c86fdf5a59b487d6edd77331b7d64333a. Branch được kiểm tra vẫn ở base trước khi ghi tài liệu.
- Working tree local: **UNVERIFIED/BLOCKED**. Không truy cập được checkout trên máy người dùng; clone cô lập bị DNS fail. Không reset/checkout/stash/sửa working copy của người dùng.
- Không sửa demo1; không merge/rebase/force-push/cherry-pick.
- Endpoint branch cho thấy demo1 không bật branch protection ở thời điểm kiểm toán.

### 2.2 CI thực tế

- Workflow: **Backend verification**
- Run: https://github.com/quangson2809/FIDO/actions/runs/39631789377
- Event push; branch demo1; SHA f931602c86fdf5a59b487d6edd77331b7d64333a; completed/success.
- Job “Build and test backend”: success.
- Các step “Set up Java 17”, “Build and test with H2”, “Test migration and mapping with MySQL”: success.

Workflow .github/workflows/backend-verification.yml:
- Trigger: push cho danh sách branch cố định; pull_request vào main có path filter backend/**, reference/** và workflow file; workflow_dispatch.
- Java Temurin 17; MySQL service 8.4.
- H2 command trong backend: ./gradlew --no-daemon clean compileJava test check build.
- MySQL command: ./gradlew --no-daemon compileJava test check --rerun-tasks với TEST_DB_URL, TEST_DB_DRIVER=com.mysql.cj.jdbc.Driver, TEST_DB_USERNAME/PASSWORD từ service CI.
- refactor/p0-baseline-audit không nằm trong allowlist trigger push. PR chỉ nhắm main và path filter không bao gồm docs/**. Một commit chỉ sửa audit report trên branch này sẽ không tự kích hoạt workflow theo trigger hiện tại; không chỉnh CI trong P0.
- .github/workflows/dev-compose-verification.yml đã được đọc; kiểm tra Compose/build/health theo path/branch allowlist riêng. Không có bằng chứng run trên đúng SHA f931602c86fdf5a59b487d6edd77331b7d64333a trong các run gần nhất đã truy cập. .github/workflows/frontend-verification.yml là workflow FE riêng, không tính như bằng chứng backend.

### 2.3 Build/runtime declarations

Nguồn: backend/build.gradle.kts, backend/gradle/wrapper/gradle-wrapper.properties.

- Java toolchain 17; Spring Boot 4.0.3; Gradle Kotlin DSL; Gradle wrapper 9.3.1.
- Spring Data JPA, Flyway starter, MySQL Connector/J runtime, Flyway MySQL runtime.
- Tests: Spring Boot test, Spring Security test, H2, JUnit Platform; sourceSets.test nạp thêm ../reference.
- docs/15-technical-decisions.md quy định Hibernate validate mapping, còn Flyway quản lý schema.

## 3. Inventory migrations và schema — P0.2

### 3.1 Chuỗi migration trong source

- backend/src/main/resources/db/migration/V1__baseline_28_tables.sql — blob SHA 5ba96339334ac47fa8fb51459ce2276b5e1ccf04.
- backend/src/main/resources/db/migration/V2__phone_identity_and_system_roles.sql — blob SHA 04e492a6370ff0e196385f83edbe7e1db20f657a.
- backend/src/main/resources/db/migration/V3__inventory_receiving_guards.sql — blob SHA 4a22cbe27b275549ffa2374b472aecb63d73acdf.
- backend/src/main/resources/db/migration/V4__product_image_order_and_order_item_image_snapshot.sql — blob SHA cd7ed809d116411df483085843a251767b4326b0.
- backend/src/main/resources/db/migration/V5__voucher_policy_and_checkout_quotes.sql — blob SHA 99725ec125ac48ca64311b7e78d66c6fded01b1f.
- backend/src/main/resources/db/migration/V6__report_read_permission.sql — blob SHA 49d121fc2d8af6eacaab2265a4d54d6b60866f53.

| Migration | Tác động theo DDL |
|---|---|
| V1 | Tạo 28 bảng domain baseline. Comment yêu cầu MySQL 8.0.16+ để enforce CHECK; FK không có ON DELETE CASCADE. |
| V2 | Unique constraint uq_accounts_phone; seed role ADMIN và SUPERADMIN. Comment nêu duplicate phone làm migration dừng, không tự merge account. |
| V3 | Insert zero-quantity inventory row còn thiếu cho mỗi variant và tạo 6 index cho receipt/ledger. Không thêm bảng/cột domain. |
| V4 | Thêm product_images.sort_order, backfill theo image_id tăng dần thành zero-based ordering, NOT NULL + CHECK >= 0 + UNIQUE(product_id, sort_order); thêm nullable order_items.image_url_snapshot, không backfill history. |
| V5 | Thêm 9 cột voucher policy; tạo voucher_products, voucher_categories, voucher_usages, checkout_quotes; seed VOUCHER_READ/VOUCHER_WRITE. |
| V6 | Seed permission REPORT_READ. |

**Phát hiện:** V1 tạo 28 bảng; 4 bảng mới ở V5 đưa tổng số bảng từ CREATE TABLE trong chuỗi migration lên **32**. Đây là count của source DDL, không phải xác nhận một DB runtime đã migrate tới V6.

### 3.2 Bốn bảng V5 bổ sung ngoài V1

| Table | Cột và kiểu theo DDL | PK / FK / UNIQUE / index |
|---|---|---|
| voucher_products | voucher_id BIGINT NOT NULL; product_id BIGINT NOT NULL | PK(voucher_id, product_id); FK tới vouchers.voucher_id và products.product_id |
| voucher_categories | voucher_id BIGINT NOT NULL; category_id BIGINT NOT NULL | PK(voucher_id, category_id); FK tới vouchers.voucher_id và categories.category_id |
| voucher_usages | order_id BIGINT NOT NULL; voucher_id BIGINT NOT NULL; account_id BIGINT NOT NULL; restored BOOLEAN NOT NULL DEFAULT FALSE | PK/FK order_id → orders.order_id; FK voucher_id → vouchers.voucher_id; FK account_id → accounts.account_id; index ix_voucher_usage_count(voucher_id, restored, account_id) |
| checkout_quotes | quote_id VARCHAR(36) NOT NULL; account_id BIGINT NOT NULL; fingerprint VARCHAR(64) NOT NULL; expires_at TIMESTAMP(6) NOT NULL; order_id BIGINT NULL | PK quote_id; FK account_id → accounts.account_id; FK order_id → orders.order_id; UNIQUE(order_id) |

V5 bổ sung vào vouchers: discount_type VARCHAR(20) NULL; discount_value DECIMAL(18,2) NULL; maximum_discount DECIMAL(18,2) NULL; minimum_amount DECIMAL(18,2) NULL; starts_at TIMESTAMP(6) NULL; ends_at TIMESTAMP(6) NULL; scope VARCHAR(20) NULL; global_limit BIGINT NULL; customer_limit BIGINT NULL; enabled BOOLEAN NOT NULL DEFAULT FALSE. Voucher legacy code-only được giữ disabled theo migration/technical decisions.

### 3.3 V1: inventory columns và constraints theo từng table

Phần dưới trích từ V1__baseline_28_tables.sql. V2–V6 thay đổi được nêu riêng ở §3.1–3.2. Kiểu hiển thị gồm length/precision/scale; AI là AUTO_INCREMENT.

#### accounts (6 cột V1)

- account_id BIGINT NOT NULL AUTO_INCREMENT
- password_hash VARCHAR(255) NOT NULL
- phone VARCHAR(20) NULL
- email VARCHAR(254) NULL
- created_at TIMESTAMP(6) NOT NULL
- updated_at TIMESTAMP(6) NOT NULL

Ràng buộc V1:
- PRIMARY KEY (account_id)

#### addresses (4 cột V1)

- address_id BIGINT NOT NULL AUTO_INCREMENT
- account_id BIGINT NOT NULL
- address_text VARCHAR(500) NOT NULL
- created_at TIMESTAMP(6) NOT NULL

Ràng buộc V1:
- CONSTRAINT fk_addresses_account_id FOREIGN KEY (account_id) REFERENCES accounts (account_id)
- PRIMARY KEY (address_id)

#### roles (4 cột V1)

- role_id BIGINT NOT NULL AUTO_INCREMENT
- code VARCHAR(80) NOT NULL
- name VARCHAR(150) NOT NULL
- description VARCHAR(500) NULL

Ràng buộc V1:
- PRIMARY KEY (role_id)
- CONSTRAINT uq_roles_1 UNIQUE (code)

#### permissions (3 cột V1)

- permission_id BIGINT NOT NULL AUTO_INCREMENT
- code VARCHAR(120) NOT NULL
- name VARCHAR(200) NOT NULL

Ràng buộc V1:
- PRIMARY KEY (permission_id)
- CONSTRAINT uq_permissions_1 UNIQUE (code)

#### account_roles (2 cột V1)

- account_id BIGINT NOT NULL
- role_id BIGINT NOT NULL

Ràng buộc V1:
- CONSTRAINT fk_account_roles_account_id FOREIGN KEY (account_id) REFERENCES accounts (account_id)
- CONSTRAINT fk_account_roles_role_id FOREIGN KEY (role_id) REFERENCES roles (role_id)
- PRIMARY KEY (account_id, role_id)

#### role_permissions (2 cột V1)

- role_id BIGINT NOT NULL
- permission_id BIGINT NOT NULL

Ràng buộc V1:
- CONSTRAINT fk_role_permissions_role_id FOREIGN KEY (role_id) REFERENCES roles (role_id)
- CONSTRAINT fk_role_permissions_permission_id FOREIGN KEY (permission_id) REFERENCES permissions (permission_id)
- PRIMARY KEY (role_id, permission_id)

#### categories (3 cột V1)

- category_id BIGINT NOT NULL AUTO_INCREMENT
- parent_category_id BIGINT NULL
- name VARCHAR(150) NOT NULL

Ràng buộc V1:
- CONSTRAINT fk_categories_parent_category_id FOREIGN KEY (parent_category_id) REFERENCES categories (category_id)
- PRIMARY KEY (category_id)

#### brands (2 cột V1)

- brand_id BIGINT NOT NULL AUTO_INCREMENT
- name VARCHAR(150) NOT NULL

Ràng buộc V1:
- PRIMARY KEY (brand_id)
- CONSTRAINT uq_brands_1 UNIQUE (name)

#### size_systems (3 cột V1)

- size_system_id BIGINT NOT NULL AUTO_INCREMENT
- code VARCHAR(50) NOT NULL
- name VARCHAR(150) NOT NULL

Ràng buộc V1:
- PRIMARY KEY (size_system_id)
- CONSTRAINT uq_size_systems_1 UNIQUE (code)

#### size_values (5 cột V1)

- size_value_id BIGINT NOT NULL AUTO_INCREMENT
- size_system_id BIGINT NOT NULL
- code VARCHAR(50) NOT NULL
- display_name VARCHAR(100) NOT NULL
- sort_order INT NOT NULL

Ràng buộc V1:
- CONSTRAINT fk_size_values_size_system_id FOREIGN KEY (size_system_id) REFERENCES size_systems (size_system_id)
- PRIMARY KEY (size_value_id)
- CONSTRAINT uq_size_values_1 UNIQUE (size_system_id,code)

#### colors (3 cột V1)

- color_id BIGINT NOT NULL AUTO_INCREMENT
- code VARCHAR(50) NOT NULL
- name VARCHAR(100) NOT NULL

Ràng buộc V1:
- PRIMARY KEY (color_id)
- CONSTRAINT uq_colors_1 UNIQUE (code)

#### products (14 cột V1)

- product_id BIGINT NOT NULL AUTO_INCREMENT
- category_id BIGINT NOT NULL
- brand_id BIGINT NULL
- size_system_id BIGINT NOT NULL
- name VARCHAR(255) NOT NULL
- description TEXT NULL
- gender VARCHAR(50) NULL
- season VARCHAR(80) NULL
- style VARCHAR(100) NULL
- material_care TEXT NULL
- base_price DECIMAL(18,2) NOT NULL
- sale_status VARCHAR(30) NOT NULL
- created_at TIMESTAMP(6) NOT NULL
- updated_at TIMESTAMP(6) NOT NULL

Ràng buộc V1:
- CONSTRAINT fk_products_category_id FOREIGN KEY (category_id) REFERENCES categories (category_id)
- CONSTRAINT fk_products_brand_id FOREIGN KEY (brand_id) REFERENCES brands (brand_id)
- CONSTRAINT fk_products_size_system_id FOREIGN KEY (size_system_id) REFERENCES size_systems (size_system_id)
- CONSTRAINT ck_products_base_price CHECK (base_price >= 0)
- PRIMARY KEY (product_id)

#### product_images (4 cột V1)

- image_id BIGINT NOT NULL AUTO_INCREMENT
- product_id BIGINT NOT NULL
- image_url VARCHAR(1000) NOT NULL
- alt_text VARCHAR(255) NULL

Ràng buộc V1:
- CONSTRAINT fk_product_images_product_id FOREIGN KEY (product_id) REFERENCES products (product_id)
- PRIMARY KEY (image_id)

#### product_variants (9 cột V1)

- variant_id BIGINT NOT NULL AUTO_INCREMENT
- product_id BIGINT NOT NULL
- size_value_id BIGINT NOT NULL
- color_id BIGINT NOT NULL
- sku VARCHAR(100) NULL
- override_price DECIMAL(18,2) NULL
- sale_status VARCHAR(30) NOT NULL
- created_at TIMESTAMP(6) NOT NULL
- updated_at TIMESTAMP(6) NOT NULL

Ràng buộc V1:
- CONSTRAINT fk_product_variants_product_id FOREIGN KEY (product_id) REFERENCES products (product_id)
- CONSTRAINT fk_product_variants_size_value_id FOREIGN KEY (size_value_id) REFERENCES size_values (size_value_id)
- CONSTRAINT fk_product_variants_color_id FOREIGN KEY (color_id) REFERENCES colors (color_id)
- CONSTRAINT ck_product_variants_override_price CHECK (override_price >= 0)
- PRIMARY KEY (variant_id)
- CONSTRAINT uq_product_variants_1 UNIQUE (product_id,size_value_id,color_id)
- CONSTRAINT uq_product_variants_2 UNIQUE (sku)

#### carts (4 cột V1)

- cart_id BIGINT NOT NULL AUTO_INCREMENT
- account_id BIGINT NULL
- created_at TIMESTAMP(6) NOT NULL
- updated_at TIMESTAMP(6) NOT NULL

Ràng buộc V1:
- CONSTRAINT fk_carts_account_id FOREIGN KEY (account_id) REFERENCES accounts (account_id)
- PRIMARY KEY (cart_id)

#### cart_items (4 cột V1)

- cart_item_id BIGINT NOT NULL AUTO_INCREMENT
- cart_id BIGINT NOT NULL
- variant_id BIGINT NOT NULL
- quantity INT NOT NULL

Ràng buộc V1:
- CONSTRAINT fk_cart_items_cart_id FOREIGN KEY (cart_id) REFERENCES carts (cart_id)
- CONSTRAINT fk_cart_items_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants (variant_id)
- CONSTRAINT ck_cart_items_quantity CHECK (quantity > 0)
- PRIMARY KEY (cart_item_id)
- CONSTRAINT uq_cart_items_1 UNIQUE (cart_id,variant_id)

#### vouchers (2 cột V1)

- voucher_id BIGINT NOT NULL AUTO_INCREMENT
- code VARCHAR(80) NOT NULL

Ràng buộc V1:
- PRIMARY KEY (voucher_id)
- CONSTRAINT uq_vouchers_1 UNIQUE (code)

#### orders (18 cột V1)

- order_id BIGINT NOT NULL AUTO_INCREMENT
- order_code VARCHAR(40) NOT NULL
- customer_account_id BIGINT NULL
- recipient_phone VARCHAR(20) NOT NULL
- recipient_email VARCHAR(254) NULL
- recipient_address VARCHAR(500) NOT NULL
- subtotal_snapshot DECIMAL(18,2) NOT NULL
- discount_snapshot DECIMAL(18,2) NOT NULL
- shipping_fee_snapshot DECIMAL(18,2) NOT NULL
- total_snapshot DECIMAL(18,2) NOT NULL
- voucher_id BIGINT NULL
- order_status VARCHAR(30) NOT NULL
- customer_service_note TEXT NULL
- cancel_reason VARCHAR(500) NULL
- completed_at TIMESTAMP(6) NULL
- returned_at TIMESTAMP(6) NULL
- created_at TIMESTAMP(6) NOT NULL
- updated_at TIMESTAMP(6) NOT NULL

Ràng buộc V1:
- CONSTRAINT fk_orders_customer_account_id FOREIGN KEY (customer_account_id) REFERENCES accounts (account_id)
- CONSTRAINT ck_orders_subtotal_snapshot CHECK (subtotal_snapshot >= 0)
- CONSTRAINT ck_orders_discount_snapshot CHECK (discount_snapshot >= 0)
- CONSTRAINT ck_orders_shipping_fee_snapshot CHECK (shipping_fee_snapshot >= 0)
- CONSTRAINT ck_orders_total_snapshot CHECK (total_snapshot >= 0)
- CONSTRAINT fk_orders_voucher_id FOREIGN KEY (voucher_id) REFERENCES vouchers (voucher_id)
- PRIMARY KEY (order_id)
- CONSTRAINT uq_orders_1 UNIQUE (order_code)
- CONSTRAINT ck_orders_rule_1 CHECK (order_status IN ('PENDING','CONFIRMED','PREPARING','SHIPPING','COMPLETED','DELIVERY_FAILED','CANCELLED','RETURNED'))
- CONSTRAINT ck_orders_rule_2 CHECK (voucher_id IS NULL OR customer_account_id IS NOT NULL)

#### order_items (10 cột V1)

- order_item_id BIGINT NOT NULL AUTO_INCREMENT
- order_id BIGINT NOT NULL
- variant_id BIGINT NOT NULL
- product_name_snapshot VARCHAR(255) NOT NULL
- sku_snapshot VARCHAR(100) NULL
- size_snapshot VARCHAR(50) NOT NULL
- color_snapshot VARCHAR(80) NOT NULL
- unit_price_snapshot DECIMAL(18,2) NOT NULL
- quantity INT NOT NULL
- line_total_snapshot DECIMAL(18,2) NOT NULL

Ràng buộc V1:
- CONSTRAINT fk_order_items_order_id FOREIGN KEY (order_id) REFERENCES orders (order_id)
- CONSTRAINT fk_order_items_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants (variant_id)
- CONSTRAINT ck_order_items_unit_price_snapshot CHECK (unit_price_snapshot >= 0)
- CONSTRAINT ck_order_items_quantity CHECK (quantity > 0)
- CONSTRAINT ck_order_items_line_total_snapshot CHECK (line_total_snapshot >= 0)
- PRIMARY KEY (order_item_id)

#### payments (9 cột V1)

- order_id BIGINT NOT NULL
- payment_status VARCHAR(20) NOT NULL
- amount_due DECIMAL(18,2) NOT NULL
- amount_received DECIMAL(18,2) NOT NULL
- amount_refunded DECIMAL(18,2) NOT NULL
- collected_by_account_id BIGINT NULL
- collected_at TIMESTAMP(6) NULL
- refunded_by_account_id BIGINT NULL
- refunded_at TIMESTAMP(6) NULL

Ràng buộc V1:
- CONSTRAINT fk_payments_order_id FOREIGN KEY (order_id) REFERENCES orders (order_id)
- CONSTRAINT ck_payments_amount_due CHECK (amount_due >= 0)
- CONSTRAINT ck_payments_amount_received CHECK (amount_received >= 0)
- CONSTRAINT ck_payments_amount_refunded CHECK (amount_refunded >= 0)
- CONSTRAINT fk_payments_collected_by_account_id FOREIGN KEY (collected_by_account_id) REFERENCES accounts (account_id)
- CONSTRAINT fk_payments_refunded_by_account_id FOREIGN KEY (refunded_by_account_id) REFERENCES accounts (account_id)
- PRIMARY KEY (order_id)
- CONSTRAINT ck_payments_rule_1 CHECK (payment_status IN ('UNPAID','PAID','REFUNDED'))

#### shipping_infos (3 cột V1)

- order_id BIGINT NOT NULL
- delivery_mode VARCHAR(30) NOT NULL
- carrier_name VARCHAR(255) NULL

Ràng buộc V1:
- CONSTRAINT fk_shipping_infos_order_id FOREIGN KEY (order_id) REFERENCES orders (order_id)
- PRIMARY KEY (order_id)

#### suppliers (7 cột V1)

- supplier_id BIGINT NOT NULL AUTO_INCREMENT
- name VARCHAR(255) NOT NULL
- phone VARCHAR(20) NULL
- email VARCHAR(254) NULL
- address VARCHAR(500) NULL
- usage_status VARCHAR(30) NOT NULL
- note VARCHAR(500) NULL

Ràng buộc V1:
- PRIMARY KEY (supplier_id)

#### goods_receipts (11 cột V1)

- receipt_id BIGINT NOT NULL AUTO_INCREMENT
- receipt_code VARCHAR(40) NOT NULL
- supplier_id BIGINT NOT NULL
- receipt_status VARCHAR(20) NOT NULL
- receipt_date DATE NOT NULL
- created_by_account_id BIGINT NOT NULL
- confirmed_by_account_id BIGINT NULL
- confirmed_at TIMESTAMP(6) NULL
- note TEXT NULL
- created_at TIMESTAMP(6) NOT NULL
- updated_at TIMESTAMP(6) NOT NULL

Ràng buộc V1:
- CONSTRAINT fk_goods_receipts_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id)
- CONSTRAINT fk_goods_receipts_created_by_account_id FOREIGN KEY (created_by_account_id) REFERENCES accounts (account_id)
- CONSTRAINT fk_goods_receipts_confirmed_by_account_id FOREIGN KEY (confirmed_by_account_id) REFERENCES accounts (account_id)
- PRIMARY KEY (receipt_id)
- CONSTRAINT uq_goods_receipts_1 UNIQUE (receipt_code)
- CONSTRAINT ck_goods_receipts_rule_1 CHECK (receipt_status IN ('DRAFT','CONFIRMED','CANCELLED'))

#### goods_receipt_items (4 cột V1)

- receipt_item_id BIGINT NOT NULL AUTO_INCREMENT
- receipt_id BIGINT NOT NULL
- variant_id BIGINT NOT NULL
- quantity INT NOT NULL

Ràng buộc V1:
- CONSTRAINT fk_goods_receipt_items_receipt_id FOREIGN KEY (receipt_id) REFERENCES goods_receipts (receipt_id)
- CONSTRAINT fk_goods_receipt_items_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants (variant_id)
- CONSTRAINT ck_goods_receipt_items_quantity CHECK (quantity > 0)
- PRIMARY KEY (receipt_item_id)
- CONSTRAINT uq_goods_receipt_items_1 UNIQUE (receipt_id,variant_id)

#### inventories (3 cột V1)

- variant_id BIGINT NOT NULL
- available_quantity INT NOT NULL
- updated_at TIMESTAMP(6) NOT NULL

Ràng buộc V1:
- CONSTRAINT fk_inventories_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants (variant_id)
- CONSTRAINT ck_inventories_available_quantity CHECK (available_quantity >= 0)
- PRIMARY KEY (variant_id)

#### inventory_transactions (9 cột V1)

- txn_id BIGINT NOT NULL AUTO_INCREMENT
- variant_id BIGINT NOT NULL
- quantity_delta INT NOT NULL
- transaction_type VARCHAR(40) NOT NULL
- order_id BIGINT NULL
- goods_receipt_id BIGINT NULL
- actor_account_id BIGINT NOT NULL
- reason VARCHAR(500) NULL
- created_at TIMESTAMP(6) NOT NULL

Ràng buộc V1:
- CONSTRAINT fk_inventory_transactions_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants (variant_id)
- CONSTRAINT ck_inventory_transactions_quantity_delta CHECK (quantity_delta <> 0)
- CONSTRAINT fk_inventory_transactions_order_id FOREIGN KEY (order_id) REFERENCES orders (order_id)
- CONSTRAINT fk_inventory_transactions_goods_receipt_id FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts (receipt_id)
- CONSTRAINT fk_inventory_transactions_actor_account_id FOREIGN KEY (actor_account_id) REFERENCES accounts (account_id)
- PRIMARY KEY (txn_id)

#### audit_logs (7 cột V1)

- audit_id BIGINT NOT NULL AUTO_INCREMENT
- actor_account_id BIGINT NOT NULL
- action VARCHAR(120) NOT NULL
- target_type VARCHAR(80) NOT NULL
- target_id VARCHAR(80) NOT NULL
- description TEXT NULL
- created_at TIMESTAMP(6) NOT NULL

Ràng buộc V1:
- CONSTRAINT fk_audit_logs_actor_account_id FOREIGN KEY (actor_account_id) REFERENCES accounts (account_id)
- PRIMARY KEY (audit_id)

#### content_pages (6 cột V1)

- page_id BIGINT NOT NULL AUTO_INCREMENT
- page_code VARCHAR(80) NOT NULL
- title VARCHAR(255) NOT NULL
- content TEXT NOT NULL
- updated_by_account_id BIGINT NOT NULL
- updated_at TIMESTAMP(6) NOT NULL

Ràng buộc V1:
- CONSTRAINT fk_content_pages_updated_by_account_id FOREIGN KEY (updated_by_account_id) REFERENCES accounts (account_id)
- PRIMARY KEY (page_id)
- CONSTRAINT uq_content_pages_1 UNIQUE (page_code)

### 3.4 Index được tạo tường minh ở V3/V5

- idx_goods_receipts_supplier_date — goods_receipts(supplier_id, receipt_date).
- idx_goods_receipts_status — goods_receipts(receipt_status).
- idx_goods_receipt_items_variant — goods_receipt_items(variant_id).
- idx_inventory_transactions_variant_created — inventory_transactions(variant_id, created_at).
- idx_inventory_transactions_order — inventory_transactions(order_id).
- idx_inventory_transactions_receipt — inventory_transactions(goods_receipt_id).
- ix_voucher_usage_count — voucher_usages(voucher_id, restored, account_id).

Không có live schema dump trong lượt này; các implicit index do MySQL tạo cho PK/unique/FK chưa được introspect.

### 3.5 Entity mapping và giới hạn test mapping

Có 30 lớp @Entity ánh xạ table và hai bảng @ElementCollection của Voucher:
- Voucher.productIds → voucher_products.
- Voucher.categoryIds → voucher_categories.
- VoucherUsage và CheckoutQuote là entity riêng.
- AccountRoleId và RolePermissionId là composite ID class, không phải entity.

Mapping tiêu biểu:
- product/entity/Product.java → products; giữ base_price, size_system_id, metadata và sale_status.
- product/entity/ProductVariant.java → product_variants; variant_id, product_id, size_value_id, color_id, nullable sku, nullable override_price, sale_status.
- cart/entity/CartItem.java → cart_items; scalar variant_id.
- order/entity/OrderItem.java → order_items; variant_id và snapshot fields; @Immutable.
- inventory/entity/Inventory.java và InventoryTransaction.java → dùng variant_id; ledger @Immutable.
- order/entity/CheckoutQuote.java → quote_id, account_id, fingerprint, expires_at, order_id; không có quote-line table.
- account/entity/Address.java → address_text VARCHAR(500), không phải address có cấu trúc nhiều trường.
- order/entity/Payment.java → một row/order qua shared PK order_id; lưu trạng thái và các số tổng, actor/timestamp, không có event table.
- order/entity/ShippingInfo.java → shared PK order_id, delivery_mode, nullable carrier_name; không có tracking/reference code.

Test persistence đã đọc:
- SchemaMappingTests.domainTablesAndEntitiesMatchApprovedOwnership: kiểm tra ownership/table set, actual tables so với mapped entity + hai collection table, field @Column name và nullability. Không exhaustive cho DB type/length/precision/default/FK/CHECK/index.
- DatabaseConstraintsTests: kiểm tra đại diện CHECK/UNIQUE/FK/state/snapshot, gồm stock không âm, positive quantity, nonzero ledger delta, money không âm, duplicate variant/cart/receipt, invalid state/FK, và giữ image snapshot legacy NULL.
- MigrationTests: Flyway validate; migrate 0 lần; current version 6; no pending.
- CleanMigrationTests: clean migration trên H2 in-memory; có MySQL test conditional theo TEST_DB_DRIVER, chỉ cho host local và tạo database ngẫu nhiên riêng rồi drop trong finally.
- persistence-fixture.sql: fixture cho 28 table V1 cùng bốn table V5.

Các test chưa được chạy local trong phiên này; trạng thái là CI-backed pass trên baseline, local execution blocked.

## 4. Dependency matrix: các concern ERD v2 — P0.3

API IDs tham chiếu docs/04-api-contract.md. Đây là bản đồ dependency để dùng cho phase sau; P0 không sửa bất kỳ entry source nào.

| ERD v2 concern | Current schema | Entity | Repository | Service | Controller/API | Test | Expected impact | Required evidence |
|---|---|---|---|---|---|---|---|---|
| Product parent/child, loại ProductVariant | products, product_variants; size_system/size/color FK | product/entity/Product.java, ProductVariant.java | ProductRepository, ProductVariantRepository | ProductAdminService.createVariants/updateVariant; CatalogVariantReadService; PublicCatalogQueryService | AdminProductController #31–32; PublicCatalogController | CatalogAdminHttpTests, CatalogPublicHttpTests, CatalogMasterDataHttpTests, ProductReadModelHttpTests, SizeSystemConcurrencyTests | Identity/aggregate, write/read path, filters, response DTO | ERD field/key + parent-child status/slug/image rules |
| Variant identity và FK | variant_id được tham chiếu từ cart_items, order_items, goods_receipt_items, inventories, inventory_transactions | CartItem, OrderItem, GoodsReceiptItem, Inventory, InventoryTransaction giữ scalar ID | CartItemRepository, OrderItemRepository, GoodsReceiptItemRepository, InventoryRepository, InventoryTransactionRepository | CartCommandService, OrderCreationService, GoodsReceiptService, InventoryCommandService | Cart #14–18; Order #19–26; inventory #50–57 | cart/order/inventory concurrency; DatabaseConstraintsTests | Cần ánh xạ variant ID cũ sang child product ID ở tất cả consumer | Data ID ranges, mapping table, collision and orphan check |
| Typed attributes | size_systems, size_values, colors, product_variants | SizeSystem, SizeValue, Color, ProductVariant | SizeSystemRepository, SizeValueRepository, ColorRepository, ProductVariantRepository | CatalogMasterDataService, ProductAdminService, PublicCatalogQueryService | AdminCatalogMasterController, PublicCatalogController #27–45 | CatalogMasterDataHttpTests, CatalogPublicHttpTests, SizeSystemConcurrencyTests | Đổi filter/option/validation; bảo toàn code/display/sort/system semantics | ERD + uniqueness/scoping/reuse rules cho option/type |
| Effective price / purchasability | products.base_price, product_variants.override_price; product và variant sale_status | Product, ProductVariant | ProductRepository, ProductVariantRepository | CatalogVariantReadService, PublicCatalogQueryService, CheckoutCalculationService, PromotionCatalogService | catalog/cart/quote/order | catalog, checkout, voucher tests | Giá hiện tại = override nếu non-null, nếu không base price; phải giữ đúng semantics | Quy tắc giá parent/child và status eligibility |
| Cart identity | cart_items.variant_id NOT NULL, unique(cart_id, variant_id) | Cart, CartItem | CartRepository, CartItemRepository | CartCommandService.add/updateQuantity/lockForCheckout; CartQueryService | CartController #14–18 | CartItemHttpTests, CartConcurrencyTests, CartAccessHttpTests | Đổi line key, duplicate/merge và lock behaviour | API contract, duplicate target mapping and cart migration plan |
| Quote fingerprint / expiry | checkout_quotes(quote_id, account_id, fingerprint, expires_at, order_id) | CheckoutQuote | CheckoutQuoteRepository | CheckoutQuoteService, CheckoutQuoteStore.find/requireMatching, OrderCreationService.create | CheckoutController #19, OrderCreationController #20 | CheckoutQuoteHttpTests, CheckoutCartTransactionTests, VoucherCheckoutHttpTests | Fingerprint phụ thuộc variant ID và quote lifetime; cần quyết định cutover strategy | Expired/live quote handling, invalidation, fingerprint and retry semantics |
| Order history | order_items.variant_id FK + name/SKU/size/color/price/quantity/line_total/image snapshots | Order, OrderItem (@Immutable), Payment | OrderItemRepository, OrderRepository, PaymentRepository | OrderCreationService, OrderQueryService, OrderActionService | Order APIs #20–26 | OrderLifecycleHttpTests, OrderStockHttpTests, OrderImageSnapshotHttpTests, OrderConcurrencyTests, OrderHardeningHttpTests | Snapshot phải giữ nguyên; FK history cần mapping có thể trace | FK migration plan and no-backfill rule |
| Inventory / Warehouse / ledger | inventories(variant_id PK, available_quantity); inventory_transactions.variant_id; không có warehouse ID | Inventory, InventoryTransaction (@Immutable), GoodsReceiptItem | InventoryRepository, InventoryTransactionRepository, GoodsReceiptItemRepository | InventoryCommandService (MANDATORY), InventoryAvailabilityService, InventoryAdjustmentService | InventoryController / GoodsReceiptController #50–57 | InventoryAdjustmentHttpTests, InventoryConcurrencyTests, InventoryPhase4TransactionTests, GoodsReceiptHttpTests | Đổi key tồn sang child Product và thêm warehouse; giữ nonnegative/ledger/exactly-once | Default warehouse, availability semantics, locks and history mapping |
| Goods receipt | goods_receipt_items.variant_id; không có unit_cost | GoodsReceipt, GoodsReceiptItem | GoodsReceiptRepository, GoodsReceiptItemRepository | GoodsReceiptService.confirm → InventoryCommandService.receiveGoods | GoodsReceiptController #50–54 | GoodsReceiptHttpTests, InventoryPhase4TransactionTests | Dòng receipt cần trỏ child/warehouse; confirmed receipt immutable | FK mapping, warehouse assignment; không tự thêm unit cost |
| Voucher scope/usage | voucher_products.product_id, voucher_categories.category_id, voucher_usages(order_id PK, voucher_id, account_id, restored) | Voucher, VoucherUsage; two ElementCollection tables | VoucherRepository, VoucherUsageRepository | VoucherManagementService, VoucherRedemptionService (MANDATORY), PromotionCatalogService.eligibleVariants | voucher admin API; quote #19/order #20 | VoucherCheckoutHttpTests, VoucherDiscountTests | Product scope hiện target một product row; child expansion có thể đổi eligibility | Parent-vs-child eligibility and usage/restore semantics |
| Address/recipient | addresses.address_text; orders.recipient_address snapshot VARCHAR(500), no FK address | Address, Order | AddressRepository, OrderRepository | ProfileCommandService, OrderCreationService, OrderEditService | Account APIs #5–7, recipient update | address and order recipient tests | Không parse chắc chắn structured address từ free text; recipient snapshot immutable | Target address fields, null/invalid handling, snapshot semantics |
| Payment/refund | one payments row/order; cumulative amount fields and status; no event table | Payment | PaymentRepository | OrderPaymentService COLLECT_COD/REFUND, OrderActionService | Admin payment-actions API #25 | OrderLifecycleHttpTests, OrderConcurrencyTests | Không dựng event history từ summary row | ERD event/history semantics and mapping for current totals |
| Shipping | shipping_infos shared PK order_id, delivery_mode, nullable carrier_name | ShippingInfo, Order | ShippingInfoRepository, OrderRepository | OrderCreationService/OrderEditService/OrderActionService | Order/admin APIs #20–26 | order create/edit/lifecycle tests | Snapshot/address/shipping relation may change; no tracking currently | Target relationships/cardinality/history semantics |
| Report aggregate | SQL joins order_items → product_variants → products; sales aggregation reads orders/payments | report projections/JDBC, no owning entities | report/repository/ReportRepository | ReportService @Transactional(readOnly=true, REPEATABLE_READ) | ReportController #71 | ReportApiTest, ReportRepositoryTests | Product-performance may group parent, child, or both; avoid double count | Approved revenue and units aggregation rules |
| Images / audit | product_images.product_id; order_items image snapshot nullable; audit target IDs are text | ProductImage, OrderItem, AuditLog | ProductImageRepository, AuditLogRepository | ProductImageAdminService, AuditService | catalog image APIs, audit #70 | ProductImage*Tests, OrderImageSnapshotHttpTests, AuditQueryApiTest | Need choose parent-vs-child images; preserve traceability of old target IDs | Cover/retention policy and audit mapping |
| Public API/DTO | variant_id/size_value_id/color_id in API requests, query filters and response DTOs | ProductVariantDto/AdminVariantDto/CartItem DTO/Order DTO | multiple repositories | services above | docs/04-api-contract.md + product/cart/order/inventory controllers | API and integration contract tests | Identifier/shape changes may break FE/API consumers | Contract/versioning and compatible rollout plan |

### 4.1 Module, transaction, lock and authorization boundaries

- InventoryCommandService uses @Transactional(propagation = Propagation.MANDATORY); single write boundary for sellable stock and immutable ledger. It receives goods, manually adjusts, deducts on order confirmation, restores on cancellation/eligible return, and initializes zero rows.
- AuditService.record requires existing transaction per docs/15/overlap audit; audit is synchronous transactional audit.
- CartCommandService.lockForCheckout is MANDATORY; CheckoutQuoteStore and VoucherRedemptionService are also MANDATORY. These should not be moved to async/non-transactional buses.
- OrderRepository, ProductRepository and VoucherRepository use pessimistic locks where required; InventoryRepository uses guarded atomic updates to prevent negative stock.
- ProductAdminService calls the inventory owning service to initialize zero-row stock, not the foreign repository; Order uses owning inventory/promotion/audit services; cross-module reads use product query services. ReportRepository is the documented direct JDBC read-only exception for aggregates.
- Authorization uses @PreAuthorize at service use cases (e.g. OrderActionService.action, OrderPaymentService.action, product/inventory/voucher mutation paths). Preserve module ownership and policy boundaries.

## 5. Data migration risk and sơ đồ mapping khái niệm — P0.4

Phần này là candidate mapping theo mô tả khái niệm trong yêu cầu; không phải DDL target đã duyệt vì ERD v2 artifact chưa có.

| Dữ liệu hiện có | Mapping cần đánh giá | Rủi ro / quyết định |
|---|---|---|
| product_variants.variant_id | Map old_variant_id → new child product_id bằng mapping tường minh | products.product_id và product_variants.variant_id là hai AI PK riêng; không được mặc định ID không đụng nhau. Collision thực tế chưa đo được. |
| product_variants.product_id | Parent ID hiện tại; mỗi variant có thể thành Product con | Chốt cách cấp ID, phân biệt parent/child và uniqueness trước cutover. |
| size_systems + size_values | Candidate source cho ATTRIBUTE_TYPES / ATTRIBUTES / ATTRIBUTE_OPTIONS | Chốt size system có trở thành attribute type hay không; option uniqueness global hay theo type; giữ code/display/sort và ngăn gộp option chỉ vì label giống. |
| colors | Candidate option values của attribute type Color | Chốt normalized code/name, global option reuse hay scoped option. Không chỉ map bằng label. |
| sku + override_price | Child có thể mang SKU/giá theo rule được phê duyệt | SKU đang nullable; không tự sinh khi NULL. Effective price hiện tại = override nếu có, ngược lại base price; NULL không phải 0. |
| Product metadata | Parent hiện giữ name/description/category/brand/size_system/gender/season/style/material_care/base_price/sale_status | Chưa có inheritance policy field-by-field; slug hiện không tồn tại nên không thể khôi phục nếu target đòi slug. |
| Product images | product_images gắn vào product_id; order image snapshot nullable | Chốt ảnh gắn parent, child hay cả hai; không backfill order_items.image_url_snapshot (V4 và test giữ legacy NULL). |
| Cart items | variant ID → child product ID; giữ quantity | Cần xử lý hai dòng trùng nhau nếu nhiều dòng legacy quy tụ cùng target ID trước khi thêm unique key. |
| Order items | Bảo toàn name/SKU/size/color/price/qty/line total/image snapshots; remap FK có kiểm soát | Không viết lại snapshot từ catalog mới; có thể cần mapping table hoặc giữ legacy reference. |
| inventories.available_quantity | Candidate row cho warehouse_id + child_product_id | Baseline chỉ có one-warehouse logic; không có warehouse ID cũ. Chốt default warehouse và semantics sellable vs physical stock. |
| inventory_transactions | Map identity và giữ delta/type/order/receipt/actor/reason/time | Không có warehouse_id, unit_cost hay physical on-hand; không thể suy ra warehouse/cost lịch sử. |
| GoodsReceipt | Remap goods_receipt_items.variant_id → child ID | Không có unit_cost; confirmed receipt/history và stock ledger phải giữ. |
| Voucher scope | Map product target/category target sang parent/children theo rule đã khóa | Current voucher_products trỏ product_id; phải quyết định voucher target parent có áp dụng mọi child không; giữ voucher_usages/restored. |
| Checkout quote | Giữ quote_id/account/fingerprint/expiry/order link | Fingerprint mang identity variant; phải định nghĩa quote còn hiệu lực lúc cutover và retry; không tạo quote details giả. |
| Addresses / recipient | address_text và recipient_address là text | Không thể parse chắc tỉnh/quận/phường/đường từ text. Không sửa lịch sử; phải quyết định structured-address mapping và giá trị thiếu/unknown. |
| Payment/refund | Map summary row/order and totals/status/actor/time | Không có event-level transaction IDs/historical multiple actions để dựng event log. |
| Shipping | Shared order key + delivery_mode + carrier | Không có tracking/reference history và address FK hiện tại. |
| Audit | target_type/target_id are text | Phải trace legacy target IDs qua mapping, không xóa audit cũ. |
| Report | hiện join item→variant→product | Chốt aggregation parent/child để giữ ổn định doanh thu, số lượng và rank. |

### 5.1 Không thể tái tạo chính xác nếu không có dữ liệu/decision bổ sung

- SKU đang NULL ở một số variant (số lượng chưa xác minh).
- Giá riêng variant NULL nghĩa là fallback về base price, không phải zero.
- Attribute/type identity và scope không thể được xác định chỉ từ label.
- Slug hoặc child field override nếu target đòi field chưa được lưu.
- Warehouse assignment, unit cost/COGS, event payment/refund timeline.
- Structured address từ address string.
- Historical image snapshot đã NULL — không lấy ảnh hiện tại thay thế.
- checkout_quotes không lưu quote line table; fingerprint không phải full quote snapshot.
- Child values riêng cho từng size/color ngoài SKU, override_price, sale_status chưa tồn tại độc lập như Product record.

## 6. Baseline test — P0.5

### 6.1 Commands được khai báo thực tế

| Check | Command/Mechanism | CI tại baseline | Local trong phiên |
|---|---|---|---|
| H2 build + suite | cd backend && ./gradlew --no-daemon clean compileJava test check build | **PASS** — workflow step success | **BLOCKED** — clone thất bại trước Gradle |
| MySQL 8.4 tests/mapping | cd backend && ./gradlew --no-daemon compileJava test check --rerun-tasks với TEST_DB_* | **PASS** — workflow step success | **BLOCKED** — không có checkout/runtime/credentials |
| Flyway validation/version | MigrationTests: validate, migrate executes 0, current version 6, pending 0 | **PASS theo CI job**; test report artifact chưa đọc chi tiết trong phiên | **BLOCKED** |
| Clean migration H2 | CleanMigrationTests.cleanThenMigrateRebuildsAnIsolatedTestDatabase | Test nằm trong H2 suite; job success | **BLOCKED** |
| Clean migration MySQL | CleanMigrationTests.cleanThenMigrateRebuildsAnIsolatedMysqlDatabase; env conditional; localhost-only isolated DB | **PASS theo MySQL suite step** | **BLOCKED** |
| Docker Compose stack | dev-compose-verification.yml validate/build/boot/health | **UNVERIFIED** ở exact SHA | **NOT RUN** |

### 6.2 Phân loại test evidence

- **PASS (remote CI):** H2 build/test/check/build; MySQL compile/test/check + migration/mapping, run 39631789377 tại SHA f931602c86fdf5a59b487d6edd77331b7d64333a.
- **FAIL (baseline test):** không thấy test failure trong run baseline đã kiểm tra; không kết luận mọi run lịch sử đều xanh.
- **BLOCKED (local):** Gradle commands chưa thực thi, không có local exit code/report.
- **UNVERIFIED:** live DB schema/data và exact-SHA dev Compose result.
- Không sửa code/schema để làm xanh baseline.

### 6.3 Regression test inventory cần giữ

- Persistence: SchemaMappingTests, DatabaseConstraintsTests, MigrationTests, CleanMigrationTests, ProductImageOrderingMigrationTests.
- Catalog: CatalogAdminHttpTests, CatalogPublicHttpTests, CatalogMasterDataHttpTests, ProductReadModelHttpTests, SizeSystemConcurrencyTests và các ProductImage*Tests.
- Cart/quote/order: CartItemHttpTests, CartConcurrencyTests, CheckoutQuoteHttpTests, CheckoutCartTransactionTests, OrderLifecycleHttpTests, OrderStockHttpTests, OrderConcurrencyTests, OrderImageSnapshotHttpTests, OrderHardeningHttpTests, VoucherCheckoutHttpTests.
- Inventory/receiving: GoodsReceiptHttpTests, InventoryAdjustmentHttpTests, InventoryConcurrencyTests, InventoryPhase4TransactionTests.
- Promotion/report: VoucherDiscountTests, ReportApiTest, ReportRepositoryTests.
- P1/P2 cần thêm test mapping ID cũ→mới/collision/orphan, child attribute/type validation, warehouse invariants, voucher parent-child scope, report aggregation và concurrency/idempotency sau cutover.

## 7. Findings

Các status mô tả bằng chứng, không đồng nghĩa tự động với bug.

| ID | Severity | Status | Finding / evidence | Impact |
|---|---|---|---|---|
| P0-001 | HIGH | CONFIRMED | variant_id là FK từ cart_items, order_items, goods_receipt_items, inventories, inventory_transactions; tham chiếu xuyên product/cart/order/inventory/promotion/report và API. | Không drop/rename ProductVariant key trước mapping/compatibility plan. |
| P0-002 | HIGH | CONFIRMED | V1–V6 tạo 32 bảng theo DDL, nhưng docs/00, docs/02, docs/03, reference/table-ownership.csv còn ghi 28; Voucher V1/CheckoutQuote đã tồn tại ở V5/docs/15/tests. | Documentation drift; schema baseline phải lấy full migration chain và reconcile docs trong phase phù hợp. |
| P0-003 | HIGH | BLOCKED | Không có ERD v2 artifact trong tree tại SHA f931602c86fdf5a59b487d6edd77331b7d64333a; chỉ có mô tả khái niệm. | Chặn target schema diff và migration design chính xác; P1 nên giải quyết artifact/decisions. |
| P0-004 | HIGH | CONFIRMED | OrderItem snapshots bất biến; image_url_snapshot nullable, V4 không backfill; FK hiện về ProductVariant. | Giữ snapshots; remap FK mà không tái tạo/viết lại lịch sử. |
| P0-005 | HIGH | INFERRED | products.product_id và product_variants.variant_id có hai AI PK độc lập; schema cho phép giá trị trùng giữa hai bảng, nhưng collision thực tế chưa đo. | Không gán variant ID trực tiếp cho child product ID nếu chưa kiểm tra/allocate. |
| P0-006 | HIGH | CONFIRMED | inventories chỉ lưu available_quantity theo variant; không warehouse_id ở inventory/ledger/receipt item, docs đang one-warehouse. | Chốt warehouse mapping và meaning của quantity trước schema expansion. |
| P0-007 | HIGH | CONFIRMED | Address/current recipient là text; payment chỉ có summary row/order và aggregate amounts, không có payment/refund event table. | Không thể khôi phục structured address/event history từ dữ liệu không được lưu. |
| P0-008 | MEDIUM | CONFIRMED | SchemaMappingTests kiểm tra table/column name/nullability nhưng không exhaustive về type/precision/default/FK/CHECK/index; DatabaseConstraintsTests kiểm tra các case đại diện. | Bổ sung schema-diff/constraints regression ở migration phase. |
| P0-009 | MEDIUM | CONFIRMED | CI push allowlist không có branch refactor/p0-baseline-audit; PR trigger vào main + path filter không gồm docs/**. | Report-only push không tự kích hoạt CI; cần workflow dispatch hoặc policy run phù hợp. |
| P0-010 | MEDIUM | CONFIRMED | checkout_quotes lưu fingerprint/expiry/account/order link nhưng không có quote line table; V5 voucher scope target product/category. | Cutover phải xác định quote sống và parent-child voucher eligibility. |
| P0-011 | MEDIUM | CONFIRMED | ReportRepository joins order_items → product_variants → products. | Chốt aggregation by parent/child để tránh double count/changed metrics. |
| P0-012 | MEDIUM | CONFIRMED | Pattern docs ghi baseline af1af690b91f4ba3cfbc70f9f67a21f9d888996f, không phải f931602c86fdf5a59b487d6edd77331b7d64333a; overlap audit dặn parent/child không tự động cần Composite. | Pattern docs là guardrail, không phải bằng chứng target schema/current code. |
| P0-013 | MEDIUM | CONFIRMED | V2 tạo unique phone; comment nêu duplicate phone sẽ làm migration dừng. | Trước migrate database có dữ liệu phải kiểm tra duplicate/null/normalization; không merge account tự động. |
| P0-014 | MEDIUM | UNVERIFIED | Local working tree không quan sát được; clone fail DNS. | Không được tuyên bố local tree clean hay local test pass. |
| P0-015 | MEDIUM | UNVERIFIED | Row counts, NULL SKU/override, ID range collision, current schema constraints chưa được lấy từ DB runtime. | Cần data profile và dry-run trên database copy sanitized trước cutover. |

## 8. Mâu thuẫn tài liệu ↔ migration/code

1. **28 vs 32 tables:** docs/00-source-of-truth.md, docs/02-module-ownership.md, docs/03-data-model.md và reference/table-ownership.csv phản ánh baseline 28 bảng. V5 thêm 4 bảng; SchemaMappingTests và entities/collections đã nhận diện extension. Không được hiểu là cần xóa 4 bảng.
2. **Voucher:** docs/02 và docs/03 vẫn ghi voucher chỉ gồm ID/code. V5 và docs/15-technical-decisions.md mô tả Voucher V1 policy/scope/usage/quote đã được phê duyệt và code hiện tại có implementation.
3. **Schema source:** docs/00 ưu tiên schema DB v1.3.0 cho baseline, nhưng tree ở SHA này không có artifact ERD v2; không dùng authority cũ để bác bỏ ERD v2 user sẽ duyệt.
4. **Pattern evidence:** docs/design-patterns-18-before-after-demo1.md ghi baseline SHA cũ af1af690...; sử dụng guardrails nhưng xác minh class/method ở HEAD hiện tại trước thay đổi.
5. **Inventory:** V3/docs/15 khóa mô hình hiện tại một row per variant và one-warehouse; Warehouse/Product inventory trong ERD v2 là thay đổi semantic/schema, không phải đổi tên đơn thuần.
6. **Address/payment/shipping:** current schema dùng string snapshot và aggregate payment summary, không phải normalized address entity/event ledger. Mapping mới cần quy tắc dữ liệu lịch sử cụ thể.

## 9. Quyết định chưa khóa / gates cho P1

### 9.1 Quyết định dữ liệu/nghiệp vụ

- [ ] Đưa vào repository/context ERD v2 authoritative (diagram/DDL) với table/column/type/length/precision/nullability/default/PK/FK/UQ/CHECK/index/cardinality.
- [ ] Khóa identity/key rule, parent-child discriminator và inheritance/override từng field: name, description, category/brand, slug, price, sale status, image.
- [ ] Khóa semantics khi SKU NULL, override_price NULL, và status của parent/con; không tự sinh SKU/price.
- [ ] Khóa attribute meta-model: ý nghĩa ATTRIBUTE_TYPES, ATTRIBUTES, ATTRIBUTE_OPTIONS, PRODUCT_ATTRIBUTE_VALUES; mapping size_system/size_value/color; uniqueness/reuse scope và sorting.
- [ ] Khóa effective pricing, purchasability, discount và voucher scope parent-vs-child.
- [ ] Khóa warehouse model: một default warehouse hay nhiều kho từ cutover; available vs physical stock; warehouse ID trên receipt/ledger; migration starting balance and lock key.
- [ ] Khóa mapping/retention của old variant ID qua cart/order item/goods receipt/inventory/ledger; collision/orphan query; giữ snapshots và không backfill NULL.
- [ ] Khóa Address structure, giá trị thiếu/không parse được, default address và immutable order recipient snapshot.
- [ ] Khóa Payment/refund history semantics: summary hay event ledger; không suy ra sự kiện chưa từng được lưu.
- [ ] Khóa policy với checkout quote đang sống, fingerprint/version/expiry/invalidation và retry/idempotency guarantee.
- [ ] Chốt API/DTO compatibility/versioning: API hiện có variant_id, size_value_id, color_id; inventory query lọc variant_id.
- [ ] Thu thập data profile từ database copy: row counts, duplicate phone, NULL/duplicate SKU, ID overlap, null price overrides, inventory rows vs variants, FK distribution, order snapshot nulls, live quotes/usage.

### 9.2 Gate kỹ thuật trước migration

- [ ] Thiết kế mapping/staging với uniqueness, count reconciliation và orphan/collision detection; chưa làm trong P0.
- [ ] Rehearse migration trên database copy riêng có rollback/recovery plan; tuyệt đối không thử trên DB đang dùng.
- [ ] Chạy ./gradlew --no-daemon clean compileJava test check build trên feature branch với CI trigger hợp lệ.
- [ ] Chạy MySQL 8.4 migration/schema mapping/constraints; bổ sung assertions types, precision, default, FK/CHECK/index và row mapping cụ thể.
- [ ] Thêm regression giá/tồn kho/voucher/quote/order/payment/address/report, concurrency/idempotency và transactional rollback.
- [ ] Giữ nguyên V1–V6; mọi schema change tạo migration version mới.
- [ ] Giữ module boundaries: Product → Inventory qua owning service; Order → Inventory/Promotion/Audit qua service; không inject repository xuyên module.
- [ ] Không PR/merge cho đến khi P1 quyết định đầy đủ, migration rehearsal và CI pass.

## 10. Giả định, exclusions và giới hạn bằng chứng

- Baseline là tree tại f931602c86fdf5a59b487d6edd77331b7d64333a; không tái dùng SHA lịch sử từ hội thoại cũ.
- Schema inventory là phân tích DDL V1–V6; không khẳng định live DB đang ở version 6.
- Table count 32 = 28 V1 + 4 V5; V3/V4/V6 không thêm table.
- V1 schema được trích từ SQL source; V4 thêm 2 cột (sort_order, image_url_snapshot); V5 thêm 9 cột voucher và 17 cột trên 4 bảng mới.
- Không giả định ID range, actual SKU NULL distribution hoặc row counts.
- Không giả định NULL SKU/override/attribute values có thể tái tạo.
- Không giả định workflow khác đã pass; chỉ CI run exact SHA là bằng chứng.
- Không chạy migration lên DB đang dùng và không sửa V1–V6.
- Clone attempt trên môi trường cô lập exit code 128: fatal: unable to access repository — Could not resolve host: github.com. Đây là blocker môi trường, không phải test failure.
- Không có thay đổi production source/API/schema trong P0; chỉ thêm tài liệu audit trong branch riêng.

## 11. Evidence ledger

| Evidence | Path / identifier | Kết luận hỗ trợ |
|---|---|---|
| Remote baseline | demo1 → f931602c86fdf5a59b487d6edd77331b7d64333a | exact SHA, merge commit/date/parents |
| Feature branch | refactor/p0-baseline-audit | created from exact baseline SHA |
| CI | https://github.com/quangson2809/FIDO/actions/runs/39631789377 | H2 + MySQL step success on baseline SHA |
| Workflow | .github/workflows/backend-verification.yml; .github/workflows/dev-compose-verification.yml | trigger, JDK, Gradle tasks, H2/MySQL/Compose |
| Build config | backend/build.gradle.kts; backend/gradle/wrapper/gradle-wrapper.properties | Java 17, Boot 4.0.3, Gradle 9.3.1, JPA/Flyway/MySQL/H2 |
| Migrations | backend/src/main/resources/db/migration/V1…V6 | complete DDL chain in tree |
| Schema mapping | backend/src/test/java/com/fido/persistence/SchemaMappingTests.java | table ownership/entity/column/nullability assertions |
| Constraints | backend/src/test/java/com/fido/persistence/DatabaseConstraintsTests.java | representative CHECK/FK/UQ/state/snapshot assertions |
| Flyway tests | backend/src/test/java/com/fido/persistence/MigrationTests.java; CleanMigrationTests.java | version/validate/pending and isolated clean/rebuild |
| Test fixtures | backend/src/test/resources/persistence-fixture.sql; application-test.properties | representative current schema fixture, H2 default/env overrides |
| Architecture rules | backend/AGENTS.md; backend/ARCHITECTURE.md; docs/01-architecture-package-structure.md; docs/02-module-ownership.md | modular monolith, ownership and cross-module contracts |
| Business semantics | docs/00-source-of-truth.md; docs/03-data-model.md; docs/06-business-rules-state-machines.md; docs/07-transactions-concurrency-idempotency.md; docs/08-security-rbac-audit.md; docs/10-testing-strategy.md; docs/12-tbd-out-of-scope.md; docs/15-technical-decisions.md | baseline rules, TBD and doc/code drift |
| Pattern guardrails | docs/design-patterns-18-before-after-demo1.md; docs/design-pattern-overlap-audit-demo1.md | candidate-vs-applied and no forced Composite |
| Ownership/API reference | reference/table-ownership.csv; reference/api-baseline-77.csv; reference/api-contract-matrix.csv | current CSV references in repo |
| Environment blocker | isolated clone attempt | DNS error before Gradle; no DB/source mutation |

## 12. Gate decision

**Cho phép bắt đầu P1 với mục tiêu giải quyết/duyệt ERD v2 và khóa các business rules. Chưa cho phép bắt đầu viết hoặc chạy migration theo ERD v2.**

P1 chưa thể được sign off cho tới khi ERD v2 authoritative được đưa vào context/repository, quyết định tại §9.1 được khóa, và kế hoạch kiểm tra mapping được rehearsal trên database copy. Đây là giới hạn bằng chứng/quyết định, không phải sự cho phép để tự thiết kế ERD thay người dùng.
