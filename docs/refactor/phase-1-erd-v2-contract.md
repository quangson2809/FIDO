# FIDO — Phase 1: ERD v2 & Data Contract

- **Status: PARTIAL.** Current schema inventory and migration proposal documented. ERD v2 is not frozen because material data-contract decisions and live-data evidence remain unavailable.
- **Repository:** https://github.com/quangson2809/FIDO
- **Baseline branch:** demo1
- **Baseline SHA:** f931602c86fdf5a59b487d6edd77331b7d64333a
- **P1 branch:** docs/phase-1-erd-v2-freeze
- **Date:** 2026-10-22 (Asia/Ho_Chi_Minh)
- **Scope:** evidence-based current-schema inventory, candidate ERD v2, data contracts, V1→V2 mapping, migration/recovery design, dependency map and decision log.
- **Excluded:** editing V1–V6, live database writes, destructive DDL, bulk Java/API refactor, unapproved endpoint changes, merge to demo1/main.

> The target model is a reviewable proposal, not an approved production schema. P0 found no authoritative ERD v2 artifact at the baseline. Missing decisions are explicitly BLOCKED or NEEDS DECISION; they are not silently converted into requirements.

## 1. Execution summary and evidence boundary

### 1.1 Work performed

1. Verified the remote demo1 ref and commit metadata.
2. Read the current source-of-truth, data-model, module-ownership, transaction, phase roadmap and technical-decision documents.
3. Read the complete source of Flyway migrations V1–V6 and checked their table/column/index effects.
4. Read the P0 audit report from its separate branch, refactor/p0-baseline-audit. That report is not part of demo1 at the audited baseline SHA.
5. Inspected representative Product/ProductVariant, Inventory, InventoryTransaction, CartItem, OrderItem and GoodsReceiptItem entities, the InventoryCommandService write boundary, schema-mapping/migration tests, API ownership and backend CI workflow.
6. Created this P1 branch from the exact demo1 SHA. No application code or migration was modified.

### 1.2 Verified facts versus unavailable evidence

| Item | Result | Evidence / limitation |
|---|---|---|
| Remote baseline | VERIFIED | demo1 → f931602c86fdf5a59b487d6edd77331b7d64333a; merge commit for PR #22 on 2026-10-21. |
| Migration chain | VERIFIED IN SOURCE | backend/src/main/resources/db/migration/V1…V6. |
| Application tables from the complete migration DDL | 32 | V1 creates 28; V5 adds 4; V2/V3/V4/V6 add no tables. |
| Application columns from migration DDL | 186 | P0 DDL count: 161 in V1 + 2 in V4 + 10 voucher columns + 13 columns across the four V5 tables. |
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

## 3. Candidate ERD v2 — design proposal, NOT FROZEN

Candidate relationship diagram: [phase-1-erd-v2-candidate.mmd](phase-1-erd-v2-candidate.mmd). This is a proposal diagram, not approved DDL; it does not settle the blocked cardinality, inheritance, warehouse allocation or snapshot questions.

### 3.1 Product hierarchy proposal

**Candidate:** retain one products table and add nullable parent_product_id self-FK. Root/common records have no parent; child/sellable records reference the shared Product. Do not hard-code two levels. If arbitrary depth is approved, the service must reject a reparent operation that puts a node under itself or any descendant inside the transaction. A simple FK and CHECK(parent_product_id <> product_id) prevent missing/direct-self references but cannot prevent longer cycles.

- Keep existing product_id values for the current products rows.
- For each legacy ProductVariant, create a new child Product with a newly generated product_id and parent_product_id equal to the legacy variant's product_id.
- Preserve a unique crosswalk old_variant_id → new_child_product_id. The Product and ProductVariant tables have independent auto-increment identity spaces; numeric identity overlap is possible, so never assume variant_id may become the new product_id.
- Candidate SKU: add SKU on products and copy product_variants.sku to the corresponding child. UNIQUE over non-NULL SKU is a proposal, subject to checking existing values, collation and NULL distribution.
- Existing effective price is COALESCE(product_variants.override_price, products.base_price). Candidate mapping keeps parent base price and maps nullable override_price to child override price, with NULL meaning inheritance. Confirm the rule applies to all child cases before implementation.
- Candidate inherited common fields include name, description, Category, Brand and current descriptive fields. Which columns become nullable on children and how “inherit” differs from “clear” require explicit owner approval. Do not duplicate all parent values into children by default; duplicated authoritative values drift during later edits.
- Keep current sale meanings ON_SALE and STOPPED and do not equate zero stock with stopped sale. Whether a stopped parent suppresses child sale, and whether a parent can itself be directly sold with children, are open business decisions.
- Keep Product images linked to retained common/root Product and preserve V4 ordering initially. Per-child image galleries require a separate decision; never rewrite order image snapshots.
- Do not identify a parent solely because SKU is NULL or identify a child solely because SKU is non-NULL.

**NEEDS DECISION — sellability:** Does the parent represent only a grouping/common-information row, or can a parent with children itself be purchased? Are only terminal leaves sellable? Does stopping a parent affect all children? The schema must represent the approved answer; code must not guess.

### 3.2 Attribute model proposal

Candidate entities:
- attribute_types: attribute_type_id PK, code UNIQUE, name, and a value-representation classification only if approved.
- attributes: attribute_id PK, attribute_type_id FK, code, name and an explicit applicability scope only if the owner approves the scope model.
- attribute_options: attribute_option_id PK, attribute_id FK, option code/label/sort order for controlled values.
- product_attribute_values: association of Product + Attribute and either an option or one typed scalar value. Candidate fields are product_id, attribute_id, attribute_option_id nullable, value_text nullable, value_number nullable and value_boolean nullable.

Every Attribute belongs to exactly one AttributeType; every Option belongs to one Attribute. Exact physical naming is provisional and must follow repository conventions after approval.

**Cardinality and integrity decisions still open:**
1. AttributeType might identify representation type (TEXT/NUMBER/BOOLEAN/OPTION) or a business group (size/color/material). Do not combine these different meanings in one field without approval.
2. Decide single-valued versus multi-valued attributes. UNIQUE(product_id, attribute_id) is only correct if every attribute has one value per Product.
3. Decide if absent child values inherit a parent value, whether inheritance is nearest-ancestor, and which attributes apply to parent, child or both.
4. Decide whether options are shared or scoped per Attribute. Conservative candidate: UNIQUE(attribute_id, code); preserve same codes across different SizeSystems without merging them.
5. For a typed value row, require exactly one representation (option/text/number/boolean) if this data shape is selected. Ensure stored representation matches the Attribute definition; a simple SQL CHECK cannot generally verify a separate table's type definition.
6. Empty string, NULL/inherit, and omitted PATCH field have distinct meanings. DTO validation must not collapse them.
7. Candidate mapping: each legacy SizeSystem becomes its own size Attribute; SizeValues map to Options; Colors map to options of an OPTION-backed Color Attribute. Preserve IDs via crosswalks, codes, labels and sort order. Do not treat equal size codes across different systems as equivalent.
8. gender, season, style and material_care are currently untyped strings/text; preserve their exact contents unless a controlled vocabulary is separately approved. Do not invent enums.
9. Current OrderItem snapshots have size_snapshot and color_snapshot. Decide whether future arbitrary attributes must be snapshotted. If so, approve an immutable order_item_attribute_snapshots representation or equivalent contract. Existing snapshot values and NULLs must not be reconstructed from current Catalog state.

### 3.3 Warehouse and Inventory proposal

**Current verified meaning:** one warehouse; inventories are keyed by variant_id and contain only available_quantity, which means sellable availability—not physical on-hand or reserved stock. Cart does not reserve/deduct stock. Inventory commands perform guarded quantity changes and write an immutable inventory_transactions row in the same outer Service transaction. They sort multiple stock lines by variant ID to reduce deadlock risk. Creating a missing zero row is initialization, not a stock movement.

**Candidate target:**
- warehouses: minimal warehouse identity with a PK and unique business code. Name/status and lifecycle fields must be scoped to the approved need, not invented.
- inventories: composite PK (warehouse_id, product_id), FK to warehouses and the stock-tracked Product, available_quantity INT NOT NULL, updated_at, CHECK(available_quantity >= 0).
- inventory_transactions: keep txn_id; replace variant_id with product_id, add warehouse_id, retain signed quantity_delta, transaction_type, nullable order/receipt references, actor, reason and UTC timestamp. Candidate indexes align with (warehouse_id, product_id, created_at), order_id and goods_receipt_id.
- goods_receipt_items: replace variant_id with product_id; preserve positive quantity and receipt/product uniqueness.
- goods_receipts: candidate warehouse_id on the header if every receipt has one destination warehouse. NEEDS DECISION whether a receipt may distribute its lines across multiple warehouses; if yes, warehouse belongs at item level instead.
- Orders currently have no stock-allocation or warehouse reference. NEEDS DECISION whether an order may be fulfilled from multiple warehouses and, if so, how its allocation is persisted/reconciled.

Do not add physical_quantity, reserved_quantity, on_hand, bins, lots, expiry, transfers or reservation tables without an approved requirement. The current source only specifies available/sellable quantity.

### 3.4 Cross-domain impact matrix

| Domain | Current contract | Required target handling | Status |
|---|---|---|---|
| Cart | cart_items.variant_id → product_variants.variant_id | Map to sellable child Product ID; keep UNIQUE(cart_id, product_id), quantity > 0; no stock reservation. | Mapping required |
| Checkout Quote | V5 stores quote ID, account, fingerprint, expiry and order link; no quote-line table | Invalidate/drain active quotes at cutover and recalculate under the new identity mapping; agree retry contract. | NEEDS DECISION |
| OrderItem | FK to Variant plus immutable product name, SKU, size, color, price, quantity, line total and nullable image snapshots | Map FK through crosswalk; preserve every snapshot exactly, including NULL image. Define arbitrary-attribute snapshot representation before new orders use it. | High risk |
| Payment | One summary row per Order with aggregates and actor/time fields | Keep unchanged; absent event history cannot be reconstructed. | Preserve |
| Shipping | One ShippingInfo row per Order; no tracking code in baseline | No Product FK; keep unchanged unless independently approved. | Preserve |
| Receiving | goods_receipt_items.variant_id; no current warehouse column | Map each item through crosswalk. Assign default warehouse only under approved receipt rule. | High risk |
| Inventory and ledger | One inventory row per Variant; ledger references Variant | Map to Product + default Warehouse; preserve quantity, txn ID, signed delta, event type, actor, reason, time and order/receipt links. | High risk |
| Voucher | V5 voucher_products and voucher_categories target Product and Category | Decide product voucher scope: exact parent, exact child or descendants. Do not bulk-expand current target rows silently. | NEEDS DECISION |
| Reports | ReportRepository joins OrderItem → ProductVariant → Product | Choose sold-child versus parent-family aggregation; validate no double counting and compare old/new report values. | NEEDS DECISION |
| Product Images | product_images.product_id → products; cover is sort_order 0 | Keep current image gallery on retained common Product initially unless per-child gallery is approved. | Proposed |
| Audit | target_type/target_id are generic text | Preserve rows; do not rewrite old IDs by guess. Define mapping only if downstream consumers require it. | Preserve / review |
| Category and Brand | Product has Category FK and optional Brand FK; category search includes descendants | Preserve IDs; define parent/child inheritance and voucher/report behavior before permitting child overrides. | NEEDS DECISION |

## 4. V1 → V2 table/column mapping

This is the migration design matrix, not a production migration authorization. Final target column names and nullability are contingent on owner approval.

| Current table / fields | Candidate action | Data preservation / validation |
|---|---|---|
| accounts, addresses, roles, permissions, account_roles, role_permissions | Keep structure absent separate approved requirements | Preserve keys and assignments; preflight phone duplicates/normalization; never auto-merge accounts. |
| categories, brands | Retain | Preserve IDs and hierarchy; do not copy IDs or overwrite Category/Brand based on inheritance assumptions. |
| products | Retain existing rows as candidate common/root Products; add parent_product_id and add SKU only after contract approval; selectively relax child-inheritable fields only after approval | Existing Product IDs stay stable; preserve raw strings, prices and timestamps. |
| product_images | Retain | Preserve image IDs, URLs, alt text and V4 sort order. Do not copy the gallery to children without approval. |
| product_variants | Convert each Variant to one newly inserted child Product; retire old table only in a later release after compatibility proof | Generate new Product ID, preserve SKU/status/price and size/color through explicit crosswalks. Do not reuse numeric Variant ID. |
| size_systems | Convert to Attribute mapping or keep temporarily during compatibility window | One attribute per legacy size system is a candidate to prevent collisions. |
| size_values | Convert to AttributeOptions after the mapping contract is approved | Preserve size_value_id → option crosswalk, code, display_name and sort_order. |
| colors | Convert to Color AttributeOptions after approval | Preserve color_id → option crosswalk, code and name. |
| attributes, attribute_types, attribute_options, product_attribute_values | New candidate tables | Create only after typed-value, multiplicity, scope, inheritance and snapshot rules are approved. |
| carts | Retain | Preserve cart ID and timestamps. |
| cart_items.variant_id | Replace with product_id via variant→child map | Preserve cart_item_id and quantity; detect cart/product uniqueness collisions first. |
| vouchers | Retain | Preserve voucher IDs, configuration and enabled state; keep legacy code-only vouchers disabled unless configured. |
| voucher_products, voucher_categories | Retain link rows unless an explicitly approved hierarchy-scope migration says otherwise | Do not expand parent targets to children by guessing. |
| voucher_usages | Retain | Preserve order key, voucher/account and restored state; verify each FK. |
| checkout_quotes | Retain short-term; expire/drain quotes at cutover through approved operational procedure | Existing quote has no lines, so don’t treat its fingerprint as proof of the new Product identity contract. |
| orders | Retain header, status, recipient and all money snapshots | No Product-driven rewrite of order IDs, statuses, totals or timestamps. |
| order_items.variant_id | Add target Product FK/mapping before eventual removal of old FK | Preserve order_item_id, order_id, all snapshots and quantity exactly. Never fill old NULL image snapshots from Catalog. |
| payments, shipping_infos | Retain | Do not synthesize payment/refund events, tracking codes or state transitions. |
| suppliers | Retain | Supplier identity remains distinct from Warehouse identity. |
| goods_receipts | Add approved warehouse relation if and when target semantics are locked | Historical receipts go to the one seeded default Warehouse only if that mapping is approved. |
| goods_receipt_items.variant_id | Map to product_id through crosswalk | Preserve receipt_item_id, receipt ID, quantity and confirmed immutability; preflight UNIQUE(receipt, product). |
| inventories.variant_id | Replace with (warehouse_id, product_id) composite key | Seed default Warehouse; map every old row to child Product and preserve available_quantity exactly. |
| inventory_transactions.variant_id | Replace with product_id and add warehouse_id | Preserve txn_id, quantity_delta, transaction_type, order/receipt references, actor, reason and timestamp. Do not invent opening ledger events. |
| audit_logs | Keep verbatim | Generic target IDs may embed old keys; only change under reviewed mapping with dependent-consumer analysis. |
| content_pages | Retain | No direct Product identity relation. |
| warehouses | New target table, candidate | Create and seed the approved default Warehouse before inventory backfill; additional lifecycle fields require approval. |

### 4.1 Required staging crosswalks

Before changing old FKs, migration rehearsal needs at least:
- old_variant_id → new_child_product_id, unique on both sides;
- old_size_system_id → new_attribute_id;
- old_size_value_id → new_attribute_option_id;
- old_color_id → new_attribute_option_id;
- source/target row counts and reconciliation keys per FK-bearing table;
- source inventory identity → seeded default warehouse identity.

These are migration/staging artifacts, not automatically permanent business tables. Do not choose an ID reuse rule based on sample/test data.

## 5. Data contract — candidate invariants

### 5.1 Product hierarchy and inheritance

- One row has at most one parent; a parent may have zero or many children.
- Referenced parent must exist. Self-parent and every cycle length must be rejected transactionally. FK alone cannot prevent longer cycles.
- Parent/child role cannot be inferred only from SKU nullability.
- Candidate inheritance: child non-NULL override wins; otherwise resolve the nearest non-NULL ancestor. This applies only to owner-approved fields. Null means inherit, not “explicitly clear”, unless a separate field-presence contract says otherwise.
- DTO behavior must distinguish omitted PATCH property (no change) from explicit NULL (switch to inheritance, if approved).
- SKU candidate is unique across all non-NULL rows; preserve NULL and profile collation/duplicate candidates before creating the index.
- Money remains DECIMAL(18,2), never floating point, with existing non-negative checks. Keep current price fallback until superseded by a confirmed rule.
- ON_SALE and STOPPED remain the present sale states; zero stock is not a status transition. Parent-child status propagation is unresolved.
- Keep ProductImage ordering and snapshot-based OrderItem image semantics.

### 5.2 Attribute integrity

- Each Attribute belongs to one AttributeType; each Option belongs to one Attribute.
- A Product value must respect the Attribute's approved applicability scope.
- Candidate UNIQUE(product_id, attribute_id) is valid only for a single-value model.
- Option uniqueness should be scoped per Attribute unless global uniqueness is explicitly required.
- A typed value row must contain exactly one representation when the selected model requires one; the persisted value must match its declared type.
- Changing option text/code later cannot alter historical order snapshots.
- SizeSystem identity must survive mapping. Same size code across systems does not prove equivalence.
- No invented enumerations for existing descriptive strings.

### 5.3 Warehouse / inventory integrity

- Candidate inventory key is (warehouse_id, product_id); available_quantity remains integer, NOT NULL and non-negative.
- Every non-zero stock movement updates one matching inventory row and writes an immutable ledger row within the same transaction.
- Initial zero-row creation/backfill is initialization, not a stock movement under the existing rule.
- Ledger deltas are signed and non-zero; actor and UTC timestamp are server-derived.
- Receipt confirmation is guarded and exactly once; confirmed receipt lines are immutable.
- Multi-line order deductions are all-or-nothing; acquire stock locks in deterministic warehouse/product key order.
- Cart and quote do not reserve stock.
- Do not force ledger sums to equal current stock if the source was not a complete opening-balance ledger; profile/reconcile before migration.

### 5.4 Historical and financial invariants

- Preserve Order, Payment, InventoryTransaction, AuditLog and confirmed receipt historical facts.
- Keep receiver, amount, SKU/name/size/color/image snapshot and status data exactly.
- NULL historical image snapshots remain NULL; no current-catalog backfill.
- Payment currently contains aggregate amounts, not individual collection/refund event history.
- Preserve voucher IDs, policy, usage and restored state; scope expansion is not automatic.
- Report transformation must count each order line once under an explicitly approved child/family grouping rule.

### 5.5 Foreign keys and deletion

- Current V1 DDL intentionally omits ON DELETE CASCADE; retain no-cascade/restrict semantics unless each relationship is separately approved.
- Product records with children, Cart rows, receipt/ledger links or historical OrderItems must not be hard-deleted just to simplify migration.
- Do not add generic soft-delete lifecycle, archival or status fields by assumption.
- Reparent/merge/delete operations require explicit conflict behavior when children, stock, voucher targets or history exist.

## 6. P2 migration design — expand, backfill, validate, cut over, contract

**No production migration is included in this P1 change.** The sequence below is a design gate, not permission to run SQL against any live database.

### Stage 0 — inspect a safe database copy

Capture the exact Flyway version and complete DDL. Produce actual row counts and data profiles for all application tables. At minimum test:
- duplicate/null phone and normalization before relying on V2 phone uniqueness;
- SKU NULL count, exact duplicates, collation/case/trim duplicate candidates and lengths;
- product and variant ID ranges/overlap; Variant→Product, SizeValue→SizeSystem, Color relationships;
- null override prices and computed effective prices;
- inventory row count versus Variant count, missing rows, duplicates and quantity distribution;
- ledger quantities by Variant and the relationship between recorded movements and current availability. Do not assume the ledger includes opening stock;
- CartItem, OrderItem and receipt-line FKs, counts and possible target UNIQUE conflicts;
- Order and OrderItem snapshots, nullable image snapshot counts, statuses and monetary values;
- voucher targets/usages and active checkout quotes;
- FK orphans, duplicate keys, CHECK violations, column lengths, precision and defaults.

No actual runtime row counts or duplicate statistics are asserted in this document.

### Stage 1 — expand schema; do not remove V1–V6 objects

Add approved target tables/nullable columns and staging/crosswalk structures in new forward Flyway migrations. Create the approved default Warehouse before backfill. Do not drop product_variants, old master tables or old FK columns. Keep the old application path available until rehearsal proves the approved release sequence.

### Stage 2 — establish Attribute identities/options

Create only approved AttributeTypes, Attributes and Options. Build explicit crosswalks for each SizeSystem, SizeValue and Color; preserve source value/code/label/order. Check code collisions before UNIQUE constraints. Backfill child values only after confirming whether every Variant must have a size and color.

### Stage 3 — create child Product rows

For every old Variant create one child Product with a generated Product PK and parent link. Copy SKU and sale state; map nullable override price per the approved inheritance contract. Preserve source Variant ID in a staging crosswalk; don’t rely on non-overlapping sequences. Backfill size/color values using their crosswalks. Reconcile every Variant to exactly one child Product. Do not delete old Variant rows yet.

### Stage 4 — migrate stock and receiving

Create one default Warehouse representing the current one-warehouse configuration. Map current inventory rows to (default warehouse, child Product), preserving available_quantity. Map every ledger row while preserving txn_id, signed delta, event type, order/receipt links, actor, reason and timestamp. Map receipt lines and assign historical receipts to default Warehouse only under the approved receipt model. Validate counts/quantity values/FKs; do not synthesize opening balances or ledger events.

### Stage 5 — migrate Cart, OrderItem and API boundaries

Populate Product IDs in CartItems, OrderItems and GoodsReceiptItems through the crosswalk. Check UNIQUE(cart, product) and UNIQUE(receipt, product) collisions first. Preserve every existing snapshot, including NULLs; new orders need an approved attribute snapshot contract. Decide whether existing variant_id request/response contracts are retained through a compatibility layer or versioned as breaking changes. Never silently reinterpret a field called variant_id as product_id. Expire/drain active quotes using an approved cutover procedure; recalculate quotes through the new identity contract.

Update Product/Catalog, Cart/Checkout, Order, Inventory/Receiving, Voucher, Report and frontend DTO mappings together within the agreed release boundary.

### Stage 6 — validate and reconcile before traffic cutover

Required evidence:
- Every old Variant maps to exactly one new child Product; crosswalk target keys are unique.
- No target FK is orphaned; all target unique/check constraints pass on MySQL 8.4.
- Non-NULL SKU values are retained and unique under an approved normalization/collation policy.
- Effective price, sale status and sellability have agreed before/after comparisons.
- Available quantity by old Variant equals the mapped child Product's quantity at the default Warehouse.
- Ledger transaction identities/deltas/source references are preserved; concurrency tests prove no negative stock and all-or-nothing rollback.
- Order codes/IDs/statuses, line counts, every snapshot, totals and nullable image snapshots are unchanged.
- Voucher targeting/usage/restoration, quote invalidation and report totals match an owner-approved expectation.
- Clean migration, entity mapping, type/precision/default/FK/CHECK/index tests run on H2 where supported and MySQL 8.4.
- Contract tests and regressions cover Catalog, Cart, Checkout, receiving, Inventory, Voucher, Order lifecycle/snapshots and Reports.
- Source/target counts and FK crosswalk reconciliation are stored as a release artifact.

### Stage 7 — cut over, observe, then contract

Switch writes only after target code, API compatibility, reconciliation and CI are green. Keep old tables/FKs and crosswalks through the approved recovery window. Stop old-path writes before considering retirement. Remove old compatibility columns/tables only in a later reviewed migration after proving no application instance, worker, client or report uses old identities. Monitor FK errors, SKU conflicts, stock mismatch, quote expiry/conflicts, voucher eligibility and report deltas. Destructive cleanup requires separate approval and verified backup/recovery.

### 6.1 Rollback and recovery limitations

- Before cutover/new writes, restore the pre-migration database or discard the expansion on a rehearsal copy. Do not improvise reverse DDL on live data.
- During a write-frozen cutover, route back only if old structures remain complete and compatible.
- After accepted V2-only writes, a simple SQL reversal may be lossy; use tested backup/PITR or a separately reviewed reverse transformation for the full allowed data subset.
- Keep applied Flyway migrations immutable and prefer forward-only fixes. Preserve audit/financial/history facts.
- Rehearse restoration on a database copy. RPO/RTO targets are absent from current sources and require an operational owner decision. Passing H2 tests is not proof of MySQL recovery safety.

## 7. Dependency map

### 7.1 Backend modules and touchpoints

| Module | Current areas | Expected impact |
|---|---|---|
| product | Product, ProductVariant, ProductImage, Brand, Category, Color, SizeSystem, SizeValue; product repositories; ProductAdminService, catalog query/image services; Product create/patch/variant DTOs | Product hierarchy, inheritance, SKU, price, attribute persistence, sale rules and compatibility contracts |
| cart | CartItem, cart repositories/services and DTOs | Replace Variant identity; preserve cart/product uniqueness and no-reservation contract |
| order | CheckoutCalculationService, CheckoutQuoteService/Store, OrderCreationService, OrderItem, queries/summaries and DTOs | Quote fingerprint/revalidation, child Product identity, effective price and immutable attribute/history snapshots |
| inventory | Inventory, InventoryTransaction, GoodsReceiptItem, GoodsReceipt, InventoryCommandService and Inventory/receipt repositories | Warehouse composite key, backfill, locking order and ledger semantics |
| promotion | Voucher, VoucherUsage, VoucherManagementService, VoucherRedemptionService, voucher-product/category links | Parent/child voucher scope, usage/reconciliation |
| report | ReportRepository, ReportService and report DTOs; current joins OrderItem → ProductVariant → Product | Parent-family versus sold-child grouping and no double count |
| audit | AuditLog, AuditService and audit query | Preserve append-only rows; target_id may contain legacy IDs |
| account/content | Existing entities/services, mainly actors and content | No direct Product schema change expected; preserve role/security and actor FKs |
| frontend | Catalog/admin, variant selection, Cart, Quote/Checkout, Order screens, Inventory/receipt, Voucher administration, Reports | DTO/runtime mapping and field identity must change in lockstep |

### 7.2 API/DTO contracts requiring explicit compatibility decisions

docs/04-api-contract.md documents the historical 77-endpoint Analyst baseline plus later Product-image, Voucher and Report additions. Product identity changes affect at least:
- public Catalog (#11–13) and admin Product/Catalog endpoints (#27–32 and image commands);
- Cart (#14–18), Checkout Quote (#19) and Create Order (#20);
- GoodsReceipt/Inventory (#46–57);
- voucher management and eligibility;
- Customer/Admin Order DTOs and OrderItem snapshots;
- Product Performance reports and frontend Product ID versus sold-item identity.

Current contracts use variant_id, size_value_id, color_id, override_price and size_system_id. Changing their name or meaning is an external contract decision even when FE and BE are in one repository. Do not make variant_id silently accept a Product ID.

### 7.3 Relevant tests to extend in P2

- Persistence: CleanMigrationTests, MigrationTests, SchemaMappingTests, DatabaseConstraintsTests, ProductImageOrderingMigrationTests and persistence-fixture.sql.
- Product: Catalog Admin/Public tests, image tests, size-system concurrency and Product read-model tests.
- Cart/Checkout: Cart HTTP/concurrency tests, CheckoutQuoteHttpTests, CheckoutConsistencyHttpTests and CheckoutCartTransactionTests.
- Inventory/Receiving: GoodsReceiptHttpTests, InventoryAdjustmentHttpTests, InventoryConcurrencyTests and InventoryPhase4TransactionTests.
- Order: creation, stock, lifecycle, concurrency, Order image snapshot and Voucher Checkout tests.
- Promotion/Report: VoucherDiscountTests, ReportApiTest and ReportRepositoryTests.

P2 must add explicit tests for crosswalk completeness, numeric ID overlap, nullable/duplicate SKUs, typed attributes/value scope, parent cycles/inheritance, sale/price propagation, warehouse/product uniqueness, stock/ledger reconciliation, FK cutover, active quote invalidation, parent/child voucher targeting, report grouping and snapshot immutability after attribute changes.

## 8. Decision log — items preventing a production ERD freeze

These are material business/data-contract decisions, not naming-only implementation choices.

| ID | Decision | Candidate/safe starting point | Status |
|---|---|---|---|
| D1 | Hierarchy depth and direct sale | Self-FK can represent arbitrary depth; reject cycles. Do not enable parent direct sale or leaf-only sale without a rule. | NEEDS DECISION |
| D2 | Inheritable fields | Approve each inheritable field (name/description/Category/Brand/descriptive fields), null semantics and ancestor resolution. | NEEDS DECISION |
| D3 | SKU/price/status | Confirm SKU requiredness for sellable rows, price override/inheritance, parent sellability and STOPPED propagation. | NEEDS DECISION |
| D4 | AttributeType meaning | Decide value representation versus business grouping; approve typed fields and options. | NEEDS DECISION |
| D5 | Attribute cardinality/scope/inheritance | Single/multi-value, parent/child applicability and inherited values. | NEEDS DECISION |
| D6 | Attribute snapshots | Confirm whether each future arbitrary attribute must be snapshotted per OrderItem and choose immutable representation. | NEEDS DECISION |
| D7 | Size/Color mapping | Candidate: each SizeSystem maps to a Size Attribute with Options; Colors map to Color options; preserve identity via crosswalk. | Proposal awaiting approval |
| D8 | Warehouse granularity | Confirm whether multi-warehouse is a real target now, receipt header/item destination, and one/multi-warehouse order fulfillment. | NEEDS DECISION |
| D9 | Quantity semantics | Current quantity is sellable availability. Confirm whether physical/on-hand/reserved/lot features are excluded. Default is not to add them. | NEEDS DECISION |
| D10 | Variant ID / API compatibility | Retain old field via compatibility crosswalk or approve breaking API/version decision. Never silently reinterpret. | NEEDS DECISION |
| D11 | Voucher scope | Decide whether product-specific voucher targets parent, exact child, or descendants. | NEEDS DECISION |
| D12 | Report aggregation | Decide metrics grouped by sold child, parent family or both; approve baseline comparisons. | NEEDS DECISION |
| D13 | Live data profile | Provide sanitized DB copy or approved metadata/profile access; count rows, collisions, nulls and orphans. | BLOCKED: data unavailable |
| D14 | Deployment/recovery | Approve write-freeze versus compatibility approach, rollback window, backup/PITR and RPO/RTO. | NEEDS DECISION |
| D15 | Canonical ERD v2 | Approve one ERD + data dictionary with table/column/type/null/default/PK/FK/UQ/CHECK/index/cardinality. | BLOCKED until artifact/approval |

## 9. P1 exit checklist

| Criterion | Result | Reason |
|---|---|---|
| Migration source inventory complete | PASS | Read V1–V6; 28 + 4 = 32 application tables confirmed. |
| All 32 table names and core keys/relations documented | PASS for source DDL | Section 2; runtime DDL remains unverified. |
| Product hierarchy/inheritance/sellability frozen | BLOCKED | No authoritative v2 ERD; D1–D3 unresolved. |
| Attribute value cardinality and constraints frozen | BLOCKED | D4–D7 unresolved. |
| Warehouse/Inventory contract frozen | BLOCKED | D8–D9 unresolved. |
| Cart/Quote/Voucher/Order/Receipt/Report impact analysed | PASS as impact analysis, not final contract | Sections 3.4 and 7; decisions remain open. |
| V1→V2 mapping | PARTIAL | All current tables and major changed identities mapped; final columns/names require approval. |
| Migration/backfill and recovery design | PASS as proposal | Staged plan exists; not rehearsed against a database copy. |
| Live row profiling completed | BLOCKED | No database copy/approved access. |
| Local tree/diff/tests verified | NOT CLAIMED | Remote GitHub APIs were available; local checkout/runtime unavailable. |
| Baseline CI at exact SHA | PASS | Run 39631789377 succeeds on original demo1 SHA. |
| CI for this documentation commit | NOT YET EVIDENCED | Backend workflow excludes this docs-only branch from push allowlist and does not include docs in PR path filters. |
| Ready for P2 production migration | NO | D1–D15 are not all resolved/evidenced. |

## 10. Conditions required before P2 migration implementation

1. Approve hierarchy depth, direct sale, inherited fields, SKU, pricing and sale-status semantics (D1–D3).
2. Approve AttributeType purpose, typed value model, scope, cardinality, inheritance and historical snapshots (D4–D7).
3. Approve Warehouse/stock quantity semantics, receipt destination granularity and order allocation (D8–D9).
4. Approve Variant ID/API compatibility, voucher hierarchy scope, report aggregation and deployment/recovery approach (D10–D12, D14).
5. Add and approve the canonical ERD v2/data dictionary (D15).
6. Obtain sanitized DB evidence and record actual row counts, duplicates, ID overlap, SKU, inventory, FK and snapshot profiles (D13).
7. Implement forward-only Flyway changes on a feature branch; rehearse upgrade, backfill, reconciliation and recovery on MySQL 8.4. Keep V1–V6 immutable.
8. Update entity/repository/service/DTO/API and frontend compatibility as an agreed plan; add P2 regression tests from Section 7.
9. Ensure CI actually runs on the P2 branch/PR and verify every job. Baseline CI is not evidence for future schema code.

## 11. Conclusion

P1 now has a source-backed inventory of the 32 application tables, current FK/dependency risks, a candidate Product/Attribute/Warehouse model, V1→V2 mapping, and a staged migration/recovery design.

**ERD v2 is not frozen. P1 is PARTIAL, not PASS.** P2 must not run or ship a schema migration until material decisions D1–D15 are resolved to the extent required for the chosen target and the actual data profile is verified. No source migration, production table, or application business logic was altered in this phase.


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
