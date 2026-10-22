# FIDO — Phase 1: Owner-confirmed ERD v2 & Data Contract

- **Status: PARTIAL.** The owner has supplied the finalized logical schema directly in the 2026-10-22 conversation. The canonical target is **31 tables**, not the 38-table draft previously recorded here. The diagram and this contract now match the owner-supplied scope.
- **Repository:** https://github.com/quangson2809/FIDO
- **Migration baseline branch:** demo1
- **Baseline SHA:** f931602c86fdf5a59b487d6edd77331b7d64333a
- **Documentation branch:** docs/phase-1-erd-v2-freeze
- **Target schema confirmation:** 2026-10-22
- **Scope:** record the 31-table target model, inventory the existing V1–V6 migration schema, specify source-to-target mapping and the evidence required before a safe data migration.
- **Excluded:** modifying V1–V6, implementing migrations, writing to a live database, dropping legacy columns/tables, silently expanding the approved target model, changing public API behavior, or merging this documentation branch.

> Source of truth: the exact 31-table ERD most recently supplied by the project owner. The earlier 38-table draft and its assumptions are superseded. The current V1–V6 schema inventory below describes the migration source only, not the target schema. Do not re-add a target table or column that is absent from the owner-confirmed ERD without an explicit owner change.

## 1. Execution summary and evidence boundary

### 1.1 Work performed

1. Replaced the former 38-table target diagram with the exact 31-table logical ERD supplied by the owner.
2. Kept the existing V1–V6 migration inventory and its constraint-name appendix as baseline evidence.
3. Reconciled the target table count, product hierarchy, order/payment/shipping scope, inventory semantics, voucher scope and migration blockers in this contract.
4. Marked existing architecture/feature documents that describe the pre-refactor implementation as baseline-only where their physical model differs from the approved ERD.
5. Added docs/refactor/phase-1-physical-data-dictionary.md, read-only backend/src/test/resources/refactor/phase-1-source-preflight.sql, synthetic backend/src/test/resources/refactor/phase-1-source-fixture.sql, and docs/refactor/phase-1-preflight-runbook.md.
6. Added a static JUnit guard at backend/src/test/java/com/fido/persistence/Phase1PreflightArtifactTests.java. It checks SQL statement classes and fixture coverage; it does not execute SQL.
7. Did not change Java application code, API DTOs, Flyway V1–V6, live data or branch merge state.

### 1.2 Verified facts versus unavailable evidence

| Item | Result | Evidence boundary |
|---|---|---|
| Owner-confirmed target ERD | **31 logical tables** | docs/refactor/phase-1-erd-v2-approved.mmd and the owner's exact schema message |
| Existing V1–V6 migration DDL | **32 application tables** | Source migrations; excludes Flyway metadata |
| Current schema implementation | Legacy pre-refactor schema | Existing entities, migrations and tests still reference ProductVariant/size/color and V1–V6 fields |
| Baseline backend CI | **PASS** | Workflow run 39631789377 on baseline f931602c86fdf5a59b487d6edd77331b7d64333a; applies only to that baseline |
| New ERD documentation commit CI | **NOT VERIFIED** | A pending Vercel status is not backend schema/test evidence; do not claim the new documentation commit passed backend CI |
| Live DB schema and data profile | **NOT INSPECTED** | No verified live table counts, duplicate scan, orphan scan, row counts or data-quality results are available here |
| Populated-database migration rehearsal | **NOT RUN** | Requires an isolated/sanitized database copy and explicit reconciliation evidence |

### 1.3 The 28-versus-32 current-schema discrepancy

The original migration file name V1__baseline_28_tables.sql and several pre-refactor documents describe the 28-table V1 baseline. The complete source migration chain V1–V6 defines 32 application tables because V5 adds voucher_products, voucher_categories, voucher_usages and checkout_quotes. Neither number is the approved target count: ERD v2 contains 31 target tables.

## 2. Current database inventory — migration DDL V1–V6

Notation: “?” means nullable in the current schema. For exact type lengths, precision, column definitions and constraint names, the migration SQL is authoritative. This table summarizes every application table and its core keys/relations.

### 2.1 Complete table inventory

| # | Table / source | Core columns | Primary key | Foreign keys | Unique, checks and indexes |
|---:|---|---|---|---|---|
| 1 | accounts — V1/V2 | account_id, password_hash, phone?, email?, created_at, updated_at | account_id | — | V2 UNIQUE(phone) |
| 2 | addresses — V1 | address_id, account_id, address_text, created_at | address_id | account_id → accounts.account_id | — |
| 3 | roles — V1 | role_id, code, name, description? | role_id | — | UNIQUE(code) |
| 4 | permissions — V1/V6 | permission_id, code, name | permission_id | — | UNIQUE(code); V6 seeds REPORT_READ |
| 5 | account_roles — V1 | account_id, role_id | (account_id, role_id) | account_id → accounts; role_id → roles | Composite PK prevents duplicate assignment |
| 6 | role_permissions — V1 | role_id, permission_id | (role_id, permission_id) | role_id → roles; permission_id → permissions | Composite PK prevents duplicate assignment |
| 7 | categories — V1 | category_id, parent_category_id?, name | category_id | parent_category_id → categories.category_id | Self-FK; FK does not prevent cycles |
| 8 | brands — V1 | brand_id, name | brand_id | — | UNIQUE(name) |
| 9 | size_systems — V1 | size_system_id, code, name | size_system_id | — | UNIQUE(code) |
| 10 | size_values — V1 | size_value_id, size_system_id, code, display_name, sort_order | size_value_id | size_system_id → size_systems.size_system_id | UNIQUE(size_system_id, code) |
| 11 | colors — V1 | color_id, code, name | color_id | — | UNIQUE(code) |
| 12 | products — V1 | product_id, category_id, brand_id?, size_system_id, name, description?, gender?, season?, style?, material_care?, base_price, sale_status, created_at, updated_at | product_id | category_id → categories; brand_id → brands; size_system_id → size_systems | CHECK(base_price >= 0) |
| 13 | product_images — V1/V4 | image_id, product_id, image_url, alt_text?, sort_order | image_id | product_id → products.product_id | V4 UNIQUE(product_id, sort_order); CHECK(sort_order >= 0) |
| 14 | product_variants — V1 | variant_id, product_id, size_value_id, color_id, sku?, override_price?, sale_status, created_at, updated_at | variant_id | product_id → products; size_value_id → size_values; color_id → colors | UNIQUE(product_id, size_value_id, color_id); UNIQUE(sku); CHECK(override_price >= 0) |
| 15 | carts — V1 | cart_id, account_id?, created_at, updated_at | cart_id | account_id → accounts.account_id | No schema uniqueness limit of one Cart per account |
| 16 | cart_items — V1 | cart_item_id, cart_id, variant_id, quantity | cart_item_id | cart_id → carts; variant_id → product_variants | UNIQUE(cart_id, variant_id); CHECK(quantity > 0) |
| 17 | vouchers — V1/V5 | voucher_id, code, discount_type?, discount_value?, maximum_discount?, minimum_amount?, starts_at?, ends_at?, scope?, global_limit?, customer_limit?, enabled | voucher_id | — | UNIQUE(code); V5 defaults enabled to FALSE for legacy code-only records |
| 18 | orders — V1 | order_id, order_code, customer_account_id?, recipient_phone, recipient_email?, recipient_address, subtotal_snapshot, discount_snapshot, shipping_fee_snapshot, total_snapshot, voucher_id?, order_status, customer_service_note?, cancel_reason?, completed_at?, returned_at?, created_at, updated_at | order_id | customer_account_id → accounts; voucher_id → vouchers | UNIQUE(order_code); money CHECKs >= 0; CHECK for eight approved states; voucher requires customer account |
| 19 | order_items — V1/V4 | order_item_id, order_id, variant_id, product_name_snapshot, sku_snapshot?, size_snapshot, color_snapshot, unit_price_snapshot, quantity, line_total_snapshot, image_url_snapshot? | order_item_id | order_id → orders; variant_id → product_variants | CHECK unit/line totals >= 0; CHECK quantity > 0; V4 image snapshot is nullable and not backfilled |
| 20 | payments — V1 | order_id, payment_status, amount_due, amount_received, amount_refunded, collected_by_account_id?, collected_at?, refunded_by_account_id?, refunded_at? | order_id | order_id → orders; actor IDs → accounts | One row per order; amounts >= 0; status in UNPAID/PAID/REFUNDED |
| 21 | shipping_infos — V1 | order_id, delivery_mode, carrier_name? | order_id | order_id → orders | One row per order; no tracking code in baseline |
| 22 | suppliers — V1 | supplier_id, name, phone?, email?, address?, usage_status, note? | supplier_id | — | No unique supplier name/phone in source DDL |
| 23 | goods_receipts — V1 | receipt_id, receipt_code, supplier_id, receipt_status, receipt_date, created_by_account_id, confirmed_by_account_id?, confirmed_at?, note?, created_at, updated_at | receipt_id | supplier_id → suppliers; creator/confirmer → accounts | UNIQUE(receipt_code); CHECK status in DRAFT/CONFIRMED/CANCELLED |
| 24 | goods_receipt_items — V1 | receipt_item_id, receipt_id, variant_id, quantity | receipt_item_id | receipt_id → goods_receipts; variant_id → product_variants | UNIQUE(receipt_id, variant_id); CHECK quantity > 0 |
| 25 | inventories — V1/V3 | variant_id, available_quantity, updated_at | variant_id | variant_id → product_variants.variant_id | CHECK(available_quantity >= 0); V3 backfills missing Variant rows at zero |
| 26 | inventory_transactions — V1 | txn_id, variant_id, quantity_delta, transaction_type, order_id?, goods_receipt_id?, actor_account_id, reason?, created_at | txn_id | variant_id → product_variants; order_id → orders; goods_receipt_id → goods_receipts; actor → accounts | CHECK(quantity_delta <> 0); immutable-ledger convention |
| 27 | audit_logs — V1 | audit_id, actor_account_id, action, target_type, target_id, description?, created_at | audit_id | actor_account_id → accounts | Historical audit records are not hard-deleted |
| 28 | content_pages — V1 | page_id, page_code, title, content, updated_by_account_id, updated_at | page_id | updated_by_account_id → accounts | UNIQUE(page_code) |
| 29 | voucher_products — V5 | voucher_id, product_id | (voucher_id, product_id) | voucher_id → vouchers; product_id → products | Composite PK |
| 30 | voucher_categories — V5 | voucher_id, category_id | (voucher_id, category_id) | voucher_id → vouchers; category_id → categories | Composite PK |
| 31 | voucher_usages — V5 | order_id, voucher_id, account_id, restored | order_id | order_id → orders; voucher_id → vouchers; account_id → accounts | Index ix_voucher_usage_count(voucher_id, restored, account_id) |
| 32 | checkout_quotes — V5 | quote_id, account_id, fingerprint, expires_at, order_id? | quote_id | account_id → accounts; order_id → orders | UNIQUE(order_id) |

### 2.2 Explicit secondary indexes and migration side effects

- V3: idx_goods_receipts_supplier_date(supplier_id, receipt_date); idx_goods_receipts_status(receipt_status); idx_goods_receipt_items_variant(variant_id); idx_inventory_transactions_variant_created(variant_id, created_at); idx_inventory_transactions_order(order_id); idx_inventory_transactions_receipt(goods_receipt_id).
- V4: UNIQUE(product_id, sort_order) and CHECK(sort_order >= 0) for product_images; image order is backfilled deterministically by ascending image_id.
- V5: ix_voucher_usage_count(voucher_id, restored, account_id).
- PK and UNIQUE constraints have backing indexes. InnoDB may add supporting FK indexes; these migration-visible indexes are not a SHOW INDEX inventory from a live database.
- V2 adds UNIQUE(accounts.phone). Duplicate values can make it fail; no automatic account merge is permitted.
- V6 seeds a Permission only; no table, column or index is added.

### 2.3 Current cardinalities and semantic relationships

- Account 1—N Addresses; Account N—M Roles via account_roles; Role N—M Permissions via role_permissions.
- Category 0..1 parent — 0..N children; each Product references one Category, optional Brand and one SizeSystem in the current model.
- Product 1—N ProductImages and 1—N ProductVariants. Each ProductVariant references one Product, one SizeValue and one Color.
- Cart 1—N CartItems; each CartItem references one ProductVariant; cart/variant pair is unique.
- Under the present one-warehouse model, ProductVariant 1—0..1 Inventory row and 1—N InventoryTransactions.
- GoodsReceipt 1—N GoodsReceiptItems; receipt/variant pair is unique. Confirming a receipt updates inventory and writes immutable ledger rows inside one service transaction.
- Order 1—N OrderItems, 0..1 Payment and 0..1 ShippingInfo. Payment and ShippingInfo use order_id as both PK and FK.
- CartItem, OrderItem and GoodsReceiptItem currently reference product_variants.variant_id.
- Voucher targets may reference Products and Categories; usages key by order; CheckoutQuote has expiry/fingerprint and an optional resulting order.
- Report is query-based, not a physical table. AuditLog is append-only in the business contract.

### 2.4 Schema verification limits

SchemaMappingTests checks table set, entity/table ownership, mapped column names and nullability. It does not exhaustively compare every SQL type, numeric precision, default, FK action, CHECK and index to live database metadata. DatabaseConstraintsTests covers representative invariants, not a complete schema diff. P2 must extend tests for the target schema.

## 3. Owner-confirmed ERD v2 — 31-table structural baseline

The target scope is frozen to the exact diagram in [phase-1-erd-v2-approved.mmd](phase-1-erd-v2-approved.mmd). The table set and relationships below reproduce the owner-supplied logical schema. This freezes the logical structure; it does not pretend that all SQL types, lengths, nullability, defaults, indexes, FK actions or status literals have already been physically specified.

### 3.1 Target table inventory

| Group | Target tables | Count |
|---|---|---:|
| Identity and RBAC | ACCOUNTS, ADDRESSES, ROLES, PERMISSIONS, ACCOUNT_ROLES, ROLE_PERMISSIONS | 6 |
| Catalog and attributes | CATEGORIES, BRANDS, PRODUCTS, ATTRIBUTE_TYPES, ATTRIBUTES, ATTRIBUTE_OPTIONS, PRODUCT_ATTRIBUTE_VALUES, PRODUCT_IMAGES | 8 |
| Cart | CARTS, CART_ITEMS | 2 |
| Voucher, orders, COD payment and shipping | VOUCHERS, ORDERS, ORDER_ITEMS, ORDER_ADDRESSES, ORDER_VOUCHER_SNAPSHOTS, PAYMENTS, SHIPPING_INFOS | 7 |
| Procurement | SUPPLIERS, GOODS_RECEIPTS, GOODS_RECEIPT_ITEMS | 3 |
| Warehouse and stock ledger | WAREHOUSES, INVENTORIES, INVENTORY_TRANSACTIONS | 3 |
| Audit and content | AUDIT_LOGS, CONTENT_PAGES | 2 |
| **Total** | **31 target tables** | **31** |

### 3.2 Structural decisions locked by the ERD

- Product identity is represented by PRODUCTS parent/child rows using parent_product_id. PRODUCT_VARIANTS, SIZE_SYSTEMS, SIZE_VALUES and COLORS are not target tables.
- Child Product fields name, slug and description may be NULL to mean inherited; a NULL child selling_price means the price is inherited. cost_price is nullable. Those comments are part of the supplied contract and must be preserved.
- Attributes use ATTRIBUTE_TYPES, ATTRIBUTES, ATTRIBUTE_OPTIONS and PRODUCT_ATTRIBUTE_VALUES. The composite PK (product_id, attribute_id) permits at most one row for each Product/Attribute pair. The exact rule for selecting option_id versus text_value/number_value/boolean_value, including mutual-exclusion validation, still needs physical/service-level specification.
- CART_ITEMS, ORDER_ITEMS, GOODS_RECEIPT_ITEMS, INVENTORIES and INVENTORY_TRANSACTIONS point to PRODUCT IDs, not the old Variant IDs.
- INVENTORIES has the composite key (warehouse_id, product_id), quantity_on_hand and version. The target does **not** contain quantity_reserved or INVENTORY_RESERVATIONS.
- ORDER_ITEMS snapshots SKU, product name and attribute text. It does **not** contain image_url_snapshot.
- A single PAYMENTS row is related 1:1 to an order; the listed fields represent payment method/status/amount and COD collection attribution. The target does not contain PAYMENT_TRANSACTIONS or REFUNDS.
- SHIPPING_INFOS is a 1:0..1 order-side shipping record. The target does **not** contain SHIPMENTS, SHIPMENT_ITEMS or SHIPMENT_TRACKING_EVENTS.
- The target has no RETURNS or RETURN_ITEMS. An order status value alone must not be converted into a detailed return record.
- VOUCHERS and ORDER_VOUCHER_SNAPSHOTS exist, but the target does not include voucher-product/category join tables, a usage ledger or checkout_quotes.
- Marked UK annotations are retained exactly as shown in the ERD. In particular, ACCOUNTS.phone and ACCOUNTS.email are not marked unique, and PRODUCTS.slug is not marked unique. Do not silently assume or add those uniqueness constraints from the former draft.
- ORDER_ADDRESSES is keyed by order_id and preserves the delivery-address snapshot. ORDER_VOUCHER_SNAPSHOTS is keyed by order_id. INVENTORY_TRANSACTIONS has a unique idempotency_key.
- Target relationships and key annotations are logical design. Where the drawing does not state nullability or a physical constraint, document the rule and test it; do not treat a guessed SQL definition as owner-approved.

### 3.3 Target cardinalities

- ACCOUNTS ↔ ADDRESSES, CARTS ↔ CART_ITEMS, ORDERS ↔ ORDER_ITEMS, GOODS_RECEIPTS ↔ GOODS_RECEIPT_ITEMS and warehouse/product ↔ INVENTORIES follow the diagram's stated one-to-many or one-to-many composite relationships.
- Each Order has one ORDER_ADDRESS and one PAYMENTS row in the diagram; SHIPPING_INFOS is optional. ORDER_VOUCHER_SNAPSHOTS is optional and uses order_id as PK/FK.
- PRODUCTS may form a self-referencing parent/child hierarchy; categories may also form a self-referencing hierarchy.
- A stock ledger line may refer to a receipt item, an order item and an account as represented by the optional/required relationships in the diagram. The target has no quantity-after column.

## 4. Target data contract and explicit limitations

### 4.1 Accounts, addresses and RBAC

- ACCOUNTS adds full_name and status to the target contract. The current migration inventory does not establish a trusted source for every target full_name. Do not populate missing names with invented business data.
- The ERD does not mark ACCOUNTS.phone or ACCOUNTS.email as unique. Existing repository login behavior treats phone as the login identifier and the current V2 migration enforces phone uniqueness. Reconcile this physical/security requirement before writing target DDL: keep the logical ERD unchanged unless the owner changes it, but do not deploy an ambiguous login lookup or assume uniqueness merely from the column name.
- ADDRESSES changes the current free-form address source into recipient_name, recipient_phone, province, district, ward and address_line. Preserve source text verbatim in address_line when it cannot be reliably decomposed. Do not fabricate province/district/ward values.
- ACCOUNT_ROLES and ROLE_PERMISSIONS keep composite primary keys. Preserve role/permission codes and assignments through ID crosswalks. Do not infer new grants.

### 4.2 Catalog, parent/child Products and attributes

- Map each legacy parent Product to a parent PRODUCTS row. Map each legacy ProductVariant to a newly allocated child PRODUCTS row with parent_product_id pointing at its legacy parent. **Never reuse a legacy variant ID as a child Product ID.**
- SKU is marked unique in the supplied ERD. Products.slug is not marked unique in this version; do not import the previous draft's uniqueness assumption. Category and Brand slugs are marked unique.
- Existing override_price can map to child selling_price only under the stated NULL-means-inherit rule. A legacy parent price maps to parent selling_price. Compare effective prices before and after mapping for every sellable source Variant.
- Legacy SizeSystem/SizeValue/Color and other product traits require a crosswalk to target Attributes/AttributeOptions/ProductAttributeValues. Do not match entities solely because labels look alike. Preserve source labels and NULLs; do not invent data types or attribute semantics.
- The target adds cost_price to PRODUCTS and unit_cost to GOODS_RECEIPT_ITEMS. The inspected source schema does not provide authoritative historical cost values for these fields. Leave unknown costs unknown/NULL where permitted; never substitute selling price or zero as a fabricated cost.
- PRODUCT_IMAGES replaces the source alt_text-like shape with is_primary. Its exact primary-image rule must be explicit and deterministic. Source alt_text has no target column; a retention/archive disposition is required if any source value is populated.
- ORDER_ITEMS has no image_url_snapshot. Existing historical order image URLs must be dispositioned through an approved archive/retention method before the source column can be retired. This is not permission to add the missing column to the approved target ERD.

### 4.3 Cart, voucher and checkout scope

- CartItem.product_id maps from the old variant through the legacy Variant-to-child-Product crosswalk. Cart quantity and historical relationships must be reconciled.
- The target schema has only VOUCHERS and ORDER_VOUCHER_SNAPSHOTS for voucher persistence. It does not encode product/category targeting, a usage/redemption ledger, usage restoration or checkout quote expiry/fingerprint.
- The presence of discount columns does not define the discount formula, eligible scope, stacking, usage counting, cancellation restoration or status literals. These are separate business/API decisions and must not be fabricated during schema work.
- Source voucher_products, voucher_categories, voucher_usages and checkout_quotes are not target tables. Active voucher scope, usage history and in-flight quotes must be profiled; every source record must receive a documented transform, archive or owner-approved retirement disposition.
- ORDERS.idempotency_key is marked unique in the target but the source does not have an equivalent field on the order row. Its physical nullability, historical backfill and runtime retry semantics must be specified. A checkout quote fingerprint/ID is not automatically equivalent to an Order idempotency key.

### 4.4 Orders, payment and shipping

- Map order header totals without recomputing historical values. Target columns include subtotal, discount_amount, shipping_fee, total_amount, currency and status. The physical scale/precision and legal status literals still require a data dictionary.
- Current order rows contain recipient information inside the order record; the target uses ORDER_ADDRESSES. Structured address fields should only be populated from trustworthy source columns; otherwise retain the raw address in address_line. If legacy recipient_email or other source fields lack a target field, retain/archive them under an approved policy before source removal.
- ORDER_ITEMS uses product_id and includes sku_snapshot, product_name_snapshot, attribute_snapshot, quantity, unit_price, discount_amount and line_total. Existing size/color snapshots can only become attribute_snapshot under an agreed encoding; do not silently invent a serialization format.
- PAYMENTS is a one-row-per-order target shape. It cannot faithfully represent multiple payment attempts or separate refunds because the target contains neither PAYMENT_TRANSACTIONS nor REFUNDS. The current source stores aggregate due/received/refunded amounts and collection/refund actor-time data. Preserve all facts in mapped fields or an approved retained archive; never fabricate event-level attempts/refunds from aggregate totals.
- SHIPPING_INFOS contains recipient, carrier, tracking number, shipping status and shipped/delivered timestamps. The current source shipping row has fewer fields. Map only values actually present; never synthesize tracking numbers, shipment-line allocations or tracking events.
- The target has no Returns tables. Preserve legacy order state and relevant audit evidence, but do not create fake return requests/items from status RETURNED alone.

### 4.5 Procurement, warehouse and inventory

- SUPPLIERS adds a unique code while source supplier rows do not have an equivalent approved code in the current inventory. Code generation and collision policy must be deterministic and reviewed; do not create plausible-looking business codes without a recorded rule.
- GOODS_RECEIPTS retains supplier, receipt number, status, actors and timestamps but omits source receipt_date/note fields. GOODS_RECEIPT_ITEMS has unit_cost even though the current source item table does not. Profile these fields and explicitly disposition missing target equivalents.
- The target introduces WAREHOUSES. The source baseline has no warehouse table and its inventory is keyed by Variant. A warehouse assignment/backfill must be deliberate; do not distribute old quantity across multiple target warehouses.
- Source inventories.available_quantity describes sellable availability in the existing implementation, whereas the target says quantity_on_hand. They are not automatically semantically equivalent. Profile pending orders, cancellation behavior and any implicit reservations, then approve and test the conversion before assigning values.
- The target has no quantity_reserved or INVENTORY_RESERVATIONS. Do not create reservation rows or carry a reserved quantity into a nonexistent target column. Checkout/confirmation concurrency must use a design consistent with the approved tables and reviewed stock semantics.
- Preserve inventory ledger delta, type, actor and timestamp where source evidence exists. Link receipt/order lines only through unique crosswalk matches. INVENTORY_TRANSACTIONS.idempotency_key is new; its deterministic legacy backfill and uniqueness behavior need a recorded rule. Do not fabricate line-level source IDs.

### 4.6 Audit, content and general physical details

- AUDIT_LOGS has before_data/after_data JSON, entity_type/entity_id and correlation_id. Existing free-form audit description cannot automatically be transformed into before/after JSON. Retain the source description or its lossless equivalent in an approved archive.
- Map content page_code to CONTENT_PAGES.slug only when the conversion is collision-free. updated_by exists in the target; preserve updater attribution.
- Build the physical data dictionary for every target table before implementation: actual SQL type, length, precision/scale, nullability, default, PK/FK/UK/CHECK, index, FK delete/update action, timezone policy and allowed status literals. The ERD's logical annotations do not fully specify these.
- Define and test money non-negativity/rounding, positive quantities, inventory non-negativity/version updates, parent-child cycles, single-parent inheritance behavior, SKU uniqueness, attribute value type compatibility, primary-image uniqueness/order, address snapshot immutability, idempotency uniqueness and audit immutability. This list is a contract-completion checklist, not authorization to change the logical target table set.

## 5. Current source V1–V6 to target mapping

| Current source | Target mapping | Gate / no-invention rule |
|---|---|---|
| accounts | ACCOUNTS; account_id → id; preserve credentials, status where sourced, timestamps | Profile full_name source. Reconcile current unique phone constraint with the target ERD, which does not mark phone unique. |
| addresses | ADDRESSES; account_id FK remap; address_text → address_line | Do not fabricate recipient/province/district/ward values. |
| roles, permissions, account_roles, role_permissions | Same-named target entities with renamed IDs/columns | Preserve codes/assignments; test all remapped FKs. |
| categories, brands | Same-named target entities; remap IDs and retain slugs where source-backed | Check slug collisions and exact source availability before applying target unique constraints. |
| products | Parent PRODUCTS rows | Map trusted fields; generate/resolve missing slug only under a deterministic approved rule. |
| product_variants | Newly allocated child PRODUCTS rows | Keep a crosswalk old variant_id → new child product id; never reuse variant IDs as product IDs. |
| size_systems, size_values, colors and product fields such as gender/season/style/material_care | ATTRIBUTE_TYPES, ATTRIBUTES, ATTRIBUTE_OPTIONS, PRODUCT_ATTRIBUTE_VALUES | Preserve source identity/value crosswalks and typed meaning; no name-only matching and no fabricated attribute data. |
| product_images | PRODUCT_IMAGES | Preserve URL/order. Derive is_primary only under an approved deterministic rule; source alt_text requires retention/archive disposition. |
| carts, cart_items | CARTS, CART_ITEMS | Map old variant_id to child product_id; resolve account/guest rows according to physical nullability and approved identity contract. |
| vouchers and voucher_products/voucher_categories/voucher_usages | VOUCHERS and ORDER_VOUCHER_SNAPSHOTS where source facts match | Target has no scope joins or usage ledger; active scope/usage requires an approved archive/retirement mapping. |
| checkout_quotes | No direct target table | Drain/expire or preserve active quote state with an approved cutover plan; do not treat quote ID/fingerprint as the order idempotency key. |
| orders | ORDERS and ORDER_ADDRESSES | Preserve historical totals/status/recipient data; move addresses to snapshots. Map idempotency_key only under an approved rule. Retain any source-only fields. |
| order_items | ORDER_ITEMS | Variant crosswalk → child product; preserve SKU/name/quantity/prices. Encode legacy size/color only under an agreed attribute_snapshot format. image_url_snapshot has no target equivalent and requires retention disposition. |
| payments aggregate | PAYMENTS | Define how source amount_due/received/status maps to target amount/payment_status/method/currency. Refund aggregate and refund actor/time lack target equivalents; preserve/archive them. |
| shipping_infos | SHIPPING_INFOS | Map carrier/recipient/status/times only when source-backed. Do not invent a tracking number. |
| suppliers | SUPPLIERS | Name/contact/status mapping; target code needs an approved deterministic generation/crosswalk. Source address/note require disposition if present. |
| goods_receipts, goods_receipt_items | GOODS_RECEIPTS, GOODS_RECEIPT_ITEMS | Map receipt IDs/actors/status/quantities. receipt_date/note have no target columns; unit_cost is not sourced by the current item schema. |
| inventories | INVENTORIES under a deliberately assigned warehouse | Do not equate available_quantity with quantity_on_hand without stock-semantics sign-off and reconciliation. Target has no reserved quantity. |
| no source warehouse table | WAREHOUSES | Define the initial warehouse provisioning/mapping; do not invent multiple warehouses. |
| inventory_transactions | INVENTORY_TRANSACTIONS | Keep source delta/type/actor/time. Add an approved unique idempotency-key mapping and line-link crosswalk; don't invent quantity-after history. |
| audit_logs | AUDIT_LOGS | Map actor/action/entity/time where source-backed. Free-form description is not equivalent to before/after JSON. |
| content_pages | CONTENT_PAGES | page_code → slug only when collision-free; preserve updater attribution. |

## 6. P2 migration and recovery plan

1. **Profile a safe, sanitized database copy.** Capture exact Flyway version/DDL, row counts for all 32 current tables, null/duplicate distributions, orphan FKs, account phone collisions, SKU/category/brand slug conflicts, missing Products/images, order snapshots, active checkout quotes, voucher usage/scope rows, payment aggregates, supplier/receipt-only fields and inventory balances.
2. **Build complete source-to-target crosswalks.** Include Account/Role/Permission, Category/Brand/Product, Variant→child Product, size/color→attribute/option, CartItem/OrderItem/receipt item, address, supplier, warehouse and ledger references. Report zero and multiple candidates; never pick an arbitrary match.
3. **Publish a data-disposition ledger before DDL.** Every populated source field without a target equivalent must be marked transform, retain/archive or owner-approved retirement, with row counts and evidence. Include order image snapshots, payment/refund aggregates, voucher targeting/usage, checkout quotes, address fragments, receipt date/note, supplier source-only fields, audit descriptions and order-only fields.
4. **Implement an additive Flyway expansion after V6.** Keep V1–V6 immutable. Build the 31-table target alongside the source schema and temporary crosswalk/archive structures only after physical DDL and disposition rules are approved. Do not drop legacy columns or tables in the expansion/backfill migration.
5. **Backfill parent/child Products and attributes.** Assign new IDs to child Products, map variant SKU/pricing/status under approved rules and verify one-to-one crosswalk completeness and effective-price equivalence.
6. **Backfill transactional facts and stock in dependency order.** Reconcile addresses, order lines/snapshots, COD amounts and collection attribution, shipping info, receipt quantities and inventory movements. Every aggregate or missing source field gets an explicit treatment; never synthesize payment, refund, shipment, return or reservation events.
7. **Verify from both empty and populated fixtures.** Run MySQL 8.4 migration/mapping/constraint tests and H2 tests where supported. Compare row counts, IDs/crosswalks, FKs, unique conflicts, Product hierarchy/cycles, attribute types/options, prices, image ordering, order totals/snapshots, payment aggregate reconciliation, inventory balances/ledger and audit retention.
8. **Rehearse cutover and recovery on an isolated environment.** Define write freeze/dual-write or compatibility window, active checkout drain, backup/restore, rollback point, reconciliation acceptance and API release ordering. Keep the old data intact until the release passes.
9. **Contract legacy objects only in a later reviewed migration.** Drop old Variant/size/color, voucher join/usage, quote and source-only columns only after no old code path writes them and the owner-approved data-retention ledger is complete.

### 6.1 Recovery boundary

Before backfill, recovery means discard/recreate the isolated target schema and rerun after correcting the mapping. After traffic is switched, recovery also requires replay/reconciliation of writes made after cutover. A Flyway rollback script alone is not proof of recoverability. Never run a destructive migration on production as a substitute for rehearsal.

## 7. Dependency map and verification scope

| Area | Target change | Required verification |
|---|---|---|
| account/RBAC | IDs and account/address shape | login/uniqueness rule, roles/permissions, address snapshot, FK remap |
| product/catalog | Variant becomes child Product; typed attributes and image primary flag | parent/child inheritance, SKU/price preservation, options/type integrity, cycle prevention, image ordering |
| cart/checkout | cart lines point to Product; quote table absent | ID crosswalk, quantity rules, concurrency and quote cutover strategy |
| voucher/order | reduced voucher persistence, order snapshots and idempotency column | source usage/scope disposition, totals, duplicate-request rules, address/attribute snapshot consistency |
| payment/shipping | 1:1 aggregate COD payment and optional single shipping-info row | payment aggregate reconciliation, collection attribution, no fictitious refund/shipment events |
| procurement/inventory | receipt items use Product; warehouse composite inventory | opening stock semantics, warehouse mapping, immutable ledger/idempotency, concurrency/no negative stock |
| audit/content | revised audit JSON and page slug/updater fields | source-only descriptions, attribution and collision-free page slugs |
| frontend/API | persistence target changes do not automatically approve a public contract change | no silent renaming of variant IDs/DTOs/routes; use an explicit compatibility plan |

Required verification includes clean migration, populated-fixture migration, SchemaMappingTests, database constraint tests, Cart/Checkout/Order tests, receipt/Inventory transaction and concurrency tests, RBAC tests, report checks and frontend contract tests wherever an approved API change is made. Any expected behavior unsupported by the 31-table ERD must be classified as a business/API decision or a migration blocker, not implemented by adding unapproved schema.

## 8. Decision and blocker log after owner confirmation

| ID | Decision / unresolved item | State |
|---|---|---|
| D1 | The exact owner-supplied target ERD is the sole target structure for this refactor. | **FROZEN — 31 TABLES** |
| D2 | The earlier 38-table draft is superseded; do not reintroduce its payment/refund transaction, shipment event, return or inventory reservation tables. | **SUPERSEDED** |
| D3 | ProductVariant/size/color is not part of target schema; old Variant IDs map through a crosswalk to newly allocated child Product IDs. | **REQUIRED INVARIANT** |
| D4 | ACCOUNTS.phone/email uniqueness, physical nullable definitions and login lookup constraints are not fully specified by the target ERD. | **PHYSICAL CONTRACT GATE** |
| D5 | Product inheritance is stated for child name/slug/description/selling_price. Other nullability, attribute typed-value exclusivity and status rules need a data dictionary/tests. | **CONTRACT COMPLETION REQUIRED** |
| D6 | Target stock uses quantity_on_hand with warehouse/product key and no reservation table/quantity_reserved. Source available_quantity semantics require reconciliation. | **MIGRATION GATE** |
| D7 | The target omits source image snapshots, voucher scope/usage, checkout quotes, payment/refund aggregates, source-only address/order/receipt/supplier/audit fields and other legacy facts. | **DATA RETENTION GATE** |
| D8 | Unique order/inventory idempotency keys are present in the target, but source-row backfill and runtime semantics need explicit rules. | **PHYSICAL + API GATE** |
| D9 | Current V1–V6 migrations must remain immutable; new target migration must be additive and rehearsed from both clean and populated DB fixtures. | **REQUIRED RELEASE GATE** |
| D10 | Live source data profile and populated migration rehearsal are not available as verified evidence here. | **NOT RUN** |

## 9. P1 exit checklist

| Criterion | State | Evidence |
|---|---|---|
| Owner-confirmed target scope recorded | **PASS** | Exact 31-table owner-supplied ERD committed in phase-1-erd-v2-approved.mmd |
| Earlier draft corrected | **PASS** | The old 38-table model and its assumptions are removed from the canonical target diagram/contract |
| Current source schema inventory retained | **PASS for source documentation** | V1–V6 current migration inventory retained separately from the target |
| Target mapping described | **PARTIAL** | Mapping is explicit, but source-only data disposition and populated data profiles remain open |
| Physical DDL dictionary complete | **PARTIAL** | Nullability, defaults, SQL lengths/types/precision, FK actions, checks, indexes and status literals are not fully specified by the logical ERD |
| Empty + populated migration tests | **NOT RUN** | Requires implementation and an isolated sanitized fixture |
| Production/live data reconciled | **NOT RUN** | No live database profile or cutover evidence is claimed |
| P1 documentation branch backend CI | **NOT VERIFIED** | Baseline CI pass does not imply a run for the current documentation head |

## 10. Conditions before P2 implementation/cutover

1. Preserve the exact 31-table target ERD. Do not expand it to 38 tables or reintroduce columns/tables from the superseded draft without owner approval.
2. Review and complete docs/refactor/phase-1-physical-data-dictionary.md without contradicting the owner-supplied logical scope. Resolve phone/login behavior and all PHY-01–PHY-26 entries relevant to source rows before target DDL.
3. Approve a row/field-level transform/archive/retire disposition for every source-only fact, especially image snapshots, voucher usages/scopes, checkout quotes, payment refund aggregates and audit descriptions.
4. Profile a sanitized current database and build complete ID crosswalks; do not infer unseen data from schema alone.
5. Validate source stock semantics against target quantity_on_hand; the existing available_quantity must not be copied mechanically.
6. Keep V1–V6 immutable, implement new migration work additively, and prove clean-install plus populated-fixture migration and recovery before any production cutover.
7. Do not make API/DTO changes merely because persistence IDs change. Define and test backward compatibility/cutover separately.

**P1 conclusion:** The target table set is now frozen at 31 tables and documented against the owner's exact schema. P1 remains PARTIAL: the diagram alone does not settle physical SQL details, legacy data retention, source/target identity crosswalks or populated-data reconciliation. No live/destructive migration has been run.

## 11. Follow-on preflight package and verification boundary

The following preparation artifacts are now committed on the P1 branch:

- [Physical data dictionary](phase-1-physical-data-dictionary.md): enumerates all 31 target tables and their listed columns; the exact logical table set is frozen, but physical details and data-retention blockers remain open.
- [Read-only source preflight SQL](../../backend/src/test/resources/refactor/phase-1-source-preflight.sql): verifies source table inventory, exact row counts and data-quality signals for identity, Product/Variant crosswalks, images, orders, payments, shipping, receiving, stock ledger, vouchers, quotes and audit data.
- [Synthetic source fixture](../../backend/src/test/resources/refactor/phase-1-source-fixture.sql): INSERT-only records with synthetic IDs/contact values, including a deliberate missing-inventory row to exercise source drift detection.
- [Preflight runbook](phase-1-preflight-runbook.md): describes safe execution on a disposable/sanitized database and interpretation of the outputs.
- [Static artifact guard](../../backend/src/test/java/com/fido/persistence/Phase1PreflightArtifactTests.java): checks that preflight statements are SELECT-only and that the fixture is INSERT-only and covers the key legacy data gaps.

**Execution status:** these SQL files have not been run against MySQL in this task. The JUnit guard has been authored but has not been executed in CI here. The baseline backend run PASS applies only to the older baseline commit; it is not proof that the new artifacts compile or the fixture loads. A clean and populated MySQL rehearsal is still required.

## Appendix A — constraint-name ledger from source migrations

This appendix records names explicitly present in migration DDL. Where V5 declares an inline FK/UNIQUE/PK without a constraint name, this document intentionally does not guess a MySQL-generated physical name. Confirm actual names with metadata from the target database copy before cutover.

### A.1 Named foreign keys from V1

| Constraint | Relationship |
|---|---|
| fk_addresses_account_id | addresses.account_id → accounts.account_id |
| fk_account_roles_account_id | account_roles.account_id → accounts.account_id |
| fk_account_roles_role_id | account_roles.role_id → roles.role_id |
| fk_role_permissions_role_id | role_permissions.role_id → roles.role_id |
| fk_role_permissions_permission_id | role_permissions.permission_id → permissions.permission_id |
| fk_categories_parent_category_id | categories.parent_category_id → categories.category_id |
| fk_size_values_size_system_id | size_values.size_system_id → size_systems.size_system_id |
| fk_products_category_id | products.category_id → categories.category_id |
| fk_products_brand_id | products.brand_id → brands.brand_id |
| fk_products_size_system_id | products.size_system_id → size_systems.size_system_id |
| fk_product_images_product_id | product_images.product_id → products.product_id |
| fk_product_variants_product_id | product_variants.product_id → products.product_id |
| fk_product_variants_size_value_id | product_variants.size_value_id → size_values.size_value_id |
| fk_product_variants_color_id | product_variants.color_id → colors.color_id |
| fk_carts_account_id | carts.account_id → accounts.account_id |
| fk_cart_items_cart_id | cart_items.cart_id → carts.cart_id |
| fk_cart_items_variant_id | cart_items.variant_id → product_variants.variant_id |
| fk_orders_customer_account_id | orders.customer_account_id → accounts.account_id |
| fk_orders_voucher_id | orders.voucher_id → vouchers.voucher_id |
| fk_order_items_order_id | order_items.order_id → orders.order_id |
| fk_order_items_variant_id | order_items.variant_id → product_variants.variant_id |
| fk_payments_order_id | payments.order_id → orders.order_id |
| fk_payments_collected_by_account_id | payments.collected_by_account_id → accounts.account_id |
| fk_payments_refunded_by_account_id | payments.refunded_by_account_id → accounts.account_id |
| fk_shipping_infos_order_id | shipping_infos.order_id → orders.order_id |
| fk_goods_receipts_supplier_id | goods_receipts.supplier_id → suppliers.supplier_id |
| fk_goods_receipts_created_by_account_id | goods_receipts.created_by_account_id → accounts.account_id |
| fk_goods_receipts_confirmed_by_account_id | goods_receipts.confirmed_by_account_id → accounts.account_id |
| fk_goods_receipt_items_receipt_id | goods_receipt_items.receipt_id → goods_receipts.receipt_id |
| fk_goods_receipt_items_variant_id | goods_receipt_items.variant_id → product_variants.variant_id |
| fk_inventories_variant_id | inventories.variant_id → product_variants.variant_id |
| fk_inventory_transactions_variant_id | inventory_transactions.variant_id → product_variants.variant_id |
| fk_inventory_transactions_order_id | inventory_transactions.order_id → orders.order_id |
| fk_inventory_transactions_goods_receipt_id | inventory_transactions.goods_receipt_id → goods_receipts.receipt_id |
| fk_inventory_transactions_actor_account_id | inventory_transactions.actor_account_id → accounts.account_id |
| fk_audit_logs_actor_account_id | audit_logs.actor_account_id → accounts.account_id |
| fk_content_pages_updated_by_account_id | content_pages.updated_by_account_id → accounts.account_id |

V5 also declares inline foreign keys for voucher_products (voucher/product), voucher_categories (voucher/category), voucher_usages (order/voucher/account), and checkout_quotes (account/order). Their migration statements do not provide stable explicit constraint names.

### A.2 Named unique constraints from V1–V4

| Constraint | Columns |
|---|---|
| uq_roles_1 | roles(code) |
| uq_permissions_1 | permissions(code) |
| uq_brands_1 | brands(name) |
| uq_size_systems_1 | size_systems(code) |
| uq_size_values_1 | size_values(size_system_id, code) |
| uq_colors_1 | colors(code) |
| uq_product_variants_1 | product_variants(product_id, size_value_id, color_id) |
| uq_product_variants_2 | product_variants(sku) |
| uq_cart_items_1 | cart_items(cart_id, variant_id) |
| uq_vouchers_1 | vouchers(code) |
| uq_orders_1 | orders(order_code) |
| uq_goods_receipts_1 | goods_receipts(receipt_code) |
| uq_goods_receipt_items_1 | goods_receipt_items(receipt_id, variant_id) |
| uq_content_pages_1 | content_pages(page_code) |
| uq_accounts_phone | accounts(phone), added by V2 |
| uq_product_images_product_sort_order | product_images(product_id, sort_order), added by V4 |

V1–V4 additionally use primary keys as declared per table. V5 defines the composite primary keys on voucher_products and voucher_categories; voucher_usages.order_id and checkout_quotes.quote_id are primary keys; checkout_quotes.order_id is also UNIQUE. V5 leaves those inline constraint names unspecified.

### A.3 Named CHECK constraints from V1/V4

| Constraint | Expression or rule |
|---|---|
| ck_products_base_price | products.base_price >= 0 |
| ck_product_variants_override_price | product_variants.override_price >= 0 |
| ck_cart_items_quantity | cart_items.quantity > 0 |
| ck_orders_subtotal_snapshot | orders.subtotal_snapshot >= 0 |
| ck_orders_discount_snapshot | orders.discount_snapshot >= 0 |
| ck_orders_shipping_fee_snapshot | orders.shipping_fee_snapshot >= 0 |
| ck_orders_total_snapshot | orders.total_snapshot >= 0 |
| ck_orders_rule_1 | order_status in PENDING, CONFIRMED, PREPARING, SHIPPING, COMPLETED, DELIVERY_FAILED, CANCELLED, RETURNED |
| ck_orders_rule_2 | voucher_id is NULL or customer_account_id is not NULL |
| ck_order_items_unit_price_snapshot | order_items.unit_price_snapshot >= 0 |
| ck_order_items_quantity | order_items.quantity > 0 |
| ck_order_items_line_total_snapshot | order_items.line_total_snapshot >= 0 |
| ck_payments_amount_due | payments.amount_due >= 0 |
| ck_payments_amount_received | payments.amount_received >= 0 |
| ck_payments_amount_refunded | payments.amount_refunded >= 0 |
| ck_payments_rule_1 | payment_status in UNPAID, PAID, REFUNDED |
| ck_goods_receipts_rule_1 | receipt_status in DRAFT, CONFIRMED, CANCELLED |
| ck_goods_receipt_items_quantity | goods_receipt_items.quantity > 0 |
| ck_inventories_available_quantity | inventories.available_quantity >= 0 |
| ck_inventory_transactions_quantity_delta | inventory_transactions.quantity_delta <> 0 |
| ck_product_images_sort_order | product_images.sort_order >= 0, added by V4 |

### A.4 Explicit non-unique indexes in migrations

| Migration | Index | Columns |
|---|---|---|
| V3 | idx_goods_receipts_supplier_date | goods_receipts(supplier_id, receipt_date) |
| V3 | idx_goods_receipts_status | goods_receipts(receipt_status) |
| V3 | idx_goods_receipt_items_variant | goods_receipt_items(variant_id) |
| V3 | idx_inventory_transactions_variant_created | inventory_transactions(variant_id, created_at) |
| V3 | idx_inventory_transactions_order | inventory_transactions(order_id) |
| V3 | idx_inventory_transactions_receipt | inventory_transactions(goods_receipt_id) |
| V5 | ix_voucher_usage_count | voucher_usages(voucher_id, restored, account_id) |

There is no V1–V6 migration named for a standalone warehouse or Product-Attribute index because those candidate tables do not exist in the current schema. Proposed V2 indexes must be specified only after access patterns/cardinality are approved and should be justified by query plans, not added speculatively.
