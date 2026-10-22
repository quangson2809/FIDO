-- FIDO Phase 1 source-schema preflight (READ-ONLY)
-- MySQL 8.4; legacy schema after Flyway V1-V6.
-- Run only against an isolated/sanitized copy of the current source database.
-- Requires SELECT access to source tables and information_schema.
-- Select the source schema before execution. Review section A before continuing.
-- If any required table is missing, stop; later static queries assume all 32 exist.
-- This file contains SELECT statements only, not DDL or DML.

-- A. Validate the expected 32-table application source inventory.
SELECT e.table_name,
       CASE WHEN t.table_name IS NULL THEN 'MISSING' ELSE 'PRESENT' END AS inventory_status
FROM (
    SELECT 'accounts' AS table_name UNION ALL SELECT 'addresses' UNION ALL
    SELECT 'roles' UNION ALL SELECT 'permissions' UNION ALL
    SELECT 'account_roles' UNION ALL SELECT 'role_permissions' UNION ALL
    SELECT 'categories' UNION ALL SELECT 'brands' UNION ALL
    SELECT 'size_systems' UNION ALL SELECT 'size_values' UNION ALL
    SELECT 'colors' UNION ALL SELECT 'products' UNION ALL
    SELECT 'product_images' UNION ALL SELECT 'product_variants' UNION ALL
    SELECT 'carts' UNION ALL SELECT 'cart_items' UNION ALL
    SELECT 'vouchers' UNION ALL SELECT 'orders' UNION ALL
    SELECT 'order_items' UNION ALL SELECT 'payments' UNION ALL
    SELECT 'shipping_infos' UNION ALL SELECT 'suppliers' UNION ALL
    SELECT 'goods_receipts' UNION ALL SELECT 'goods_receipt_items' UNION ALL
    SELECT 'inventories' UNION ALL SELECT 'inventory_transactions' UNION ALL
    SELECT 'audit_logs' UNION ALL SELECT 'content_pages' UNION ALL
    SELECT 'voucher_products' UNION ALL SELECT 'voucher_categories' UNION ALL
    SELECT 'voucher_usages' UNION ALL SELECT 'checkout_quotes'
) e
LEFT JOIN information_schema.tables t
  ON t.table_schema = DATABASE()
 AND t.table_name = e.table_name
 AND t.table_type = 'BASE TABLE'
ORDER BY e.table_name;

-- B. Exact row counts. Run only after section A confirms all 32 tables are present.
SELECT 'accounts' AS table_name, COUNT(*) AS row_count FROM accounts UNION ALL
SELECT 'addresses', COUNT(*) FROM addresses UNION ALL
SELECT 'roles', COUNT(*) FROM roles UNION ALL
SELECT 'permissions', COUNT(*) FROM permissions UNION ALL
SELECT 'account_roles', COUNT(*) FROM account_roles UNION ALL
SELECT 'role_permissions', COUNT(*) FROM role_permissions UNION ALL
SELECT 'categories', COUNT(*) FROM categories UNION ALL
SELECT 'brands', COUNT(*) FROM brands UNION ALL
SELECT 'size_systems', COUNT(*) FROM size_systems UNION ALL
SELECT 'size_values', COUNT(*) FROM size_values UNION ALL
SELECT 'colors', COUNT(*) FROM colors UNION ALL
SELECT 'products', COUNT(*) FROM products UNION ALL
SELECT 'product_images', COUNT(*) FROM product_images UNION ALL
SELECT 'product_variants', COUNT(*) FROM product_variants UNION ALL
SELECT 'carts', COUNT(*) FROM carts UNION ALL
SELECT 'cart_items', COUNT(*) FROM cart_items UNION ALL
SELECT 'vouchers', COUNT(*) FROM vouchers UNION ALL
SELECT 'orders', COUNT(*) FROM orders UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items UNION ALL
SELECT 'payments', COUNT(*) FROM payments UNION ALL
SELECT 'shipping_infos', COUNT(*) FROM shipping_infos UNION ALL
SELECT 'suppliers', COUNT(*) FROM suppliers UNION ALL
SELECT 'goods_receipts', COUNT(*) FROM goods_receipts UNION ALL
SELECT 'goods_receipt_items', COUNT(*) FROM goods_receipt_items UNION ALL
SELECT 'inventories', COUNT(*) FROM inventories UNION ALL
SELECT 'inventory_transactions', COUNT(*) FROM inventory_transactions UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs UNION ALL
SELECT 'content_pages', COUNT(*) FROM content_pages UNION ALL
SELECT 'voucher_products', COUNT(*) FROM voucher_products UNION ALL
SELECT 'voucher_categories', COUNT(*) FROM voucher_categories UNION ALL
SELECT 'voucher_usages', COUNT(*) FROM voucher_usages UNION ALL
SELECT 'checkout_quotes', COUNT(*) FROM checkout_quotes
ORDER BY table_name;

-- C. Account identity quality.
SELECT COUNT(*) AS account_rows,
       SUM(phone IS NULL) AS null_phone_rows,
       SUM(phone IS NOT NULL AND TRIM(phone) = '') AS blank_phone_rows,
       SUM(email IS NULL) AS null_email_rows,
       SUM(email IS NOT NULL AND TRIM(email) = '') AS blank_email_rows
FROM accounts;

SELECT phone, COUNT(*) AS duplicate_rows
FROM accounts
WHERE phone IS NOT NULL AND TRIM(phone) <> ''
GROUP BY phone
HAVING COUNT(*) > 1
ORDER BY duplicate_rows DESC, phone;

-- D. Product/Variant identity and legacy fields for typed-attribute mapping.
SELECT
    (SELECT COUNT(*) FROM products) AS legacy_product_rows,
    (SELECT COUNT(*) FROM product_variants) AS legacy_variant_rows,
    (SELECT COUNT(*) FROM product_variants WHERE sku IS NULL OR TRIM(sku) = '') AS variants_without_sku,
    (SELECT COUNT(*) FROM product_variants WHERE override_price IS NULL) AS variants_using_parent_price,
    (SELECT COUNT(*) FROM product_variants WHERE override_price IS NOT NULL) AS variants_with_override_price,
    (SELECT COUNT(*) FROM products WHERE gender IS NOT NULL) AS products_with_gender,
    (SELECT COUNT(*) FROM products WHERE season IS NOT NULL) AS products_with_season,
    (SELECT COUNT(*) FROM products WHERE style IS NOT NULL) AS products_with_style,
    (SELECT COUNT(*) FROM products WHERE material_care IS NOT NULL) AS products_with_material_care,
    (SELECT COUNT(*) FROM products p JOIN product_variants v ON v.product_id = p.product_id
      WHERE p.product_id = v.variant_id) AS numeric_product_variant_id_overlaps;

SELECT product_id, COUNT(*) AS variant_count
FROM product_variants
GROUP BY product_id
ORDER BY variant_count DESC, product_id;

-- These target fields have no direct source columns. Counts quantify rows requiring disposition.
SELECT 'accounts: target full_name has no source column' AS data_gap, COUNT(*) AS affected_rows FROM accounts
UNION ALL SELECT 'products: target slug has no source column', COUNT(*) FROM products
UNION ALL SELECT 'products: target cost_price has no source column', COUNT(*) FROM products
UNION ALL SELECT 'categories: target slug has no source column', COUNT(*) FROM categories
UNION ALL SELECT 'brands: target slug has no source column', COUNT(*) FROM brands
UNION ALL SELECT 'goods_receipt_items: target unit_cost has no source column', COUNT(*) FROM goods_receipt_items
UNION ALL SELECT 'suppliers: target code has no source column', COUNT(*) FROM suppliers
ORDER BY data_gap;

-- E. Images/snapshots.
SELECT
    (SELECT COUNT(*) FROM product_images) AS image_rows,
    (SELECT COUNT(*) FROM product_images WHERE alt_text IS NOT NULL) AS image_rows_with_alt_text,
    (SELECT COUNT(*) FROM order_items) AS order_item_rows,
    (SELECT COUNT(*) FROM order_items WHERE image_url_snapshot IS NOT NULL) AS order_items_with_image_snapshot,
    (SELECT COUNT(*) FROM order_items WHERE image_url_snapshot IS NULL) AS order_items_without_image_snapshot;

SELECT product_id, COUNT(*) AS image_count,
       SUM(alt_text IS NOT NULL) AS image_rows_with_alt_text,
       MIN(sort_order) AS minimum_sort_order,
       MAX(sort_order) AS maximum_sort_order
FROM product_images
GROUP BY product_id
ORDER BY image_count DESC, product_id;

-- F. Cart ownership: target account_id nullability must be decided; don't delete unowned carts.
SELECT COUNT(*) AS cart_rows,
       SUM(account_id IS NULL) AS carts_without_account,
       SUM(account_id IS NOT NULL) AS carts_with_account
FROM carts;

-- G. Order states and source-only snapshot facts; historical totals are not recomputed.
SELECT order_status, COUNT(*) AS order_count,
       SUM(customer_account_id IS NULL) AS guest_order_count,
       SUM(voucher_id IS NOT NULL) AS orders_with_voucher,
       SUM(recipient_email IS NOT NULL) AS orders_with_recipient_email,
       SUM(customer_service_note IS NOT NULL) AS orders_with_service_note,
       SUM(cancel_reason IS NOT NULL) AS orders_with_cancel_reason,
       SUM(completed_at IS NOT NULL) AS orders_with_completed_at,
       SUM(returned_at IS NOT NULL) AS orders_with_returned_at
FROM orders
GROUP BY order_status
ORDER BY order_status;

-- H. Payments: source stores aggregates and actor/time for both collection and refund.
SELECT payment_status, COUNT(*) AS payment_rows,
       SUM(amount_due) AS total_amount_due,
       SUM(amount_received) AS total_amount_received,
       SUM(amount_refunded) AS total_amount_refunded,
       SUM(amount_refunded > 0) AS rows_with_refunds,
       SUM(collected_by_account_id IS NOT NULL) AS rows_with_collection_actor,
       SUM(collected_at IS NOT NULL) AS rows_with_collection_time,
       SUM(refunded_by_account_id IS NOT NULL) AS rows_with_refund_actor,
       SUM(refunded_at IS NOT NULL) AS rows_with_refund_time
FROM payments
GROUP BY payment_status
ORDER BY payment_status;

-- I. Shipping. Source has no tracking number/history columns.
SELECT COUNT(*) AS shipping_info_rows,
       SUM(delivery_mode IS NOT NULL) AS rows_with_delivery_mode,
       SUM(carrier_name IS NOT NULL) AS rows_with_carrier_name
FROM shipping_infos;

-- J. Supplier/receiving source-only facts.
SELECT
    (SELECT COUNT(*) FROM suppliers) AS supplier_rows,
    (SELECT COUNT(*) FROM suppliers WHERE address IS NOT NULL) AS suppliers_with_address,
    (SELECT COUNT(*) FROM suppliers WHERE note IS NOT NULL) AS suppliers_with_note,
    (SELECT COUNT(*) FROM goods_receipts) AS receipt_rows,
    (SELECT COUNT(*) FROM goods_receipts WHERE receipt_date IS NOT NULL) AS receipts_with_receipt_date,
    (SELECT COUNT(*) FROM goods_receipts WHERE note IS NOT NULL) AS receipts_with_note,
    (SELECT COUNT(*) FROM goods_receipt_items) AS receipt_item_rows;

SELECT receipt_status, COUNT(*) AS receipt_count,
       SUM(confirmed_by_account_id IS NOT NULL) AS rows_with_confirmer,
       SUM(confirmed_at IS NOT NULL) AS rows_with_confirmation_time
FROM goods_receipts
GROUP BY receipt_status
ORDER BY receipt_status;

-- K. Stock profile. The result does not assume available_quantity = target quantity_on_hand.
SELECT COUNT(*) AS legacy_variant_rows,
       (SELECT COUNT(*) FROM inventories) AS inventory_rows,
       SUM(i.variant_id IS NOT NULL) AS variants_with_inventory,
       SUM(i.variant_id IS NULL) AS variants_missing_inventory
FROM product_variants v
LEFT JOIN inventories i ON i.variant_id = v.variant_id;

SELECT COUNT(*) AS inventory_rows,
       SUM(available_quantity) AS sum_available_quantity,
       MIN(available_quantity) AS minimum_available_quantity,
       MAX(available_quantity) AS maximum_available_quantity,
       SUM(available_quantity = 0) AS zero_quantity_rows
FROM inventories;

SELECT COUNT(*) AS ledger_rows,
       SUM(quantity_delta > 0) AS positive_delta_rows,
       SUM(quantity_delta < 0) AS negative_delta_rows,
       SUM(order_id IS NOT NULL) AS rows_with_order_header,
       SUM(goods_receipt_id IS NOT NULL) AS rows_with_receipt_header,
       SUM(order_id IS NOT NULL AND goods_receipt_id IS NOT NULL) AS rows_with_both_headers,
       SUM(order_id IS NULL AND goods_receipt_id IS NULL) AS rows_with_neither_header,
       SUM(quantity_delta) AS raw_delta_sum_not_a_reconciled_balance
FROM inventory_transactions;

-- L. Voucher targeting/redemption and quote state; none has a direct target table equivalent.
SELECT scope, enabled, COUNT(*) AS voucher_count,
       SUM(discount_type IS NULL) AS rows_without_discount_type,
       SUM(discount_value IS NULL) AS rows_without_discount_value,
       SUM(starts_at IS NULL) AS rows_without_start,
       SUM(ends_at IS NULL) AS rows_without_end
FROM vouchers
GROUP BY scope, enabled
ORDER BY scope, enabled;

SELECT
    (SELECT COUNT(*) FROM voucher_products) AS voucher_product_links,
    (SELECT COUNT(*) FROM voucher_categories) AS voucher_category_links,
    (SELECT COUNT(*) FROM voucher_usages) AS voucher_usage_rows,
    (SELECT COUNT(*) FROM voucher_usages WHERE restored = TRUE) AS restored_usage_rows,
    (SELECT COUNT(*) FROM checkout_quotes) AS checkout_quote_rows,
    (SELECT COUNT(*) FROM checkout_quotes WHERE expires_at > CURRENT_TIMESTAMP) AS quotes_not_expired_now,
    (SELECT COUNT(*) FROM checkout_quotes WHERE expires_at <= CURRENT_TIMESTAMP) AS expired_quotes,
    (SELECT COUNT(*) FROM checkout_quotes WHERE order_id IS NOT NULL) AS quotes_linked_to_orders;

-- M. Audit descriptions and attribution.
SELECT
    (SELECT COUNT(*) FROM audit_logs) AS audit_rows,
    (SELECT COUNT(*) FROM audit_logs WHERE description IS NOT NULL) AS audits_with_description,
    (SELECT COUNT(*) FROM content_pages) AS content_page_rows,
    (SELECT COUNT(*) FROM content_pages WHERE updated_by_account_id IS NOT NULL) AS pages_with_updater;

-- N. Referential checks. These should be zero under intact source FK enforcement; verify the copy.
SELECT 'cart_items -> carts' AS relationship_name, COUNT(*) AS orphan_rows
FROM cart_items x LEFT JOIN carts p ON p.cart_id = x.cart_id WHERE p.cart_id IS NULL
UNION ALL SELECT 'cart_items -> product_variants', COUNT(*)
FROM cart_items x LEFT JOIN product_variants p ON p.variant_id = x.variant_id WHERE p.variant_id IS NULL
UNION ALL SELECT 'product_variants -> products', COUNT(*)
FROM product_variants x LEFT JOIN products p ON p.product_id = x.product_id WHERE p.product_id IS NULL
UNION ALL SELECT 'product_variants -> size_values', COUNT(*)
FROM product_variants x LEFT JOIN size_values p ON p.size_value_id = x.size_value_id WHERE p.size_value_id IS NULL
UNION ALL SELECT 'product_variants -> colors', COUNT(*)
FROM product_variants x LEFT JOIN colors p ON p.color_id = x.color_id WHERE p.color_id IS NULL
UNION ALL SELECT 'order_items -> orders', COUNT(*)
FROM order_items x LEFT JOIN orders p ON p.order_id = x.order_id WHERE p.order_id IS NULL
UNION ALL SELECT 'order_items -> product_variants', COUNT(*)
FROM order_items x LEFT JOIN product_variants p ON p.variant_id = x.variant_id WHERE p.variant_id IS NULL
UNION ALL SELECT 'goods_receipt_items -> receipts', COUNT(*)
FROM goods_receipt_items x LEFT JOIN goods_receipts p ON p.receipt_id = x.receipt_id WHERE p.receipt_id IS NULL
UNION ALL SELECT 'goods_receipt_items -> product_variants', COUNT(*)
FROM goods_receipt_items x LEFT JOIN product_variants p ON p.variant_id = x.variant_id WHERE p.variant_id IS NULL
UNION ALL SELECT 'inventories -> product_variants', COUNT(*)
FROM inventories x LEFT JOIN product_variants p ON p.variant_id = x.variant_id WHERE p.variant_id IS NULL
UNION ALL SELECT 'inventory_transactions -> product_variants', COUNT(*)
FROM inventory_transactions x LEFT JOIN product_variants p ON p.variant_id = x.variant_id WHERE p.variant_id IS NULL
UNION ALL SELECT 'voucher_usages -> orders', COUNT(*)
FROM voucher_usages x LEFT JOIN orders p ON p.order_id = x.order_id WHERE p.order_id IS NULL
ORDER BY relationship_name;

-- O. Inspect physical metadata for fields relevant to the migration blockers.
SELECT table_name, column_name, column_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND (
       (table_name = 'accounts' AND column_name IN ('phone','email','full_name','password_hash'))
    OR (table_name = 'products' AND column_name IN ('base_price','gender','season','style','material_care','slug','cost_price'))
    OR (table_name = 'product_variants' AND column_name IN ('sku','override_price'))
    OR (table_name = 'product_images' AND column_name IN ('alt_text','sort_order'))
    OR (table_name = 'order_items' AND column_name IN ('image_url_snapshot','size_snapshot','color_snapshot'))
    OR (table_name = 'payments' AND column_name IN ('amount_due','amount_received','amount_refunded','refunded_by_account_id','refunded_at'))
    OR (table_name = 'shipping_infos' AND column_name IN ('delivery_mode','carrier_name'))
    OR (table_name = 'suppliers' AND column_name IN ('address','note'))
    OR (table_name = 'goods_receipts' AND column_name IN ('receipt_date','note'))
    OR (table_name = 'goods_receipt_items' AND column_name IN ('quantity','unit_cost'))
    OR (table_name = 'inventory_transactions' AND column_name IN ('quantity_delta','idempotency_key'))
    OR (table_name = 'audit_logs' AND column_name IN ('description','target_type','target_id'))
  )
ORDER BY table_name, ordinal_position;
