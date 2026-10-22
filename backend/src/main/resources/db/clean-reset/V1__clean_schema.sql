-- Clean Schema Reset target baseline.
-- Isolated from db/migration until all JPA mappings and API contracts are aligned.
-- Never run against a database that must retain data.
-- Defaults: BIGINT identities, DECIMAL(18,2), TIMESTAMP(6) UTC, restrictive FKs.

CREATE TABLE accounts (
 id BIGINT NOT NULL AUTO_INCREMENT, full_name VARCHAR(150) NOT NULL, email VARCHAR(254) NULL,
 phone VARCHAR(20) NOT NULL, password_hash VARCHAR(255) NOT NULL,
 status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT pk_accounts PRIMARY KEY (id), CONSTRAINT uq_accounts_phone UNIQUE (phone),
 CONSTRAINT ck_accounts_status CHECK (status IN ('ACTIVE','PENDING_APPROVAL','LOCKED','SUSPENDED'))
);

CREATE TABLE addresses (
 id BIGINT NOT NULL AUTO_INCREMENT, account_id BIGINT NOT NULL, recipient_name VARCHAR(150) NOT NULL,
 recipient_phone VARCHAR(20) NOT NULL, province VARCHAR(120) NOT NULL, district VARCHAR(120) NOT NULL,
 ward VARCHAR(120) NOT NULL, address_line VARCHAR(500) NOT NULL, is_default BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT pk_addresses PRIMARY KEY (id),
 CONSTRAINT fk_addresses_account FOREIGN KEY (account_id) REFERENCES accounts (id)
);
CREATE INDEX ix_addresses_account_default ON addresses (account_id, is_default);

CREATE TABLE roles (
 id BIGINT NOT NULL AUTO_INCREMENT, code VARCHAR(80) NOT NULL, name VARCHAR(150) NOT NULL,
 description VARCHAR(500) NULL, status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
 CONSTRAINT pk_roles PRIMARY KEY (id), CONSTRAINT uq_roles_code UNIQUE (code),
 CONSTRAINT ck_roles_status CHECK (status IN ('ACTIVE','INACTIVE'))
);

CREATE TABLE permissions (
 id BIGINT NOT NULL AUTO_INCREMENT, code VARCHAR(120) NOT NULL, name VARCHAR(200) NOT NULL,
 description VARCHAR(500) NULL, CONSTRAINT pk_permissions PRIMARY KEY (id),
 CONSTRAINT uq_permissions_code UNIQUE (code)
);

CREATE TABLE account_roles (
 account_id BIGINT NOT NULL, role_id BIGINT NOT NULL,
 CONSTRAINT pk_account_roles PRIMARY KEY (account_id, role_id),
 CONSTRAINT fk_account_roles_account FOREIGN KEY (account_id) REFERENCES accounts (id),
 CONSTRAINT fk_account_roles_role FOREIGN KEY (role_id) REFERENCES roles (id)
);

CREATE TABLE role_permissions (
 role_id BIGINT NOT NULL, permission_id BIGINT NOT NULL,
 CONSTRAINT pk_role_permissions PRIMARY KEY (role_id, permission_id),
 CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles (id),
 CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions (id)
);

CREATE TABLE categories (
 id BIGINT NOT NULL AUTO_INCREMENT, parent_category_id BIGINT NULL, name VARCHAR(150) NOT NULL,
 slug VARCHAR(180) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT pk_categories PRIMARY KEY (id), CONSTRAINT uq_categories_slug UNIQUE (slug),
 CONSTRAINT fk_categories_parent FOREIGN KEY (parent_category_id) REFERENCES categories (id),
 CONSTRAINT ck_categories_status CHECK (status IN ('ACTIVE','INACTIVE'))
);
CREATE INDEX ix_categories_parent ON categories (parent_category_id);

CREATE TABLE brands (
 id BIGINT NOT NULL AUTO_INCREMENT, name VARCHAR(150) NOT NULL, slug VARCHAR(180) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', CONSTRAINT pk_brands PRIMARY KEY (id),
 CONSTRAINT uq_brands_slug UNIQUE (slug),
 CONSTRAINT ck_brands_status CHECK (status IN ('ACTIVE','INACTIVE'))
);

CREATE TABLE attribute_types (
 id BIGINT NOT NULL AUTO_INCREMENT, code VARCHAR(80) NOT NULL, name VARCHAR(150) NOT NULL,
 data_type VARCHAR(20) NOT NULL, CONSTRAINT pk_attribute_types PRIMARY KEY (id),
 CONSTRAINT uq_attribute_types_code UNIQUE (code),
 CONSTRAINT ck_attribute_types_data_type CHECK (data_type IN ('OPTION','TEXT','NUMBER','BOOLEAN'))
);

CREATE TABLE attributes (
 id BIGINT NOT NULL AUTO_INCREMENT, attribute_type_id BIGINT NOT NULL, code VARCHAR(80) NOT NULL,
 name VARCHAR(150) NOT NULL, is_required BOOLEAN NOT NULL DEFAULT FALSE,
 is_variant_defining BOOLEAN NOT NULL DEFAULT FALSE, sort_order INT NOT NULL DEFAULT 0,
 CONSTRAINT pk_attributes PRIMARY KEY (id), CONSTRAINT uq_attributes_code UNIQUE (code),
 CONSTRAINT fk_attributes_type FOREIGN KEY (attribute_type_id) REFERENCES attribute_types (id),
 CONSTRAINT ck_attributes_sort_order CHECK (sort_order >= 0)
);
CREATE INDEX ix_attributes_type_order ON attributes (attribute_type_id, sort_order);

CREATE TABLE attribute_options (
 id BIGINT NOT NULL AUTO_INCREMENT, attribute_id BIGINT NOT NULL, `value` VARCHAR(120) NOT NULL,
 label VARCHAR(150) NOT NULL, sort_order INT NOT NULL DEFAULT 0,
 CONSTRAINT pk_attribute_options PRIMARY KEY (id),
 CONSTRAINT uq_attribute_options_value UNIQUE (attribute_id, `value`),
 CONSTRAINT uq_attribute_options_id_attribute UNIQUE (id, attribute_id),
 CONSTRAINT fk_attribute_options_attribute FOREIGN KEY (attribute_id) REFERENCES attributes (id),
 CONSTRAINT ck_attribute_options_sort_order CHECK (sort_order >= 0)
);
CREATE INDEX ix_attribute_options_order ON attribute_options (attribute_id, sort_order);

CREATE TABLE products (
 id BIGINT NOT NULL AUTO_INCREMENT, parent_product_id BIGINT NULL, category_id BIGINT NULL, brand_id BIGINT NULL,
 name VARCHAR(255) NULL, slug VARCHAR(200) NULL, sku VARCHAR(100) NOT NULL, description TEXT NULL,
 selling_price DECIMAL(18,2) NULL, cost_price DECIMAL(18,2) NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', deleted_at TIMESTAMP(6) NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT pk_products PRIMARY KEY (id), CONSTRAINT uq_products_sku UNIQUE (sku),
 CONSTRAINT fk_products_parent FOREIGN KEY (parent_product_id) REFERENCES products (id),
 CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id),
 CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands (id),
 CONSTRAINT ck_products_not_self_parent CHECK (parent_product_id IS NULL OR parent_product_id <> id),
 CONSTRAINT ck_products_selling_price CHECK (selling_price IS NULL OR selling_price >= 0),
 CONSTRAINT ck_products_cost_price CHECK (cost_price IS NULL OR cost_price >= 0),
 CONSTRAINT ck_products_status CHECK (status IN ('DRAFT','ACTIVE','INACTIVE','ARCHIVED'))
);
CREATE INDEX ix_products_parent ON products (parent_product_id);
CREATE INDEX ix_products_category_status ON products (category_id, status);
CREATE INDEX ix_products_brand ON products (brand_id);

CREATE TABLE product_attribute_values (
 product_id BIGINT NOT NULL, attribute_id BIGINT NOT NULL, option_id BIGINT NULL,
 text_value VARCHAR(1000) NULL, number_value DECIMAL(18,4) NULL, boolean_value BOOLEAN NULL,
 CONSTRAINT pk_product_attribute_values PRIMARY KEY (product_id, attribute_id),
 CONSTRAINT fk_product_attribute_values_product FOREIGN KEY (product_id) REFERENCES products (id),
 CONSTRAINT fk_product_attribute_values_attribute FOREIGN KEY (attribute_id) REFERENCES attributes (id),
 CONSTRAINT fk_product_attribute_values_option_attribute FOREIGN KEY (option_id, attribute_id)
   REFERENCES attribute_options (id, attribute_id),
 CONSTRAINT ck_product_attribute_values_one_value CHECK (
  (option_id IS NOT NULL AND text_value IS NULL AND number_value IS NULL AND boolean_value IS NULL)
  OR (option_id IS NULL AND text_value IS NOT NULL AND number_value IS NULL AND boolean_value IS NULL)
  OR (option_id IS NULL AND text_value IS NULL AND number_value IS NOT NULL AND boolean_value IS NULL)
  OR (option_id IS NULL AND text_value IS NULL AND number_value IS NULL AND boolean_value IS NOT NULL)
 )
);
CREATE INDEX ix_product_attribute_values_attribute ON product_attribute_values (attribute_id, option_id);

CREATE TABLE product_images (
 id BIGINT NOT NULL AUTO_INCREMENT, product_id BIGINT NOT NULL, image_url VARCHAR(1000) NOT NULL,
 is_primary BOOLEAN NOT NULL DEFAULT FALSE, sort_order INT NOT NULL DEFAULT 0,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT pk_product_images PRIMARY KEY (id),
 CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products (id),
 CONSTRAINT ck_product_images_sort_order CHECK (sort_order >= 0)
);
CREATE INDEX ix_product_images_product_order ON product_images (product_id, sort_order);

CREATE TABLE carts (
 id BIGINT NOT NULL AUTO_INCREMENT, account_id BIGINT NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT pk_carts PRIMARY KEY (id), CONSTRAINT fk_carts_account FOREIGN KEY (account_id) REFERENCES accounts (id),
 CONSTRAINT ck_carts_status CHECK (status IN ('OPEN','CHECKOUT','COMPLETED','ABANDONED'))
);
CREATE INDEX ix_carts_account_status ON carts (account_id, status);

CREATE TABLE cart_items (
 id BIGINT NOT NULL AUTO_INCREMENT, cart_id BIGINT NOT NULL, product_id BIGINT NOT NULL, quantity INT NOT NULL,
 added_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT pk_cart_items PRIMARY KEY (id), CONSTRAINT uq_cart_items_cart_product UNIQUE (cart_id, product_id),
 CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts (id),
 CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES products (id),
 CONSTRAINT ck_cart_items_quantity CHECK (quantity > 0)
);

CREATE TABLE vouchers (
 id BIGINT NOT NULL AUTO_INCREMENT, code VARCHAR(80) NOT NULL, discount_type VARCHAR(20) NOT NULL,
 discount_value DECIMAL(18,2) NOT NULL, minimum_order_value DECIMAL(18,2) NOT NULL DEFAULT 0,
 maximum_discount DECIMAL(18,2) NULL, starts_at TIMESTAMP(6) NULL, ends_at TIMESTAMP(6) NULL,
 usage_limit INT NULL, status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
 CONSTRAINT pk_vouchers PRIMARY KEY (id), CONSTRAINT uq_vouchers_code UNIQUE (code),
 CONSTRAINT ck_vouchers_discount_type CHECK (discount_type IN ('PERCENT','FIXED')),
 CONSTRAINT ck_vouchers_discount_value CHECK (discount_value > 0),
 CONSTRAINT ck_vouchers_minimum_order CHECK (minimum_order_value >= 0),
 CONSTRAINT ck_vouchers_maximum_discount CHECK (maximum_discount IS NULL OR maximum_discount >= 0),
 CONSTRAINT ck_vouchers_usage_limit CHECK (usage_limit IS NULL OR usage_limit > 0),
 CONSTRAINT ck_vouchers_window CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at),
 CONSTRAINT ck_vouchers_status CHECK (status IN ('DRAFT','ACTIVE','INACTIVE','EXPIRED'))
);

CREATE TABLE orders (
 id BIGINT NOT NULL AUTO_INCREMENT, account_id BIGINT NOT NULL, voucher_id BIGINT NULL,
 order_number VARCHAR(40) NOT NULL, idempotency_key VARCHAR(120) NOT NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'PENDING', subtotal DECIMAL(18,2) NOT NULL,
 discount_amount DECIMAL(18,2) NOT NULL DEFAULT 0, shipping_fee DECIMAL(18,2) NOT NULL DEFAULT 0,
 total_amount DECIMAL(18,2) NOT NULL, currency CHAR(3) NOT NULL DEFAULT 'VND',
 placed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT pk_orders PRIMARY KEY (id), CONSTRAINT uq_orders_number UNIQUE (order_number),
 CONSTRAINT uq_orders_idempotency_key UNIQUE (idempotency_key),
 CONSTRAINT fk_orders_account FOREIGN KEY (account_id) REFERENCES accounts (id),
 CONSTRAINT fk_orders_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers (id),
 CONSTRAINT ck_orders_status CHECK (status IN ('PENDING','CONFIRMED','PREPARING','SHIPPING','COMPLETED','DELIVERY_FAILED','CANCELLED','RETURNED')),
 CONSTRAINT ck_orders_subtotal CHECK (subtotal >= 0),
 CONSTRAINT ck_orders_discount CHECK (discount_amount >= 0 AND discount_amount <= subtotal),
 CONSTRAINT ck_orders_shipping_fee CHECK (shipping_fee >= 0),
 CONSTRAINT ck_orders_total CHECK (total_amount >= 0 AND total_amount = subtotal - discount_amount + shipping_fee),
 CONSTRAINT ck_orders_currency CHECK (currency = 'VND')
);
CREATE INDEX ix_orders_account_placed ON orders (account_id, placed_at);
CREATE INDEX ix_orders_status_placed ON orders (status, placed_at);

CREATE TABLE order_items (
 id BIGINT NOT NULL AUTO_INCREMENT, order_id BIGINT NOT NULL, product_id BIGINT NOT NULL,
 sku_snapshot VARCHAR(100) NOT NULL, product_name_snapshot VARCHAR(255) NOT NULL,
 attribute_snapshot VARCHAR(2000) NOT NULL DEFAULT '{}', quantity INT NOT NULL,
 unit_price DECIMAL(18,2) NOT NULL, discount_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
 line_total DECIMAL(18,2) NOT NULL, CONSTRAINT pk_order_items PRIMARY KEY (id),
 CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders (id),
 CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products (id),
 CONSTRAINT ck_order_items_quantity CHECK (quantity > 0),
 CONSTRAINT ck_order_items_unit_price CHECK (unit_price >= 0),
 CONSTRAINT ck_order_items_discount CHECK (discount_amount >= 0 AND discount_amount <= unit_price * quantity),
 CONSTRAINT ck_order_items_line_total CHECK (line_total = unit_price * quantity - discount_amount)
);
CREATE INDEX ix_order_items_order ON order_items (order_id);
CREATE INDEX ix_order_items_product ON order_items (product_id);

CREATE TABLE order_addresses (
 order_id BIGINT NOT NULL, recipient_name VARCHAR(150) NOT NULL, recipient_phone VARCHAR(20) NOT NULL,
 province VARCHAR(120) NOT NULL, district VARCHAR(120) NOT NULL, ward VARCHAR(120) NOT NULL,
 address_line VARCHAR(500) NOT NULL, CONSTRAINT pk_order_addresses PRIMARY KEY (order_id),
 CONSTRAINT fk_order_addresses_order FOREIGN KEY (order_id) REFERENCES orders (id)
);

CREATE TABLE order_voucher_snapshots (
 order_id BIGINT NOT NULL, voucher_code_snapshot VARCHAR(80) NOT NULL,
 discount_type_snapshot VARCHAR(20) NOT NULL, discount_value_snapshot DECIMAL(18,2) NOT NULL,
 discount_amount_snapshot DECIMAL(18,2) NOT NULL,
 CONSTRAINT pk_order_voucher_snapshots PRIMARY KEY (order_id),
 CONSTRAINT fk_order_voucher_snapshots_order FOREIGN KEY (order_id) REFERENCES orders (id),
 CONSTRAINT ck_order_voucher_discount_type CHECK (discount_type_snapshot IN ('PERCENT','FIXED')),
 CONSTRAINT ck_order_voucher_discount_value CHECK (discount_value_snapshot > 0),
 CONSTRAINT ck_order_voucher_discount_amount CHECK (discount_amount_snapshot >= 0)
);

CREATE TABLE payments (
 order_id BIGINT NOT NULL, method VARCHAR(30) NOT NULL DEFAULT 'COD',
 payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID', amount DECIMAL(18,2) NOT NULL,
 currency CHAR(3) NOT NULL DEFAULT 'VND', collected_by_account_id BIGINT NULL,
 collected_at TIMESTAMP(6) NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT pk_payments PRIMARY KEY (order_id),
 CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders (id),
 CONSTRAINT fk_payments_collected_by FOREIGN KEY (collected_by_account_id) REFERENCES accounts (id),
 CONSTRAINT ck_payments_method CHECK (method = 'COD'),
 CONSTRAINT ck_payments_status CHECK (payment_status IN ('UNPAID','PAID','REFUNDED')),
 CONSTRAINT ck_payments_amount CHECK (amount >= 0), CONSTRAINT ck_payments_currency CHECK (currency = 'VND')
);

CREATE TABLE shipping_infos (
 order_id BIGINT NOT NULL, recipient_name VARCHAR(150) NOT NULL, recipient_phone VARCHAR(20) NOT NULL,
 carrier_name VARCHAR(150) NULL, tracking_number VARCHAR(120) NULL,
 shipping_status VARCHAR(20) NOT NULL DEFAULT 'PENDING', shipped_at TIMESTAMP(6) NULL,
 delivered_at TIMESTAMP(6) NULL, updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT pk_shipping_infos PRIMARY KEY (order_id),
 CONSTRAINT fk_shipping_infos_order FOREIGN KEY (order_id) REFERENCES orders (id),
 CONSTRAINT ck_shipping_infos_status CHECK (shipping_status IN ('PENDING','SHIPPED','DELIVERED','FAILED','CANCELLED'))
);

CREATE TABLE suppliers (
 id BIGINT NOT NULL AUTO_INCREMENT, code VARCHAR(80) NOT NULL, name VARCHAR(255) NOT NULL,
 phone VARCHAR(20) NULL, email VARCHAR(254) NULL, status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT pk_suppliers PRIMARY KEY (id), CONSTRAINT uq_suppliers_code UNIQUE (code),
 CONSTRAINT ck_suppliers_status CHECK (status IN ('ACTIVE','INACTIVE'))
);

CREATE TABLE goods_receipts (
 id BIGINT NOT NULL AUTO_INCREMENT, supplier_id BIGINT NOT NULL, receipt_number VARCHAR(40) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', created_by BIGINT NOT NULL, confirmed_by BIGINT NULL,
 confirmed_at TIMESTAMP(6) NULL, created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT pk_goods_receipts PRIMARY KEY (id), CONSTRAINT uq_goods_receipts_number UNIQUE (receipt_number),
 CONSTRAINT fk_goods_receipts_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
 CONSTRAINT fk_goods_receipts_created_by FOREIGN KEY (created_by) REFERENCES accounts (id),
 CONSTRAINT fk_goods_receipts_confirmed_by FOREIGN KEY (confirmed_by) REFERENCES accounts (id),
 CONSTRAINT ck_goods_receipts_status CHECK (status IN ('DRAFT','CONFIRMED','CANCELLED'))
);
CREATE INDEX ix_goods_receipts_supplier_date ON goods_receipts (supplier_id, created_at);

CREATE TABLE goods_receipt_items (
 id BIGINT NOT NULL AUTO_INCREMENT, goods_receipt_id BIGINT NOT NULL, product_id BIGINT NOT NULL,
 quantity_received INT NOT NULL, unit_cost DECIMAL(18,2) NOT NULL,
 CONSTRAINT pk_goods_receipt_items PRIMARY KEY (id),
 CONSTRAINT uq_goods_receipt_items_receipt_product UNIQUE (goods_receipt_id, product_id),
 CONSTRAINT fk_goods_receipt_items_receipt FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts (id),
 CONSTRAINT fk_goods_receipt_items_product FOREIGN KEY (product_id) REFERENCES products (id),
 CONSTRAINT ck_goods_receipt_items_quantity CHECK (quantity_received > 0),
 CONSTRAINT ck_goods_receipt_items_unit_cost CHECK (unit_cost >= 0)
);
CREATE INDEX ix_goods_receipt_items_product ON goods_receipt_items (product_id);

CREATE TABLE warehouses (
 id BIGINT NOT NULL AUTO_INCREMENT, code VARCHAR(80) NOT NULL, name VARCHAR(150) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', CONSTRAINT pk_warehouses PRIMARY KEY (id),
 CONSTRAINT uq_warehouses_code UNIQUE (code),
 CONSTRAINT ck_warehouses_status CHECK (status IN ('ACTIVE','INACTIVE'))
);

CREATE TABLE inventories (
 warehouse_id BIGINT NOT NULL, product_id BIGINT NOT NULL,
 quantity_on_hand INT NOT NULL DEFAULT 0, version INT NOT NULL DEFAULT 0,
 updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT pk_inventories PRIMARY KEY (warehouse_id, product_id),
 CONSTRAINT fk_inventories_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id),
 CONSTRAINT fk_inventories_product FOREIGN KEY (product_id) REFERENCES products (id),
 CONSTRAINT ck_inventories_quantity CHECK (quantity_on_hand >= 0),
 CONSTRAINT ck_inventories_version CHECK (version >= 0)
);
CREATE INDEX ix_inventories_product ON inventories (product_id);

CREATE TABLE inventory_transactions (
 id BIGINT NOT NULL AUTO_INCREMENT, warehouse_id BIGINT NOT NULL, product_id BIGINT NOT NULL,
 transaction_type VARCHAR(30) NOT NULL, quantity_delta INT NOT NULL,
 goods_receipt_item_id BIGINT NULL, order_item_id BIGINT NULL,
 idempotency_key VARCHAR(120) NOT NULL, created_by BIGINT NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT pk_inventory_transactions PRIMARY KEY (id),
 CONSTRAINT uq_inventory_transactions_idempotency UNIQUE (idempotency_key),
 CONSTRAINT fk_inventory_transactions_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id),
 CONSTRAINT fk_inventory_transactions_product FOREIGN KEY (product_id) REFERENCES products (id),
 CONSTRAINT fk_inventory_transactions_receipt_item FOREIGN KEY (goods_receipt_item_id) REFERENCES goods_receipt_items (id),
 CONSTRAINT fk_inventory_transactions_order_item FOREIGN KEY (order_item_id) REFERENCES order_items (id),
 CONSTRAINT fk_inventory_transactions_created_by FOREIGN KEY (created_by) REFERENCES accounts (id),
 CONSTRAINT ck_inventory_transactions_type CHECK (transaction_type IN ('OPENING','GOODS_RECEIPT','ORDER','ADJUSTMENT')),
 CONSTRAINT ck_inventory_transactions_delta CHECK (quantity_delta <> 0)
);
CREATE INDEX ix_inventory_transactions_balance_time ON inventory_transactions (warehouse_id, product_id, created_at);

CREATE TABLE audit_logs (
 id BIGINT NOT NULL AUTO_INCREMENT, actor_account_id BIGINT NULL, action VARCHAR(120) NOT NULL,
 entity_type VARCHAR(80) NOT NULL, entity_id VARCHAR(100) NOT NULL, before_data JSON NULL,
 after_data JSON NULL, correlation_id VARCHAR(120) NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT pk_audit_logs PRIMARY KEY (id),
 CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_account_id) REFERENCES accounts (id)
);
CREATE INDEX ix_audit_logs_actor_time ON audit_logs (actor_account_id, created_at);
CREATE INDEX ix_audit_logs_entity_time ON audit_logs (entity_type, entity_id, created_at);

CREATE TABLE content_pages (
 id BIGINT NOT NULL AUTO_INCREMENT, slug VARCHAR(180) NOT NULL, title VARCHAR(255) NOT NULL,
 content TEXT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', updated_by BIGINT NULL,
 updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT pk_content_pages PRIMARY KEY (id), CONSTRAINT uq_content_pages_slug UNIQUE (slug),
 CONSTRAINT fk_content_pages_updated_by FOREIGN KEY (updated_by) REFERENCES accounts (id),
 CONSTRAINT ck_content_pages_status CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED'))
);
