# FIDO — Phase 1: ERD v2 & Data Contract

- **Status: PARTIAL.** The owner-confirmed ERD v2 structure is now captured in this branch. The prior assumption that no authoritative ERD existed is corrected. Remaining blockers concern migration/data reconciliation and contract details not encoded by the logical diagram, not whether the target table model is selected.
- **Repository:** https://github.com/quangson2809/FIDO
- **Baseline branch:** demo1
- **Baseline SHA:** f931602c86fdf5a59b487d6edd77331b7d64333a
- **P1 branch:** docs/phase-1-erd-v2-freeze
- **Date:** 2026-10-22 (Asia/Ho_Chi_Minh)
- **Scope:** evidence-based current-schema inventory, candidate ERD v2, data contracts, V1→V2 mapping, migration/recovery design, dependency map and decision log.
- **Excluded:** editing V1–V6, live database writes, destructive DDL, bulk Java/API refactor, unapproved endpoint changes, merge to demo1/main.

> Owner confirmation on 2026-10-22 establishes the ERD in docs/refactor/phase-1-erd-v2-approved.mmd as the target structural model. It was recovered from the prior FIDO Library artifact Pasted text(2).txt, which was not committed in demo1 at the inspected baseline. This supersedes the earlier statement that no target ERD was available. The schema structure is not being redesigned in this phase; data-loss, nullability, status-value and cutover requirements that are not represented by the logical ERD remain explicit implementation gates.

## 1. Execution summary and evidence boundary

### 1.1 Work performed

1. Verified the remote demo1 ref and commit metadata.
2. Read the current source-of-truth, data-model, module-ownership, transaction, phase roadmap and technical-decision documents.
3. Read the complete source of Flyway migrations V1–V6 and checked their table/column/index effects.
4. Read the P0 audit report from its separate branch, refactor/p0-baseline-audit. That report is not part of demo1 at the audited baseline SHA.
5. Inspected representative Product/ProductVariant, Inventory, InventoryTransaction, CartItem, OrderItem and GoodsReceiptItem entities, the InventoryCommandService write boundary, schema-mapping/migration tests, API ownership and backend CI workflow.
6. Created this P1 branch from the exact demo1 SHA, then added the owner-confirmed ERD recovered from the FIDO Library. No application code or migration was modified.

### 1.2 Verified facts versus unavailable evidence

| Item | Result | Evidence / limitation |
|---|---|---|
| Remote baseline | VERIFIED | demo1 → f931602c86fdf5a59b487d6edd77331b7d64333a; merge commit for PR #22 on 2026-10-21. |
| Migration chain | VERIFIED IN SOURCE | backend/src/main/resources/db/migration/V1…V6. |
| Application tables from the complete migration DDL | 32 | V1 creates 28; V5 adds 4; V2/V3/V4/V6 add no tables. |
| Application columns from migration DDL | 186 | P0 DDL count: 161 in V1 + 2 in V4 + 10 voucher columns + 13 columns across the four V5 tables. |
| Owner-confirmed target ERD | 38 logical tables | Recorded in docs/refactor/phase-1-erd-v2-approved.mmd; target count is distinct from current 32-table V1–V6 schema. |
| JPA entity-backed tables | 30 | SchemaMappingTests maps all entity-backed tables. voucher_products and voucher_categories are two relational tables without standalone JPA entities. |
| Flyway system table | Not included in 32 | A successfully migrated runtime schema normally also has flyway_schema_history; the actual runtime database was not introspected. |
| Current deployed database migration version, live row counts and data profile | UNVERIFIED / BLOCKED | No approved database connection/credentials or sanitized database copy was available to the P0 audit. Source DDL does not prove any live instance has migrated through V6. |
| ERD v2 source artifact | NOT FOUND at baseline | No v2 diagram/target DDL was present in the recursive demo1 tree at the baseline SHA. |
| Local working tree | UNVERIFIED / BLOCKED | GitHub API can inspect/edit remote refs; it cannot prove the state of the user's local checkout. |
| Baseline backend CI | PASS on exact baseline SHA | Run 39631789377 completed successfully on demo1 SHA f931602c86fdf5a59b487d6edd77331b7d64333a. H2 build/test and MySQL 8.4 migration/mapping/test passed. This does not test this new documentation commit. |

### 1.3 The 28-versus-32 documentation discrepancy

The name V1__baseline_28_tables.sql describes the original V1 baseline. docs/00-source-of-truth.md, docs/02-module-ownership.md, docs/03-data-model.md and reference/table-ownership.csv also describe that 28-table baseline. The complete migration chain now defines 32 application tables because V5 added voucher_products, voucher_categories, voucher_usages and checkout_quotes.

Do not delete or roll back these four V5 tables just to force the total back to 28. The docs have drifted from the full migration chain. This P1 inventory uses all V1–V6 sources, but does not claim live database introspection.

P0 report: https://github.com/quangson2809/FIDO/blob/refactor/p0-baseline-audit/docs/refactor/p0-baseline-audit.md

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

## 3. Owner-confirmed ERD v2 — structural baseline

The owner confirmed that the database model is already finalized. The canonical target ERD is now in [phase-1-erd-v2-approved.mmd](phase-1-erd-v2-approved.mmd), copied from the prior FIDO Library artifact Pasted text(2).txt. This replaces the earlier candidate-only diagram. Do not redesign the target table set during P2 without an explicit owner change request.

### 3.1 Target table inventory (38 tables)

| Owner module | Target tables |
|---|---|
| account | ACCOUNTS, ADDRESSES, ROLES, PERMISSIONS, ACCOUNT_ROLES, ROLE_PERMISSIONS |
| product | CATEGORIES, BRANDS, PRODUCTS, ATTRIBUTE_TYPES, ATTRIBUTES, ATTRIBUTE_OPTIONS, PRODUCT_ATTRIBUTE_VALUES, PRODUCT_IMAGES |
| cart | CARTS, CART_ITEMS |
| promotion | VOUCHERS |
| order | ORDERS, ORDER_ITEMS, ORDER_ADDRESSES, ORDER_VOUCHER_SNAPSHOTS, PAYMENTS, PAYMENT_TRANSACTIONS, REFUNDS, SHIPMENTS, SHIPMENT_ITEMS, SHIPMENT_TRACKING_EVENTS, RETURNS, RETURN_ITEMS |
| inventory | SUPPLIERS, GOODS_RECEIPTS, GOODS_RECEIPT_ITEMS, WAREHOUSES, INVENTORIES, INVENTORY_RESERVATIONS, INVENTORY_TRANSACTIONS |
| audit | AUDIT_LOGS |
| content | CONTENT_PAGES |
| **Total** | **38 target tables** |

The target and current counts are not directly comparable as a simple “add six tables” operation: several source tables are transformed/replaced, target tables rename keys to id, and new transaction/history resources are added.

### 3.2 Structural changes fixed by the target ERD

- One PRODUCTS table represents parent and child rows via parent_product_id. ProductVariant, SizeSystem, SizeValue and Color are not target business tables; typed attributes and child Product records replace them.
- Attribute data is split into ATTRIBUTE_TYPES, ATTRIBUTES, ATTRIBUTE_OPTIONS and PRODUCT_ATTRIBUTE_VALUES. PRODUCT_ATTRIBUTE_VALUES has the composite PK (product_id, attribute_id), so a Product has at most one stored value per Attribute in this ERD version.
- Cart and transaction lines reference product_id, not variant_id.
- Inventory is keyed by (warehouse_id, product_id) and has quantity_on_hand, quantity_reserved and version. INVENTORY_RESERVATIONS is an explicit target table.
- Order delivery-address and voucher facts have dedicated ORDER_ADDRESSES and ORDER_VOUCHER_SNAPSHOTS records.
- Payment and fulfillment history is represented by PAYMENTS, PAYMENT_TRANSACTIONS, REFUNDS, SHIPMENTS, SHIPMENT_ITEMS, SHIPMENT_TRACKING_EVENTS, RETURNS and RETURN_ITEMS.
- INVENTORY_TRANSACTIONS can link to a GoodsReceiptItem, OrderItem and/or InventoryReservation, and carries a unique idempotency key.
- The logical ERD uses id as the primary-key naming convention for most entities. The composite keys of ACCOUNT_ROLES, ROLE_PERMISSIONS, PRODUCT_ATTRIBUTE_VALUES and INVENTORIES remain composite. ORDER_ADDRESSES and ORDER_VOUCHER_SNAPSHOTS use order_id as their PK/FK.

### 3.3 Target relationships and cardinalities

- Account 1—N Addresses; Account N—M Roles; Role N—M Permissions.
- Category is a self-referencing tree; Category 1—N Products. Brand 0..1—N Products. Product 0..1 parent—N children.
- AttributeType 1—N Attributes; Attribute 1—N Options; Product N—M Attributes through ProductAttributeValues.
- Product 1—N ProductImages, CartItems, OrderItems, GoodsReceiptItems, Inventories per Warehouse, InventoryReservations and InventoryTransactions.
- Cart 1—N CartItems. Order 1—N OrderItems; Order 1—1 OrderAddress; Order 0..1 OrderVoucherSnapshot; Order 0..N Payments, Shipments and Returns.
- Payment 1—N PaymentTransactions; PaymentTransaction 1—N Refunds.
- Shipment 1—N ShipmentItems and ShipmentTrackingEvents; ShipmentItem references OrderItem. Return 1—N ReturnItems; ReturnItem references OrderItem.
- Warehouse 1—N Inventories, InventoryReservations and InventoryTransactions. Supplier 1—N GoodsReceipts; GoodsReceipt 1—N GoodsReceiptItems.

The ERD is the fixed structural reference. It does not encode every SQL nullability, default, CHECK expression, index or enum value. The following data contract makes those semantics explicit where they can be derived safely; unrepresented values are flagged rather than guessed.

## 4. Target data contract

### 4.1 Product parent/child and inherited fields

- parent_product_id is nullable for root Products and references PRODUCTS.id when present. Direct self-parenting is invalid. If reparenting is supported, the service must also reject cycles of any length within a transaction; a self-FK alone cannot do that.
- Parent/child is represented by identity in one table, not by SKU-null inference and not by a separate ProductVariant table.
- Per the established parent/child model, the parent is the source for shared catalog fields; the child stores its identity (SKU), child-specific price when explicitly overridden, and Attribute values that distinguish the child. Inheritable fields are stored as NULL on children where the owner’s inheritance rule specifies that behavior; read paths resolve the effective value through one Catalog-owned resolver. Omitted PATCH fields mean “unchanged”; explicit NULL means “inherit” only for fields defined as inheritable.
- The target includes category_id, brand_id, name, slug, description, selling_price and cost_price on PRODUCTS. The ERD alone does not specify nullability or inheritance for each of these. P2 must encode the agreed inheritance contract in SQL nullability, validation and tests; do not silently copy parent data to every child.
- SKU and slug are marked unique in the target ERD. SKU may be nullable on non-sellable/group rows only if the agreed selling rule allows it; preflight source and target duplicate/collation rules before adding uniqueness.
- Existing effective selling price is COALESCE(product_variants.override_price, products.base_price). Mapping an old Variant’s nullable override_price to the child selling_price preserves that distinction; parent base_price maps to the parent selling_price. A NULL child price is an inheritance marker only if confirmed by the field contract.
- The source does not store cost_price on Products/Variants. Do not populate target cost_price from selling price or invent historic cost. For existing rows with no trustworthy cost source, use the approved nullable/unknown representation or retain the value in migration evidence.
- The target has status and deleted_at. Status literals and whether parent status gates child purchase must be consistent across Catalog, Cart, Checkout and Inventory; do not infer purchasability from parent_product_id alone. A deleted Product with historical references must not be hard-deleted.
- Category cycles, invalid leaf assignment (if retained by the approved catalog contract), missing parent identity and duplicate sellable-child identity must be rejected before persistence. Do not perform recursive EAGER loading; use bounded query/projection patterns.

### 4.2 Attribute integrity

- Every Attribute belongs to one AttributeType; every AttributeOption belongs to one Attribute; ProductAttributeValue references one Product and one Attribute.
- The composite PK (product_id, attribute_id) enforces one Product value per Attribute. Multi-select data would require a structural change and is not implied by this ERD.
- Exactly one of option_id, text_value, number_value and boolean_value should be populated for a single value. The populated representation must match ATTRIBUTES.data_type. A normal CHECK cannot query ATTRIBUTES or ATTRIBUTE_OPTIONS, so cross-table type/option ownership must be validated in the product Service or by a reviewed composite-FK design.
- An option used by a value must belong to the same Attribute as the value row. Enforce this in Service and tests; a lone FK to option_id is insufficient to prove the attribute_id/option relationship.
- Attribute option identity/code/label is Catalog master data. Any human-readable value copied to an OrderItem snapshot must remain unchanged after later option edits. Product values must not be recomputed from the current Attribute catalog when displaying old orders.
- The final ERD has data_type, unit, is_filterable and is_active but not explicit is_required or is_variant_defining columns. Do not implement policy by inventing hidden columns or by hard-coding attribute names without owner-approved semantics. If child-combination uniqueness is required, define the exact set of key attributes from an approved rule before adding a uniqueness mechanism.
- Migration mapping: old SizeSystem identity must remain traceable to the target size Attribute/options; each old SizeValue maps to one AttributeOption; Color values map to options under the target Attribute model. Existing gender, season, style and material_care values should preserve their exact strings when mapped. Preserve NULLs; do not invent enum values.

### 4.3 Product images

- PRODUCT_IMAGES belongs to one Product and contains image_url, is_primary and sort_order.
- Enforce sort_order >= 0 and UNIQUE(product_id, sort_order). At most one image per Product may be primary. Keep is_primary consistent with the selected primary/cover ordering under one Catalog service transaction; do not allow two independent “cover” truths to diverge.
- The current source uses alt_text and sort_order, while the target ERD omits alt_text and adds is_primary. The target schema does not provide a permanent alt_text column. Its disposition must be recorded in the migration reconciliation artifact; do not silently drop populated source data during backfill.
- Current ORDER_ITEMS.image_url_snapshot is historical data. The target ORDER_ITEMS diagram has no image snapshot column. Until an approved representation in the target contract preserves that fact for customer/admin order history, P2 cannot claim image-snapshot preservation PASS or drop the source column and its values.

### 4.4 Warehouse, Inventory, reservations and immutable ledger

- INVENTORIES composite PK is (warehouse_id, product_id). Both references must exist. quantity_on_hand and quantity_reserved are non-negative integers; require quantity_reserved <= quantity_on_hand if “reserved” is a subset of on-hand stock. The derived sellable availability is quantity_on_hand - quantity_reserved under that definition. version is non-negative and must participate in the chosen optimistic-lock/conditional-update implementation.
- A reservation has one Warehouse, one Product and one Order, with positive quantity. The implementation must define legal status literals and expiration/release transitions; duplicate release/consume must be a no-op or conflict, never double-decrement/double-release.
- Each non-zero inventory movement updates the matching inventory row and inserts exactly one INVENTORY_TRANSACTIONS row in the same Service transaction. Transaction quantity_delta is non-zero; quantity_after cannot be negative. idempotency_key is unique and each business operation retry must return/reject deterministically rather than create a second movement.
- Goods receipt confirmation, order reservation/commit, cancellation/release and return handling must be atomic with the corresponding ledger/Order/Receipt state changes. Acquire multiple inventory locks in a stable (warehouse_id, product_id) order.
- The old system stores available_quantity (sellable quantity), does not have reservation rows and does not separate physical on-hand from reserved quantity. For existing stock, a candidate initial mapping is quantity_on_hand = old available_quantity and quantity_reserved = 0, because legacy Cart does not reserve stock. Verify actual code/data and any outstanding order deductions before applying that transformation. Do not interpret a historical cart line as a reservation.
- V3 backfills zero inventory rows for existing Variants. P2 must reconcile every old Variant to one child Product and one default Warehouse row; current source has one warehouse only. Do not infer multiple old warehouses.
- Current inventory_transactions has no quantity_after, line-level receipt/order references or idempotency key. Link a legacy ledger row to a receipt/order line only when source + old Variant match uniquely. A deterministic legacy idempotency key may be derived from the old transaction identity, but quantity_after cannot be fabricated from current balance if the old movement sequence lacks a known opening balance.
- unit_cost is present in target GOODS_RECEIPT_ITEMS but absent from source. Old cost is unknown unless there is a trustworthy external source. Do not use zero or selling price as a pretend purchase cost.

### 4.5 Order, voucher snapshots, Payment, Shipment and Return

- ORDERS separates status, payment_status and fulfillment_status. Treat them as distinct state dimensions; do not collapse them into one lifecycle. Status literal sets and transition effects must be encoded consistently in Service and tests.
- order_number is unique. idempotency_key is unique in the target ERD, but the uniqueness scope, payload-conflict behavior, retry response and retention period must remain consistent with the approved API contract. checkout_quotes.quote_id/fingerprint is not automatically equivalent to an order idempotency key.
- Header totals remain server-calculated money values with DECIMAL(18,2)/BigDecimal. Every order line preserves product_id identity plus sku_snapshot, product_name_snapshot, variant_description_snapshot, quantity, unit_price, discount_amount and line_total. Snapshot values must not be rewritten by later Catalog or Attribute edits.
- Each Order has its own immutable ORDER_ADDRESSES snapshot. Do not derive historical recipient data from the Account’s current Addresses. Legacy address_text cannot be reliably decomposed into province/district/ward; preserve the raw source in address_line unless verified structured data exists.
- ORDER_VOUCHER_SNAPSHOTS preserves the voucher facts used when an order is placed. Do not backfill historical discount_type/value from today’s mutable Voucher row if the value used historically is unknown.
- The target ERD retains VOUCHERS but omits current voucher_products, voucher_categories and voucher_usages. The replacement for current product/category targeting and usage/restoration semantics is not represented by the target diagram. Before retiring those source tables, prove there are no dependent active vouchers/usage rows or produce an owner-approved migration/retention mapping; never silently widen/narrow scope or discard usage history.
- PAYMENTS is 1—N from Orders in the target. PAYMENT_TRANSACTIONS stores payment attempts and REFUNDS stores refund records. The old schema has one aggregate Payment row per Order with amount_due, amount_received, amount_refunded and collection/refund actor/time, not a complete event ledger. Do not create fictitious external payment attempts/refunds from aggregates. Preserve summary facts through a reviewed target mapping or retained migration archive before retiring source columns.
- SHIPMENTS and their child items/tracking events are new target concepts. Current shipping_infos contains delivery_mode/carrier_name only, without shipment number, tracking number, per-line shipment allocations or tracking event history. Map only source-backed values; do not fabricate historical shipment/tracking events.
- RETURNS/RETURN_ITEMS are new target concepts. Current Order status RETURNED does not by itself identify quantities, conditions, dispositions or a full return request history. Do not synthesize ReturnItems solely from an order status.
- Existing snapshot requirements include image_url_snapshot, but target ORDER_ITEMS has no equivalent field. This is a confirmed source-to-target contract mismatch, not authorization to throw away the field. It must be resolved before the data-preservation gate can pass.

### 4.6 Account, Address, RBAC, Audit and Content

- Target PK convention is id for most entities; ACCOUNT_ROLES and ROLE_PERMISSIONS retain composite PKs. Update all FK references and scalar ID mappings as one contract change.
- phone remains marked UNIQUE in the target ERD. Before migration, detect duplicates after the agreed normalization; do not merge accounts. Decide the legacy handling of NULL/blank phones if target becomes NOT NULL.
- Target ADDRESSES normalizes recipient/address fields. Retain address_text verbatim in address_line for legacy data that cannot be decomposed reliably.
- Existing AUDIT_LOGS.description cannot be reconstructed as before_data/after_data JSON. Preserve description in a migration archive or an explicitly approved extension; never fabricate structured before/after state.
- Target Supplier omits current address/note; GoodsReceipt omits current receipt_date/note; ContentPages omits updated_by_account_id; ProductImages omits alt_text; Payments omits aggregate received/refund actor/time fields. Each value requires an explicit retain/archive/drop disposition before contract/deployment tests can pass.
- For audit and identity tables, keep actor FKs valid and authorization checks server-side. Do not create new roles or automatically grant permissions based on the schema conversion.

## 5. V1–V6 to owner-confirmed V2 mapping

| Current table / fields | Target table / field | Required mapping and validation |
|---|---|---|
| accounts.account_id, phone, email, password_hash, timestamps | ACCOUNTS.id, phone, email, password_hash, timestamps | Preserve IDs through a crosswalk or controlled PK migration. Add status with an approved existing/default state; verify unique phone and all FK remaps. |
| addresses.address_id, account_id, address_text, created_at | ADDRESSES.id, account_id, address_line, structured recipient/address fields | Keep address_text raw in address_line when it cannot be parsed. No inferred province/district/ward. |
| roles, permissions and junction tables | ROLES, PERMISSIONS, ACCOUNT_ROLES, ROLE_PERMISSIONS | Map PK column names, preserve codes and role assignments. description for Permissions comes from existing name only if a reviewed mapping says that is semantically valid; do not blindly rename name to description. |
| categories, brands | CATEGORIES, BRANDS | Preserve IDs/hierarchy/name. Add slug and is_active with approved deterministic values; check slug collisions before uniqueness. |
| products rows | PRODUCTS parent/root rows | Preserve current product identity/metadata and map base_price to selling_price under the approved semantics. Move gender/season/style/material_care to Attribute values only if the target Attribute mapping is valid. |
| each product_variants row | New child PRODUCTS row | Generate a new Product ID; parent_product_id points to the old parent Product. Map SKU, override_price to child selling_price and sale_status to target status under the approved mapping. Preserve old variant_id in a unique staging crosswalk. |
| size_systems and size_values | ATTRIBUTE_TYPES / ATTRIBUTES / ATTRIBUTE_OPTIONS | Make explicit crosswalks; maintain system distinctions and label/order. Do not merge equal codes from different size systems. |
| colors | ATTRIBUTE_OPTIONS through the target Attribute model | Preserve old color key/code/name in a unique crosswalk; don't infer that a same-named option is the same entity without a mapping. |
| product_variants.size_value_id/color_id | PRODUCT_ATTRIBUTE_VALUES for each child Product | Populate option_id for the approved Size and Color attributes. One value per Product+Attribute follows the target PK. |
| products.category_id/brand_id/name/slug/description | PRODUCTS | Parent/root holds shared data. Child nullability and inheritance must match the approved field contract and SQL schema; do not duplicate shared values wholesale. |
| products.base_price and product_variants.override_price | PRODUCTS.selling_price | Parent price from base_price; child price override from override_price. Preserve NULL as NULL if it denotes inheritance. Reconcile every effective price before/after. |
| products/material fields and prior attributes | ATTRIBUTES / PRODUCT_ATTRIBUTE_VALUES | Preserve exact existing values and NULLs. Use text values for untyped legacy data unless a valid typed Attribute definition already exists. |
| product_images image_id/product_id/image_url/sort_order/alt_text | PRODUCT_IMAGES id/product_id/image_url/is_primary/sort_order | Preserve ordering, derive primary deterministically only if the current sort_order rule is accepted; alt_text has no target field and must have an explicit retention disposition. Keep old order image snapshots separately protected. |
| carts / cart_items | CARTS / CART_ITEMS | Preserve Cart IDs and quantities. Map old variant_id to new child product_id. Target requires account identity according to the diagram; handle any unowned/guest Cart deliberately. |
| vouchers and voucher_products/voucher_categories/voucher_usages | VOUCHERS and order voucher snapshots | Map code/type/discount/time/limits/status only when semantics match. Target has no product/category target links or usage ledger; active scoped vouchers/usage rows block destructive cleanup until a replacement mapping is approved. |
| checkout_quotes | No direct target table; ORDERS.idempotency_key only partially overlaps | Drain/expire active quotes during an approved cutover. Do not treat quote fingerprint/expiry as interchangeable with order idempotency. Ensure no in-flight order depends on the old quote. |
| orders header fields | ORDERS | Map order_id→id, order_code→order_number, customer_account_id→account_id, order_status→status. Map monetary snapshots to subtotal/discount_amount/shipping_fee/total_amount without recomputing. Derive payment_status/fulfillment_status only through a validated state mapping. Preserve notes/reasons/timestamps in approved archive/extension if target omits them. |
| order_items including all snapshots | ORDER_ITEMS | Map variant_id by crosswalk, preserve SKU/name/description/qty/unit/discount/line total. Existing image_url_snapshot has no target field; cannot be dropped while claiming history preservation. |
| receiver fields embedded in orders | ORDER_ADDRESSES | Copy current recipient phone/email/address data. Parse structured address fields only from trusted source; raw address goes to address_line. |
| historical voucher use and order discount | ORDER_VOUCHER_SNAPSHOTS | Snapshot code/type/value only where the historic applied rule is known. Existing orders with only voucher_id and discount amount cannot prove a mutable voucher’s old definition. |
| suppliers | SUPPLIERS | Preserve names/contact; map status from usage_status via an explicit state mapping. Address/note have no target fields; disposition must be recorded. |
| goods_receipts | GOODS_RECEIPTS | Map receipt_code→receipt_number, receipt_status→status and actors. receipt_date/note are absent in target and require explicit archive/retention handling. |
| goods_receipt_items | GOODS_RECEIPT_ITEMS | Map variant_id to child product; preserve quantity. unit_cost is unknown in the source and must remain unknown/null unless sourced externally. Ensure receipt/product uniqueness if target requires it. |
| inventories | INVENTORIES | Map variant stock to (default warehouse_id, child product_id). Candidate initialization: quantity_on_hand=old available_quantity and quantity_reserved=0. Reconcile all row counts and quantities. |
| no current warehouse table | WAREHOUSES | Create the single default warehouse for the existing one-warehouse baseline before inventory backfill. Do not spread old stock across multiple target warehouses. |
| no reservation table | INVENTORY_RESERVATIONS | No rows should be invented for historical CartItems; only create reservations for source-backed active reservations if such a source exists. |
| inventory_transactions | INVENTORY_TRANSACTIONS | Map variant_id to child product, assign warehouse, preserve txn ID/delta/type/actor/reason/time. Link to receipt/order item only when a unique source-line match exists. Use a deterministic legacy idempotency key; quantity_after must not be fabricated without a known opening balance. |
| payments aggregate | PAYMENTS / PAYMENT_TRANSACTIONS / REFUNDS | Preserve amount due/received/refunded and actor/time facts via an approved mapping/archive. Do not fabricate attempts or refund events solely from summary totals. |
| shipping_infos | SHIPMENTS and related target tables | Map carrier_name only when equivalent. No tracking or per-item shipment events exist in source; do not synthesize them. |
| orders with RETURNED status | RETURNS / RETURN_ITEMS | Do not create return request/item rows without reliable per-line quantity, condition and disposition evidence. Preserve returned status and audit data. |
| audit_logs | AUDIT_LOGS | Map IDs, actor/action/target/time; description has no target field and cannot be converted into before/after JSON. Archive/retention decision is a gate. |
| content_pages | CONTENT_PAGES | Map page_code→slug if collision-free. updated_by_account_id has no target field; preserve updater attribution in approved archive/extension if the audit requirement requires it. |

## 6. P2 migration sequence and recovery plan

This section is the required execution sequence, not authorization to run a production migration.

1. **Baseline and profile a safe source copy.** Record applied Flyway version, exact DDL, row counts for all current tables, and phone/SKU/slug duplicates, orphan FKs, ID collisions, null distribution, ProductVariant-to-inventory completeness, stock ledger reconciliation, active quotes, voucher scope/usage rows, order image snapshot counts, payment aggregates, receipt fields and audit descriptions.
2. **Build crosswalks and data-loss report first.** Create source ID→target ID mapping for every renamed PK/FK; Variant→child Product; SizeSystem/SizeValue/Color→Attribute/Option; old Warehouse (logical one-w-house)→target default Warehouse; source line→target Order/Receipt item and stock ledger references. Flag zero/multiple matching candidates; never “pick first”.
3. **Expand schema in a new Flyway migration after V6.** Keep V1–V6 immutable. Create target tables and temporary mapping/archive structures. Seed one default Warehouse. Do not drop legacy tables/columns in the expansion/backfill migration.
4. **Backfill Catalog/Product/Attribute.** Retain existing Product parent IDs where safe, create one child Product per old Variant with generated IDs, map SKU/price/status, and populate Option/AttributeValue mappings. Validate each source variant maps exactly once and effective prices/attribute labels remain correct.
5. **Backfill stock and operational references.** Map CartItem, OrderItem, ReceiptItem, Inventory and ledger links through the crosswalk. Preserve quantities; do not synthesize reservations, return lines or payment events. Use a deterministic old-transaction idempotency key. Reconcile source balances and ledger independently; do not assume the existing ledger contains an opening-balance transaction.
6. **Backfill order/address/voucher/payment/shipping/audit.** Copy immutable facts exactly. For each omitted legacy field listed in Section 5, emit a row-level reconciliation outcome: migrated, retained in approved archive, sourced externally with provenance, or blocked. No source row may disappear silently.
7. **Validate before traffic switch.** Run MySQL 8.4 and H2 tests from an empty database and from a representative populated fixture. Compare counts, crosswalk completeness, FKs, unique values, attribute value type, image ordering, inventory math/ledger, order totals/snapshots, voucher policy, payment totals/refunds, and report metrics. Store the reconciliation artifact with the release.
8. **Cut over in a controlled deployment window.** Drain/expire live checkout quotes, prevent old/new application versions from writing incompatible identity formats concurrently, run final reconciliation, then switch writes/reads. Preserve old tables and mapping evidence during the rollback window.
9. **Contract legacy objects only in a later reviewed migration.** Remove ProductVariant/size/color tables, old foreign keys and staging structures only after proving no consumer remains and after source-to-target/data-retention sign-off.

### 6.1 Rollback/recovery boundaries

- Before cutover/new-only writes: restore the pre-migration backup or discard the expansion on a rehearsal copy.
- During cutover with writes frozen: return to the old app only while old structures remain complete and no V2-only facts have been accepted.
- After V2-only writes: a reverse SQL migration can be lossy. Use a tested backup/PITR or a separately reviewed reverse data transformation and document exact loss limits.
- Keep applied Flyway migrations immutable. Rehearse recovery on MySQL, not only H2. RPO/RTO numbers are not specified in the current ERD and should be set operationally before production cutover.

## 7. Dependency map and verification scope

| Module | Current paths affected | P2 impact |
|---|---|---|
| product | Product/ProductVariant/Category/Brand/SizeSystem/SizeValue/Color/ProductImage entities; Product repositories/services/mappers; Product request/response DTOs | Parent/child Product tree, inherited-field resolver, attribute type/value validation, slug/SKU, image primary/order and Catalog query semantics |
| cart | Cart/CartItem entities and services/DTOs | variant_id→child product_id, account/guest identity contract, availability read and no accidental reservation |
| inventory | Inventory/InventoryTransaction/GoodsReceiptItem/Receipt services/repos | Composite Warehouse/Product key, reserved/on-hand math, optimistic/conditional locking, idempotent ledger, receipt and reservation transactions |
| promotion | Voucher/VoucherUsage, voucher-product/category join tables and redemption logic | Target ERD has a simpler VOUCHERS table; scope and usage replacement must be proven before old rows can be removed |
| order | Order/OrderItem/CheckoutQuote/Payment/ShippingInfo, creation/action/payment/query services and DTOs | Order idempotency, independent status dimensions, immutable line/address/voucher snapshots, line-level inventory references |
| payment/fulfillment (current owner remains order unless architecture ownership is explicitly revised) | current Payment/COD and shipping code; new payment transactions/refunds/shipments/returns schema | Model event history without fake backfill; preserve COD/refund and state-machine invariants |
| report | ReportRepository/ReportService and DTOs | Adapt joins from Variant to child Product; avoid grouping/double counting parent and child; reconcile totals |
| account/audit/content | account and RBAC entities/services; AuditLog; ContentPage | PK rename, phone uniqueness, preserve actor/audit attribution, address normalization and content slug mapping |
| frontend | Catalog/admin, cart, checkout, orders, inventory/receipt, vouchers, reports | Coordinate request/response DTO changes in the same compatibility plan; variant_id must not silently change meaning |

Required test targets include CleanMigrationTests, MigrationTests, SchemaMappingTests, DatabaseConstraintsTests, ProductImageOrderingMigrationTests, Cart/Checkout and Order tests, Inventory/Receiving concurrency and transaction tests, Voucher tests, report tests, and frontend contract/browser tests wherever the API changes.

## 8. Decision and blocker log after owner confirmation

| ID | Decision/evidence | Status |
|---|---|---|
| D1 | Target schema source is the owner-confirmed single PRODUCTS parent/child model with typed attributes; canonical diagram is in this branch. | **FROZEN — STRUCTURE** |
| D2 | Target table set has 38 logical tables. It replaces legacy ProductVariant/size/color identity, adopts Product/Attribute values and adds Warehouse/reservation/payment/fulfillment/return entities. | **FROZEN — STRUCTURE** |
| D3 | Data identity crosswalk is mandatory; do not reuse numeric Variant IDs as new Product IDs. | **REQUIRED INVARIANT** |
| D4 | Typed Attribute value representation and composite Product/Attribute PK are defined in the target ERD. Type compatibility and option ownership need database/service assertions. | **FROZEN STRUCTURE; ASSERTIONS REQUIRED** |
| D5 | Inventory key is (warehouse_id, product_id); on-hand, reserved and version fields are in the target ERD. Source quantity mapping requires profile/reconciliation. | **FROZEN STRUCTURE; MIGRATION GATE** |
| D6 | Orders separate order/payment/fulfillment status fields, retain idempotency key, and store order address/voucher snapshots separately. | **FROZEN STRUCTURE; STATE MAPPING REQUIRED** |
| D7 | Target ERD has no permanent equivalents for some source facts: ProductImage alt_text, OrderItem image_url_snapshot, voucher product/category scope and usage rows, checkout_quotes, payment amount aggregates/actor-time facts, shipping delivery_mode, receipt date/note, audit description and content updater. | **BLOCKER — DATA RETENTION MAPPING** |
| D8 | Current deployed database schema/version, actual row counts, duplicates and FK health have not been read from a live DB/copy. | **BLOCKED — DATA ACCESS** |
| D9 | Exact nullable/default/length/index/CHECK/state-literal specifications not encoded by logical ERD must be captured in physical data dictionary and tests without changing target structure implicitly. | **P1 CONTRACT COMPLETION** |
| D10 | P2 migration from empty and populated fixtures; source/target reconciliation, backups and rollback rehearsal. | **NOT RUN — P2** |
| D11 | Status cardinalities and transition mapping across order_status/payment_status/fulfillment_status/shipment/return remain to be tested against the current state machine. | **MIGRATION/TEST GATE** |
| D12 | Voucher scope/usage behavior: target table set no longer contains the V5 target/link/usage tables; a replacement or safe retirement mapping is required before dropping them. | **BLOCKER IF SOURCE DATA/BEHAVIOR IS IN USE** |
| D13 | Cost price, unit_cost, target quantity_after and historical event-level payment/refund/return details may not exist in source. Use nullable/unknown/archive or external provenance; do not fabricate. | **DATA-PRESERVATION GATE** |
| D14 | API compatibility/release sequencing must prevent simultaneous old-variant/new-product ID writes. | **RELEASE GATE** |
| D15 | Owner confirmation of ERD structure. | **RESOLVED — 2026-10-22** |

## 9. P1 exit checklist

| Criterion | Result | Reason |
|---|---|---|
| Source migration inventory complete | PASS | V1–V6 source DDL yields 32 current application tables. |
| Owner-confirmed target ERD located and committed | PASS | Library artifact Pasted text(2).txt was recovered and added as phase-1-erd-v2-approved.mmd. |
| Target table set and structural relationships recorded | PASS | 38 target tables, keys and major cardinalities are documented. |
| Product parent/child and Attribute structure documented | PASS for structure | Details encoded in target ERD; SQL/service invariants and validation tests are required in P2. |
| Warehouse/Inventory target structure documented | PASS for structure | Composite key, quantity_on_hand/reserved/version/reservations/ledger recorded; migration/reconciliation remains a gate. |
| Cart, quote, voucher, order, receiving, payment, shipment, returns and snapshot impact analysed | PARTIAL | Target omits/replaces source facts identified in Section 5; lossless mapping not yet proven. |
| Current table/column → target mapping | PARTIAL | Each current domain table and key transformations mapped; unmappable legacy fields have explicit blocker records. |
| Migration/recovery sequence documented | PASS as design | Forward migration, crosswalk, reconciliation, cutover and recovery staged; not rehearsed. |
| Live data profiling | BLOCKED | No database copy or authorized connection available. |
| Local working tree and local test execution | UNVERIFIED | GitHub connector cannot inspect the user's local checkout. |
| Baseline CI on original demo1 SHA | PASS | Run 39631789377 passed H2 and MySQL 8.4 checks on f931602c86fdf5a59b487d6edd77331b7d64333a. |
| CI for the new P1 documentation commit | NOT EVIDENCED | Docs-only P1 branch is not in backend workflow push allowlist; Vercel status is not backend test evidence. |
| Authorization to run migration in production | NO | Live data reconciliation and retention blockers remain. |

## 10. Conditions before P2 implementation/cutover

1. Preserve the owner-confirmed 38-table ERD. Do not redesign the table model during migration implementation.
2. Finish the target physical data dictionary for nullability, defaults, types/precision, unique/check/index/FK actions and status literals.
3. Build source/target crosswalks and a row-level disposition for every source column not present in the target ERD; no silent drop of source facts.
4. Reconcile the specific blockers in D7/D12/D13: order image snapshots, voucher scope/usage, checkout quotes, payment aggregates/refund actor/time, shipping semantics, receipt fields, audit description and content updater.
5. Obtain a sanitized database copy or authorized data profile. Measure IDs, duplicate phone/SKU/slug, inventory versus Variant counts, unique conflicts, FK orphans, active quotes, voucher usages and snapshot counts.
6. Implement forward-only Flyway migrations after V6. Test empty-schema and populated-fixture migration on MySQL 8.4; never edit V1–V6.
7. Update Entity/Repository/Service/DTO/API and frontend contracts in coordinated domain slices; retain modular monolith ownership and service transaction boundaries.
8. Run migration/schema/constraints, API/security, concurrency/idempotency and historical snapshot tests; record CI run links on the actual commit.
9. Execute cutover and cleanup only after backup/recovery rehearsal, reconciliation PASS and approval. Legacy cleanup remains a later reviewed migration.

**P1 conclusion:** the target database structure is now owner-confirmed and recorded in this branch; the earlier “ERD v2 missing/not frozen” conclusion is superseded. P1 remains PARTIAL because the target ERD omits several facts currently persisted by V1–V6 and the actual source data has not been profiled. Do not run a data-destructive migration until every omitted legacy field has an approved, tested retain/transform/archive policy and source/target reconciliation passes.

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
