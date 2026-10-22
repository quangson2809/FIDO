-- FIDO Phase 1 synthetic source fixture (INSERT-only; requires legacy Flyway V1-V6 schema).
-- DO NOT run against production or a shared database.
-- All IDs >= 9001, contact values are synthetic, and image URLs use example.invalid.
-- Deliberately omits inventories row for variant_id=9002 to test post-V6 stock-gap detection.
-- Loaded after V1-V6, the V3 inventory backfill will not rerun. No DELETE/TRUNCATE/DDL is included.
-- Reset by recreating a disposable test database.

INSERT INTO accounts (account_id, password_hash, phone, email, created_at, updated_at) VALUES
(9001, 'fixture-only-not-a-real-password-hash', '0900009001', 'buyer9001@example.invalid', CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)),
(9002, 'fixture-only-not-a-real-password-hash', '0900009002', 'operator9002@example.invalid', CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6));

INSERT INTO roles (role_id, code, name, description) VALUES
(9001, 'P1_FIXTURE_ADMIN', 'P1 Fixture Admin', 'Synthetic migration fixture');
INSERT INTO permissions (permission_id, code, name) VALUES
(9001, 'P1_FIXTURE_READ', 'P1 Fixture Read');
INSERT INTO account_roles (account_id, role_id) VALUES (9002, 9001);
INSERT INTO role_permissions (role_id, permission_id) VALUES (9001, 9001);

INSERT INTO categories (category_id, parent_category_id, name) VALUES
(9001, NULL, 'P1 Fixture Root'),
(9002, 9001, 'P1 Fixture Leaf');
INSERT INTO brands (brand_id, name) VALUES (9001, 'P1 Fixture Brand');
INSERT INTO size_systems (size_system_id, code, name) VALUES (9001, 'P1_FIXTURE_SIZE', 'P1 Fixture Size');
INSERT INTO size_values (size_value_id, size_system_id, code, display_name, sort_order) VALUES
(9001, 9001, 'M', 'Fixture Medium', 1),
(9002, 9001, 'L', 'Fixture Large', 2);
INSERT INTO colors (color_id, code, name) VALUES
(9001, 'P1_FIXTURE_RED', 'Fixture Red'),
(9002, 'P1_FIXTURE_BLUE', 'Fixture Blue');

INSERT INTO products (
    product_id, category_id, brand_id, size_system_id, name, description, gender, season, style,
    material_care, base_price, sale_status, created_at, updated_at
) VALUES
(9001, 9002, 9001, 9001, 'P1 Fixture Parent', 'Synthetic parent description', 'fixture-gender',
 'fixture-season', 'fixture-style', 'Synthetic material/care note', 100.00, 'fixture-status',
 CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)),
(9002, 9002, 9001, 9001, 'P1 Fixture Parent B', NULL, NULL, NULL, NULL, NULL, 150.00,
 'fixture-status', CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6));

INSERT INTO product_images (image_id, product_id, image_url, alt_text, sort_order) VALUES
(9001, 9001, 'https://example.invalid/p1-image-primary.png', 'synthetic alt text to retain', 0),
(9002, 9001, 'https://example.invalid/p1-image-secondary.png', NULL, 1);

INSERT INTO product_variants (
    variant_id, product_id, size_value_id, color_id, sku, override_price, sale_status, created_at, updated_at
) VALUES
(9001, 9001, 9001, 9001, 'P1-FIXTURE-SKU-RED-M', NULL, 'fixture-status', CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)),
(9002, 9001, 9002, 9002, 'P1-FIXTURE-SKU-BLUE-L', 125.00, 'fixture-status', CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6));

INSERT INTO carts (cart_id, account_id, created_at, updated_at) VALUES
(9001, 9001, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)),
(9002, NULL, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6));
INSERT INTO cart_items (cart_item_id, cart_id, variant_id, quantity) VALUES
(9001, 9001, 9001, 2),
(9002, 9002, 9002, 1);

INSERT INTO vouchers (
    voucher_id, code, discount_type, discount_value, maximum_discount, minimum_amount,
    starts_at, ends_at, scope, global_limit, customer_limit, enabled
) VALUES
(9001, 'P1-FIXTURE-SCOPED', 'FIXTURE_PERCENT', 10.00, 25.00, 50.00,
 CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY, CURRENT_TIMESTAMP(6) + INTERVAL 30 DAY,
 'PRODUCT', 100, 1, TRUE);

INSERT INTO orders (
    order_id, order_code, customer_account_id, recipient_phone, recipient_email, recipient_address,
    subtotal_snapshot, discount_snapshot, shipping_fee_snapshot, total_snapshot, voucher_id,
    order_status, customer_service_note, cancel_reason, completed_at, returned_at, created_at, updated_at
) VALUES
(9001, 'P1-FIXTURE-ORDER-9001', 9001, '0900009001', 'recipient9001@example.invalid',
 'Synthetic address text retained as one source value', 200.00, 10.00, 20.00, 210.00, 9001,
 'PENDING', 'Synthetic customer-service note', NULL, NULL, NULL, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)),
(9002, 'P1-FIXTURE-ORDER-9002', 9002, '0900009002', NULL,
 'Synthetic returned-order address', 125.00, 0.00, 15.00, 140.00, NULL,
 'RETURNED', NULL, 'Synthetic historical cancellation text', NULL, CURRENT_TIMESTAMP(6),
 CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6));

INSERT INTO order_items (
    order_item_id, order_id, variant_id, product_name_snapshot, sku_snapshot,
    size_snapshot, color_snapshot, unit_price_snapshot, quantity, line_total_snapshot, image_url_snapshot
) VALUES
(9001, 9001, 9001, 'P1 historical name', 'P1-FIXTURE-SKU-RED-M', 'M', 'Fixture Red',
 100.00, 2, 200.00, 'https://example.invalid/p1-order-snapshot.png'),
(9002, 9002, 9002, 'P1 historical name B', 'P1-FIXTURE-SKU-BLUE-L', 'L', 'Fixture Blue',
 125.00, 1, 125.00, NULL);

INSERT INTO payments (
    order_id, payment_status, amount_due, amount_received, amount_refunded,
    collected_by_account_id, collected_at, refunded_by_account_id, refunded_at
) VALUES
(9001, 'UNPAID', 210.00, 0.00, 0.00, NULL, NULL, NULL, NULL),
(9002, 'REFUNDED', 140.00, 140.00, 140.00, 9001, CURRENT_TIMESTAMP(6), 9002, CURRENT_TIMESTAMP(6));

INSERT INTO shipping_infos (order_id, delivery_mode, carrier_name) VALUES
(9001, 'P1_FIXTURE_MANUAL', 'Synthetic Carrier');

INSERT INTO suppliers (supplier_id, name, phone, email, address, usage_status, note) VALUES
(9001, 'P1 Fixture Supplier', '0900009010', 'supplier9001@example.invalid',
 'Synthetic supplier address', 'FIXTURE_STATUS', 'Synthetic source-only supplier note');

INSERT INTO goods_receipts (
    receipt_id, receipt_code, supplier_id, receipt_status, receipt_date, created_by_account_id,
    confirmed_by_account_id, confirmed_at, note, created_at, updated_at
) VALUES
(9001, 'P1-FIXTURE-RECEIPT-DRAFT', 9001, 'DRAFT', CURRENT_DATE, 9002, NULL, NULL,
 'Synthetic draft receipt note', CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)),
(9002, 'P1-FIXTURE-RECEIPT-CONFIRMED', 9001, 'CONFIRMED', CURRENT_DATE, 9002, 9002,
 CURRENT_TIMESTAMP(6), 'Synthetic confirmed receipt note', CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6));

INSERT INTO goods_receipt_items (receipt_item_id, receipt_id, variant_id, quantity) VALUES
(9001, 9001, 9001, 4),
(9002, 9002, 9002, 3);

-- Intentional: only variant 9001 has an Inventory row.
INSERT INTO inventories (variant_id, available_quantity, updated_at) VALUES
(9001, 7, CURRENT_TIMESTAMP(6));

INSERT INTO inventory_transactions (
    txn_id, variant_id, quantity_delta, transaction_type, order_id, goods_receipt_id,
    actor_account_id, reason, created_at
) VALUES
(9001, 9001, 4, 'P1_FIXTURE_RECEIPT', NULL, 9002, 9002, 'Synthetic receipt-linked ledger row', CURRENT_TIMESTAMP(6)),
(9002, 9001, -1, 'P1_FIXTURE_ORDER', 9002, NULL, 9002, 'Synthetic order-linked ledger row', CURRENT_TIMESTAMP(6)),
(9003, 9002, 2, 'P1_FIXTURE_MANUAL', NULL, NULL, 9002, 'Synthetic unlinked ledger row', CURRENT_TIMESTAMP(6));

INSERT INTO audit_logs (audit_id, actor_account_id, action, target_type, target_id, description, created_at) VALUES
(9001, 9002, 'P1_FIXTURE_ACTION', 'P1_FIXTURE_ENTITY', '9001',
 'Synthetic free-form audit description requiring retention disposition', CURRENT_TIMESTAMP(6));

INSERT INTO content_pages (page_id, page_code, title, content, updated_by_account_id, updated_at) VALUES
(9001, 'P1_FIXTURE_PAGE', 'P1 Fixture Page', 'Synthetic content page', 9002, CURRENT_TIMESTAMP(6));

INSERT INTO voucher_products (voucher_id, product_id) VALUES (9001, 9001);
INSERT INTO voucher_categories (voucher_id, category_id) VALUES (9001, 9002);
INSERT INTO voucher_usages (order_id, voucher_id, account_id, restored) VALUES (9001, 9001, 9001, FALSE);
INSERT INTO checkout_quotes (quote_id, account_id, fingerprint, expires_at, order_id) VALUES
('90000000-0000-4000-8000-000000000001', 9001, 'fixture-active-fingerprint', CURRENT_TIMESTAMP(6) + INTERVAL 1 DAY, NULL),
('90000000-0000-4000-8000-000000000002', 9002, 'fixture-expired-fingerprint', CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY, 9002);
