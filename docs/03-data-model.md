# 03 — Data Model, Entity Rules & Persistence Contract

## 1. Baseline data conventions

- Relational model; DBMS is not locked by Analyst Docs.
- Technical PK: `BIGINT`.
- Business codes such as `order_code`, `receipt_code`: unique.
- Money: `DECIMAL(18,2)`, never floating point.
- Timestamps: store UTC using the repository's TIMESTAMP(6) convention. API #71 interprets requested report dates in Asia/Ho_Chi_Minh, converts bounds to UTC for querying; see docs/15.
- Tables/columns use `snake_case`.
- Important historical/transactional data is not hard-deleted.
- Persist snapshots where history must remain stable; derive values where duplication would create inconsistency.

## 2. 28-table entity inventory

### account

`accounts(account_id, password_hash, phone?, email?, created_at, updated_at)`

`addresses(address_id, account_id, address_text, created_at)`

`roles(role_id, code UQ, name, description?)`

`permissions(permission_id, code UQ, name)`

`account_roles(account_id, role_id)` composite PK.

`role_permissions(role_id, permission_id)` composite PK.

### product

`categories(category_id, parent_category_id?, name)`; self-FK tree, no persisted `is_leaf`.

`brands(brand_id, name UQ)`.

`size_systems(size_system_id, code UQ, name)`.

`size_values(size_value_id, size_system_id, code, display_name, sort_order)`; UQ `(size_system_id, code)`.

`colors(color_id, code UQ, name)`.

`products(product_id, category_id, brand_id?, size_system_id, name, description?, gender?, season?, style?, material_care?, base_price, sale_status, created_at, updated_at)`.

`product_images(image_id, product_id, image_url, alt_text?, sort_order)`.

Image collection invariants:
- `sort_order >= 0`;
- UQ `(product_id, sort_order)`;
- positions are normalized to a dense sequence starting at `0` after add/remove/reorder;
- `sort_order = 0` is the Product cover image;
- Product detail exposes the gallery in `sort_order ASC`;
- removing an image removes it from the active Product collection but does not imply deletion of the remote asset, because historical OrderItem snapshots may still reference the URL.

`product_variants(variant_id, product_id, size_value_id, color_id, sku?, override_price?, sale_status, created_at, updated_at)`; UQ `(product_id,size_value_id,color_id)` and SKU when non-null.

### cart

`carts(cart_id, account_id?, created_at, updated_at)`.

`cart_items(cart_item_id, cart_id, variant_id, quantity)`; UQ `(cart_id,variant_id)`, quantity > 0.

### promotion

`vouchers(voucher_id, code UQ)` only. Discount type/value/date/scope/usage/active lifecycle are not baseline fields.

### order

`orders`:
- `order_id` PK, `order_code` UQ;
- `customer_account_id?` for guest support;
- receiver snapshots: `recipient_phone`, `recipient_email?`, `recipient_address`;
- money snapshots: `subtotal_snapshot`, `discount_snapshot`, `shipping_fee_snapshot`, `total_snapshot`;
- `voucher_id?`;
- `order_status`;
- `customer_service_note?`, `cancel_reason?`;
- `completed_at?`, `returned_at?`, `created_at`, `updated_at`.

`order_items`:
- identity: `order_item_id`, `order_id`, `variant_id`;
- snapshots: product name, image URL?, SKU?, size, color, unit price, quantity, line total;
- physical image snapshot column: `image_url_snapshot`.

`payments`:
- `order_id` PK/FK for 1:1;
- `payment_status` = UNPAID/PAID/REFUNDED;
- `amount_due`, `amount_received`, `amount_refunded`;
- collection/refund actor + timestamp.

`shipping_infos`:
- `order_id` PK/FK;
- `delivery_mode`;
- `carrier_name?`;
- no tracking/reference code baseline.

### inventory

`suppliers(supplier_id, name, phone?, email?, address?, usage_status, note?)`.

`goods_receipts(receipt_id, receipt_code UQ, supplier_id, receipt_status, receipt_date, created_by_account_id, confirmed_by_account_id?, confirmed_at?, note?, created_at, updated_at)`.

`goods_receipt_items(receipt_item_id, receipt_id, variant_id, quantity)`; UQ `(receipt_id,variant_id)`; no `unit_cost` baseline.

`inventories(variant_id PK/FK, available_quantity >= 0, updated_at)`; value means **sellable availability**, not physical on-hand.

`inventory_transactions(txn_id, variant_id, quantity_delta != 0, transaction_type, order_id?, goods_receipt_id?, actor_account_id, reason?, created_at)`.

### audit/report/content

`audit_logs(audit_id, actor_account_id, action, target_type, target_id, description?, created_at)`.

`report`: no physical baseline table; compute report from transaction/order data.

`content_pages(page_id, page_code UQ, title, content, updated_by_account_id, updated_at)`.

## 3. Values that must be derived, not duplicated

- Effective variant price = `COALESCE(product_variants.override_price, products.base_price)`.
- Purchasable availability = Product sale state + Variant sale state + `inventories.available_quantity`.
- Product cover image = ProductImage at `sort_order = 0`; do not infer cover from `MIN(image_id)` after the image-order refinement.
- Product detail gallery = ProductImages ordered by `sort_order ASC`.
- Cart item image = current Product cover at read time; cart does not persist an image snapshot.
- OrderItem image = `order_items.image_url_snapshot` captured from the current Product cover when the Order is created; later catalog edits must not change it.
- Order payment status comes from `payments`; do not add `payment_status` to `orders`.
- Cart subtotal is calculated from cart items and current effective prices.
- Sales report is calculated from completed/returned orders; no baseline aggregate table.

## 4. Persistence invariants

- Category root may have `parent_category_id = NULL`; self-parent and cycles are forbidden.
- Product may reference only a leaf Category.
- Variant `SizeValue` must belong to Product's `SizeSystem`.
- Variant `(product,size,color)` combination is unique.
- Existing transactional Variant identity must not be repurposed to a different size/color meaning; create a new Variant instead and stop selling the old one.
- ProductImage positions must be non-negative and unique within a Product; after a collection mutation they are normalized from `0`.
- Product cover is the image at position `0`; a Product with no images has no cover.
- Reorder must preserve image ownership and must not create duplicate final positions.
- Removing a ProductImage does not mutate historical `OrderItem.image_url_snapshot` and does not automatically delete the remote asset.
- `available_quantity` cannot be negative.
- Purchase/receipt quantities must be positive.
- Prices and money snapshots must be non-negative.
- OrderItem snapshot values, including `image_url_snapshot`, must not be rewritten by catalog edits.
- Confirmed GoodsReceipt stock-affecting items are immutable.
- Historical Order/Payment/InventoryTransaction/Audit data is not hard-deleted.

## 5. Migration delta for image management

The existing V1 baseline remains historical. Add a new Flyway migration that:

1. adds `product_images.sort_order`;
2. backfills each Product deterministically in `image_id ASC` order with positions starting at `0`, preserving the previous representative image as the new cover;
3. adds the non-negative check and UQ `(product_id, sort_order)` after backfill;
4. adds nullable `order_items.image_url_snapshot` for backward compatibility with already-created orders.

Do not backfill historical OrderItem image snapshots from the current catalog: that would fabricate history if the Product gallery changed after the order was created.

## 6. Java mapping guidance

This section is an implementation convention, not a new business rule:

- Use `Long` for BIGINT identifiers.
- Use `BigDecimal` for DECIMAL money.
- Use the repository's established timestamp types and timezone strategy.
- Use enums only for state/value sets that are actually locked. For `gender`, `season`, `style`, sale-status technical values, delivery-mode technical values and supplier usage-status, preserve configurable/string treatment until the value set is locked by source/repo.
- Database constraints and service validation should reinforce one another for critical invariants.
