-- DD-DB-01 v1.3.0, section 5: exactly 28 domain tables.
-- Foreign keys intentionally have no cascading deletes.
-- MySQL target must enforce CHECK constraints (8.0.16+).

CREATE TABLE accounts (
    account_id BIGINT NOT NULL AUTO_INCREMENT,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(254) NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (account_id)
);

CREATE TABLE addresses (
    address_id BIGINT NOT NULL AUTO_INCREMENT,
    account_id BIGINT NOT NULL,
    CONSTRAINT fk_addresses_account_id FOREIGN KEY (account_id) REFERENCES accounts (account_id),
    address_text VARCHAR(500) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (address_id)
);

CREATE TABLE roles (
    role_id BIGINT NOT NULL AUTO_INCREMENT,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(500) NULL,
    PRIMARY KEY (role_id),
    CONSTRAINT uq_roles_1 UNIQUE (code)
);

CREATE TABLE permissions (
    permission_id BIGINT NOT NULL AUTO_INCREMENT,
    code VARCHAR(120) NOT NULL,
    name VARCHAR(200) NOT NULL,
    PRIMARY KEY (permission_id),
    CONSTRAINT uq_permissions_1 UNIQUE (code)
);

CREATE TABLE account_roles (
    account_id BIGINT NOT NULL,
    CONSTRAINT fk_account_roles_account_id FOREIGN KEY (account_id) REFERENCES accounts (account_id),
    role_id BIGINT NOT NULL,
    CONSTRAINT fk_account_roles_role_id FOREIGN KEY (role_id) REFERENCES roles (role_id),
    PRIMARY KEY (account_id, role_id)
);

CREATE TABLE role_permissions (
    role_id BIGINT NOT NULL,
    CONSTRAINT fk_role_permissions_role_id FOREIGN KEY (role_id) REFERENCES roles (role_id),
    permission_id BIGINT NOT NULL,
    CONSTRAINT fk_role_permissions_permission_id FOREIGN KEY (permission_id) REFERENCES permissions (permission_id),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE categories (
    category_id BIGINT NOT NULL AUTO_INCREMENT,
    parent_category_id BIGINT NULL,
    CONSTRAINT fk_categories_parent_category_id FOREIGN KEY (parent_category_id) REFERENCES categories (category_id),
    name VARCHAR(150) NOT NULL,
    PRIMARY KEY (category_id)
);

CREATE TABLE brands (
    brand_id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    PRIMARY KEY (brand_id),
    CONSTRAINT uq_brands_1 UNIQUE (name)
);

CREATE TABLE size_systems (
    size_system_id BIGINT NOT NULL AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    PRIMARY KEY (size_system_id),
    CONSTRAINT uq_size_systems_1 UNIQUE (code)
);

CREATE TABLE size_values (
    size_value_id BIGINT NOT NULL AUTO_INCREMENT,
    size_system_id BIGINT NOT NULL,
    CONSTRAINT fk_size_values_size_system_id FOREIGN KEY (size_system_id) REFERENCES size_systems (size_system_id),
    code VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL,
    PRIMARY KEY (size_value_id),
    CONSTRAINT uq_size_values_1 UNIQUE (size_system_id,code)
);

CREATE TABLE colors (
    color_id BIGINT NOT NULL AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (color_id),
    CONSTRAINT uq_colors_1 UNIQUE (code)
);

CREATE TABLE products (
    product_id BIGINT NOT NULL AUTO_INCREMENT,
    category_id BIGINT NOT NULL,
    CONSTRAINT fk_products_category_id FOREIGN KEY (category_id) REFERENCES categories (category_id),
    brand_id BIGINT NULL,
    CONSTRAINT fk_products_brand_id FOREIGN KEY (brand_id) REFERENCES brands (brand_id),
    size_system_id BIGINT NOT NULL,
    CONSTRAINT fk_products_size_system_id FOREIGN KEY (size_system_id) REFERENCES size_systems (size_system_id),
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    gender VARCHAR(50) NULL,
    season VARCHAR(80) NULL,
    style VARCHAR(100) NULL,
    material_care TEXT NULL,
    base_price DECIMAL(18,2) NOT NULL,
    CONSTRAINT ck_products_base_price CHECK (base_price >= 0),
    sale_status VARCHAR(30) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (product_id)
);

CREATE TABLE product_images (
    image_id BIGINT NOT NULL AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    CONSTRAINT fk_product_images_product_id FOREIGN KEY (product_id) REFERENCES products (product_id),
    image_url VARCHAR(1000) NOT NULL,
    alt_text VARCHAR(255) NULL,
    PRIMARY KEY (image_id)
);

CREATE TABLE product_variants (
    variant_id BIGINT NOT NULL AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    CONSTRAINT fk_product_variants_product_id FOREIGN KEY (product_id) REFERENCES products (product_id),
    size_value_id BIGINT NOT NULL,
    CONSTRAINT fk_product_variants_size_value_id FOREIGN KEY (size_value_id) REFERENCES size_values (size_value_id),
    color_id BIGINT NOT NULL,
    CONSTRAINT fk_product_variants_color_id FOREIGN KEY (color_id) REFERENCES colors (color_id),
    sku VARCHAR(100) NULL,
    override_price DECIMAL(18,2) NULL,
    CONSTRAINT ck_product_variants_override_price CHECK (override_price >= 0),
    sale_status VARCHAR(30) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (variant_id),
    CONSTRAINT uq_product_variants_1 UNIQUE (product_id,size_value_id,color_id),
    CONSTRAINT uq_product_variants_2 UNIQUE (sku)
);

CREATE TABLE carts (
    cart_id BIGINT NOT NULL AUTO_INCREMENT,
    account_id BIGINT NULL,
    CONSTRAINT fk_carts_account_id FOREIGN KEY (account_id) REFERENCES accounts (account_id),
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (cart_id)
);

CREATE TABLE cart_items (
    cart_item_id BIGINT NOT NULL AUTO_INCREMENT,
    cart_id BIGINT NOT NULL,
    CONSTRAINT fk_cart_items_cart_id FOREIGN KEY (cart_id) REFERENCES carts (cart_id),
    variant_id BIGINT NOT NULL,
    CONSTRAINT fk_cart_items_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants (variant_id),
    quantity INT NOT NULL,
    CONSTRAINT ck_cart_items_quantity CHECK (quantity > 0),
    PRIMARY KEY (cart_item_id),
    CONSTRAINT uq_cart_items_1 UNIQUE (cart_id,variant_id)
);

CREATE TABLE vouchers (
    voucher_id BIGINT NOT NULL AUTO_INCREMENT,
    code VARCHAR(80) NOT NULL,
    PRIMARY KEY (voucher_id),
    CONSTRAINT uq_vouchers_1 UNIQUE (code)
);

CREATE TABLE orders (
    order_id BIGINT NOT NULL AUTO_INCREMENT,
    order_code VARCHAR(40) NOT NULL,
    customer_account_id BIGINT NULL,
    CONSTRAINT fk_orders_customer_account_id FOREIGN KEY (customer_account_id) REFERENCES accounts (account_id),
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_email VARCHAR(254) NULL,
    recipient_address VARCHAR(500) NOT NULL,
    subtotal_snapshot DECIMAL(18,2) NOT NULL,
    CONSTRAINT ck_orders_subtotal_snapshot CHECK (subtotal_snapshot >= 0),
    discount_snapshot DECIMAL(18,2) NOT NULL,
    CONSTRAINT ck_orders_discount_snapshot CHECK (discount_snapshot >= 0),
    shipping_fee_snapshot DECIMAL(18,2) NOT NULL,
    CONSTRAINT ck_orders_shipping_fee_snapshot CHECK (shipping_fee_snapshot >= 0),
    total_snapshot DECIMAL(18,2) NOT NULL,
    CONSTRAINT ck_orders_total_snapshot CHECK (total_snapshot >= 0),
    voucher_id BIGINT NULL,
    CONSTRAINT fk_orders_voucher_id FOREIGN KEY (voucher_id) REFERENCES vouchers (voucher_id),
    order_status VARCHAR(30) NOT NULL,
    customer_service_note TEXT NULL,
    cancel_reason VARCHAR(500) NULL,
    completed_at TIMESTAMP(6) NULL,
    returned_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (order_id),
    CONSTRAINT uq_orders_1 UNIQUE (order_code),
    CONSTRAINT ck_orders_rule_1 CHECK (order_status IN ('PENDING','CONFIRMED','PREPARING','SHIPPING','COMPLETED','DELIVERY_FAILED','CANCELLED','RETURNED')),
    CONSTRAINT ck_orders_rule_2 CHECK (voucher_id IS NULL OR customer_account_id IS NOT NULL)
);

CREATE TABLE order_items (
    order_item_id BIGINT NOT NULL AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    CONSTRAINT fk_order_items_order_id FOREIGN KEY (order_id) REFERENCES orders (order_id),
    variant_id BIGINT NOT NULL,
    CONSTRAINT fk_order_items_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants (variant_id),
    product_name_snapshot VARCHAR(255) NOT NULL,
    sku_snapshot VARCHAR(100) NULL,
    size_snapshot VARCHAR(50) NOT NULL,
    color_snapshot VARCHAR(80) NOT NULL,
    unit_price_snapshot DECIMAL(18,2) NOT NULL,
    CONSTRAINT ck_order_items_unit_price_snapshot CHECK (unit_price_snapshot >= 0),
    quantity INT NOT NULL,
    CONSTRAINT ck_order_items_quantity CHECK (quantity > 0),
    line_total_snapshot DECIMAL(18,2) NOT NULL,
    CONSTRAINT ck_order_items_line_total_snapshot CHECK (line_total_snapshot >= 0),
    PRIMARY KEY (order_item_id)
);

CREATE TABLE payments (
    order_id BIGINT NOT NULL,
    CONSTRAINT fk_payments_order_id FOREIGN KEY (order_id) REFERENCES orders (order_id),
    payment_status VARCHAR(20) NOT NULL,
    amount_due DECIMAL(18,2) NOT NULL,
    CONSTRAINT ck_payments_amount_due CHECK (amount_due >= 0),
    amount_received DECIMAL(18,2) NOT NULL,
    CONSTRAINT ck_payments_amount_received CHECK (amount_received >= 0),
    amount_refunded DECIMAL(18,2) NOT NULL,
    CONSTRAINT ck_payments_amount_refunded CHECK (amount_refunded >= 0),
    collected_by_account_id BIGINT NULL,
    CONSTRAINT fk_payments_collected_by_account_id FOREIGN KEY (collected_by_account_id) REFERENCES accounts (account_id),
    collected_at TIMESTAMP(6) NULL,
    refunded_by_account_id BIGINT NULL,
    CONSTRAINT fk_payments_refunded_by_account_id FOREIGN KEY (refunded_by_account_id) REFERENCES accounts (account_id),
    refunded_at TIMESTAMP(6) NULL,
    PRIMARY KEY (order_id),
    CONSTRAINT ck_payments_rule_1 CHECK (payment_status IN ('UNPAID','PAID','REFUNDED'))
);

CREATE TABLE shipping_infos (
    order_id BIGINT NOT NULL,
    CONSTRAINT fk_shipping_infos_order_id FOREIGN KEY (order_id) REFERENCES orders (order_id),
    delivery_mode VARCHAR(30) NOT NULL,
    carrier_name VARCHAR(255) NULL,
    PRIMARY KEY (order_id)
);

CREATE TABLE suppliers (
    supplier_id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(254) NULL,
    address VARCHAR(500) NULL,
    usage_status VARCHAR(30) NOT NULL,
    note VARCHAR(500) NULL,
    PRIMARY KEY (supplier_id)
);

CREATE TABLE goods_receipts (
    receipt_id BIGINT NOT NULL AUTO_INCREMENT,
    receipt_code VARCHAR(40) NOT NULL,
    supplier_id BIGINT NOT NULL,
    CONSTRAINT fk_goods_receipts_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id),
    receipt_status VARCHAR(20) NOT NULL,
    receipt_date DATE NOT NULL,
    created_by_account_id BIGINT NOT NULL,
    CONSTRAINT fk_goods_receipts_created_by_account_id FOREIGN KEY (created_by_account_id) REFERENCES accounts (account_id),
    confirmed_by_account_id BIGINT NULL,
    CONSTRAINT fk_goods_receipts_confirmed_by_account_id FOREIGN KEY (confirmed_by_account_id) REFERENCES accounts (account_id),
    confirmed_at TIMESTAMP(6) NULL,
    note TEXT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (receipt_id),
    CONSTRAINT uq_goods_receipts_1 UNIQUE (receipt_code),
    CONSTRAINT ck_goods_receipts_rule_1 CHECK (receipt_status IN ('DRAFT','CONFIRMED','CANCELLED'))
);

CREATE TABLE goods_receipt_items (
    receipt_item_id BIGINT NOT NULL AUTO_INCREMENT,
    receipt_id BIGINT NOT NULL,
    CONSTRAINT fk_goods_receipt_items_receipt_id FOREIGN KEY (receipt_id) REFERENCES goods_receipts (receipt_id),
    variant_id BIGINT NOT NULL,
    CONSTRAINT fk_goods_receipt_items_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants (variant_id),
    quantity INT NOT NULL,
    CONSTRAINT ck_goods_receipt_items_quantity CHECK (quantity > 0),
    PRIMARY KEY (receipt_item_id),
    CONSTRAINT uq_goods_receipt_items_1 UNIQUE (receipt_id,variant_id)
);

CREATE TABLE inventories (
    variant_id BIGINT NOT NULL,
    CONSTRAINT fk_inventories_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants (variant_id),
    available_quantity INT NOT NULL,
    CONSTRAINT ck_inventories_available_quantity CHECK (available_quantity >= 0),
    updated_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (variant_id)
);

CREATE TABLE inventory_transactions (
    txn_id BIGINT NOT NULL AUTO_INCREMENT,
    variant_id BIGINT NOT NULL,
    CONSTRAINT fk_inventory_transactions_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants (variant_id),
    quantity_delta INT NOT NULL,
    CONSTRAINT ck_inventory_transactions_quantity_delta CHECK (quantity_delta <> 0),
    transaction_type VARCHAR(40) NOT NULL,
    order_id BIGINT NULL,
    CONSTRAINT fk_inventory_transactions_order_id FOREIGN KEY (order_id) REFERENCES orders (order_id),
    goods_receipt_id BIGINT NULL,
    CONSTRAINT fk_inventory_transactions_goods_receipt_id FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts (receipt_id),
    actor_account_id BIGINT NOT NULL,
    CONSTRAINT fk_inventory_transactions_actor_account_id FOREIGN KEY (actor_account_id) REFERENCES accounts (account_id),
    reason VARCHAR(500) NULL,
    created_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (txn_id)
);

CREATE TABLE audit_logs (
    audit_id BIGINT NOT NULL AUTO_INCREMENT,
    actor_account_id BIGINT NOT NULL,
    CONSTRAINT fk_audit_logs_actor_account_id FOREIGN KEY (actor_account_id) REFERENCES accounts (account_id),
    action VARCHAR(120) NOT NULL,
    target_type VARCHAR(80) NOT NULL,
    target_id VARCHAR(80) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (audit_id)
);

CREATE TABLE content_pages (
    page_id BIGINT NOT NULL AUTO_INCREMENT,
    page_code VARCHAR(80) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    updated_by_account_id BIGINT NOT NULL,
    CONSTRAINT fk_content_pages_updated_by_account_id FOREIGN KEY (updated_by_account_id) REFERENCES accounts (account_id),
    updated_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (page_id),
    CONSTRAINT uq_content_pages_1 UNIQUE (page_code)
);
