> **P1 reconciliation update (2026-10-23):** This is the long-form target contract, but older appended source inventories and pre-decision defaults must not override current owner decisions. The live target ERD/DDL include integer-VND money, ORDERS.request_fingerprint, VOUCHERS.usage_count, GOODS_RECEIPTS.warehouse_id, PAYMENTS refund metadata and ORDER_ITEMS.image_url_snapshot. Parent and child Products each own a required price under DB-01; only name/slug/description are annotated as potential child inheritance fields. See docs/refactor-v2/p1/P1-contract-reconciliation-2026-10-23.md. P1 remains PARTIAL; DB-03, DB-05 and DB-12 remain open.

# FIDO — Phase 1: Owner-confirmed ERD v2 & Data Contract

- **Status: PARTIAL.** The owner has supplied the finalized logical schema directly in the 2026-10-22 conversation. The canonical target is **31 tables**, not the 38-table draft previously recorded here. The diagram and this contract now match the owner-supplied scope.
- **Repository:** https://github.com/quangson2809/FIDO
- **Migration baseline branch:** demo1
- **Pre-reset source reference SHA:** f931602c86fdf5a59b487d6edd77331b7d64333a
- **Audited source baseline SHA:** 22bd3d887cef3c077e714e5ec21e70ba89855d46
- **Original documentation branch:** `docs/phase-1-erd-v2-freeze` (historical provenance; not the current working branch)
- **Target schema confirmation:** 2026-10-22
- **Scope:** freeze the owner-confirmed 31-table target model and record the approved **Clean Schema Reset** strategy for development/test environments. The existing V1–V6 chain is documented only as a legacy comparison, not as a dataset to migrate.
- **Owner decision (2026-10-22):** design for the new target business rules, discard obsolete development/test data, and reseed from a clean database. Do not build source-to-target data migration, historical crosswalk, or archive machinery solely to preserve test fixtures.
- **Excluded:** executing a database reset from this PR, destructive changes to production/shared environments, silently expanding the target schema, or switching the application to the new migration location before JPA/API/frontend mappings are aligned.

> Source of truth: the exact 31-table ERD most recently supplied by the project owner. The earlier 38-table draft is superseded. V1–V6 are legacy implementation evidence only. Do not re-add a target table or column absent from the owner-confirmed ERD without an explicit owner change.

## 1. Execution summary and evidence boundary

### 1.1 Work performed

1. Replaced the previous 38-table draft with the exact owner-confirmed 31-table ERD.
2. Recorded Clean Schema Reset for disposable development/test databases; legacy source rows are not migrated.
3. Added an isolated two-version Flyway location: the 31-table target baseline plus required RBAC system seed.
4. Added a separate development/test demo fixture for parent/child Products, typed Size/Color options, images, warehouse inventory and a voucher; it creates no accounts or credentials and is not a migration.
5. Added `CleanResetSchemaTests` and a dedicated GitHub Actions workflow covering clean install, exact table inventory, seed boundary, phone uniqueness and development fixture behavior.
6. Kept the new migration location isolated because existing JPA mappings/services/frontend contracts have not yet been switched from legacy tables.
7. No external database was connected, dropped, or reset.

### 1.2 Verified facts versus unavailable evidence

| Item | Result | Evidence boundary |
|---|---|---|
| Owner-confirmed target ERD | **31 logical tables** | Approved diagram and owner's explicit schema |
| Existing V1–V6 migration DDL | **32 application tables** | Source migration files; excludes Flyway metadata |
| Owner's reset strategy | **CONFIRMED** | Clean Schema Reset for disposable development/test data; reseed target data from scratch |
| Target DDL + required system seed | **ADDED / VERIFICATION PENDING** | `backend/src/main/resources/db/clean-reset` contains the 31-table schema and RBAC seed; isolated schema CI is the verification gate |
| Application integration | **NOT COMPLETE** | Existing entities/services/APIs/frontend still depend on legacy Variant/size/color and checkout-quote contracts; default Flyway location remains unchanged |
| Fresh install of the isolated target DDL | **NOT VERIFIED** | The 31-table DDL and system seed exist under `db/clean-reset`; exact-SHA H2 tests failed and the dedicated MySQL verification did not run. No successful clean install is evidenced. |
| Database environments reset | **NOT RUN** | No connection or destructive DB operation was performed |
| Production/shared data deletion | **NOT APPROVED** | The decision applies to development/test data only; any non-disposable environment needs separate explicit authorization |

The reset decision makes legacy row counts, populated-source migration rehearsal and historical data retention non-gates for obsolete development fixtures. It does **not** settle the new application's business/API contracts, physical SQL rules, authentication identity constraints, or required seed data.

### 1.3 Current-schema count clarification

The original file name `V1__baseline_28_tables.sql` describes the V1 baseline. V1–V6 currently define 32 application tables because V5 adds `voucher_products`, `voucher_categories`, `voucher_usages` and `checkout_quotes`. That count describes the old code/schema only; the target remains the owner's 31-table ERD.

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
- ORDER_ITEMS snapshots SKU, product name, attribute text and image_url_snapshot. The image snapshot field exists in the approved target; immutable asset retention/versioning is a separate DB-07 policy and test requirement.
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

## 4. Runtime/API compatibility gates (not source-row migration instructions)

Clean Schema Reset means disposable development/test rows and old IDs are not migrated. This section records **runtime and API behavior that may depend on the old implementation**; it is not a checklist for retaining old rows, building historical ID crosswalks, backfilling old values or archiving test fixtures. Decide whether each behavior remains supported in the new application before implementation.

| Area | Legacy behavior or dependency to inspect | Target-shape gap / decision still required |
|---|---|---|
| Accounts and RBAC | Phone is the current login identifier; source V2 enforces phone uniqueness. Existing role/permission codes and grants affect authorization. | The logical ERD does not mark phone/email unique, while the draft target DDL enforces unique phone. Resolve this physical/security contract before freeze. Confirm login/error semantics and system seeds; never invent grants. |
| Addresses | Current APIs accept an address representation from the existing account/order flow. | Target addresses require recipient and structured province/district/ward/address fields. Define validation and DTO mapping; do not silently fabricate missing geographic fields. New orders need an immutable address snapshot. |
| Parent/child Products and attributes | Current entities, cart items, order items, inventory and public DTOs refer to Variant/SizeValue/Color identifiers. | Target uses child Product IDs plus typed attributes. Freeze public ID/DTO behavior, parent/child inheritance, price resolution, option/type validation and parent-cycle rules. Do not treat the old numeric Variant ID as a target Product ID. |
| Prices, costs and images | Legacy catalog uses parent price/optional variant override, image ordering/alt text and an order-item image snapshot. | Freeze NULL-means-inherit price behavior and primary-image rules. The target has `is_primary`, no image alt-text column and no order-item image snapshot; decide the supported API behavior for new target orders without adding unapproved columns. Unknown cost values must remain unknown, not be replaced with sales price or zero. |
| Cart and checkout | The legacy implementation uses Variant-based cart items and a checkout quote flow. Older API text also described guest intent. | Owner decision (2026-10-05) requires login before using a persisted cart or placing an order; target carts require an account and `cart_items.product_id`. Do not implement guest-cart/session behavior without an explicit amended owner decision. The absence of `checkout_quotes` is a separate open quote-validation/API contract decision. |
| Vouchers | Source V5 and services include product/category scopes, usage tracking, restoration and persisted checkout quotes. | Target contains `VOUCHERS` and `ORDER_VOUCHER_SNAPSHOTS`, but no scope joins, usage ledger or persisted quote. Freeze or explicitly defer discount rules, eligibility, limits, concurrency, redemption/restore semantics and related API behavior. |
| Orders and money | Source orders/payment APIs expose existing state transitions, totals, snapshots, cancellation and after-sales behavior. | Target has a different order shape and one payment aggregate. Freeze total/discount formulas, legal status transitions, attribute-snapshot encoding, response DTOs and the behavior of fields absent from the target. The current source row values will not be migrated. |
| Order idempotency | Source quote fingerprint/expiry/order association is not equivalent to an order idempotency key. | Target marks `orders.idempotency_key` unique. Define key scope, payload binding, same-key replay, conflicting-payload response and transaction boundary for new requests. No historical key backfill is needed for Clean Schema Reset. |
| Payment and shipping | Source Payment stores received/refunded aggregates and actor/time facts; source ShippingInfo uses `delivery_mode`. | Target has one COD-oriented payment row with no payment/refund event table; target shipping has carrier/tracking/status/timestamps but no `delivery_mode`. Decide supported lifecycle and public DTO behavior without inferring external integrations from column names. |
| Procurement and inventory | Source stock is keyed by Variant and `available_quantity`; source receipts and movements have their own reason/actor semantics. | Target stock is keyed by `(warehouse_id, product_id)` and uses `quantity_on_hand` plus version; there is no reservation column/table. Freeze stock meaning, deduction timing, warehouse behavior, idempotent movement keys, adjustment reason/audit representation and receipt command invariants. Old balances are not carried forward. |
| Audit, content and reports | Source audit descriptions, content page codes and reporting queries use legacy fields/states. | Target audit stores before/after JSON and correlation ID; content uses slug; report columns/status filters change with order/payment/inventory. Define new runtime payloads and formulas. Do not fabricate event-level history from aggregates. |
| Physical SQL | ERD shape does not specify every physical detail. | Before activation, finish type/length/precision, nullability/defaults, constraints, indexes, FK actions, timezone and allowed status literals in the physical dictionary, then verify on supported MySQL. |

The legacy migration inventory in Section 2 is evidence for locating affected code and tests. It is **not** an instruction to preserve or transform the old development database. The target schema and new application contract must be tested together after the P1 decisions are frozen.

## 5. Owner-approved strategy — Clean Schema Reset

### 5.1 Decision

The project owner selected **Clean Schema Reset** on 2026-10-22:

- Build the physical schema from the new owner-confirmed 31-table ERD and the new business/API contract.
- Treat obsolete development and test rows as disposable; rebuild seed data against the target schema.
- Do not implement a populated-database migration, source ID crosswalks, row-by-row backfills, legacy archive, dual-write/cutover machinery, or reconciliation solely to retain development fixtures.
- The existing V1–V6 inventory remains useful only to identify code that must change or be removed.

### 5.2 Safety boundary

This decision applies only to explicitly disposable **local/development/test** databases. It does not authorize dropping production, shared integration, staging, or any environment containing user/business data. No database has been reset by this documentation change.

Before a reset is executed, the implementation task must identify the exact database/profile and verify that it is disposable. Do not run a destructive reset merely because the schema history differs. If any environment's data must be retained, it is outside this Clean Schema Reset path and requires a separately approved plan.

### 5.3 Flyway strategy for a clean target install

The implementation phase should establish a fresh target-first baseline for the 31-table schema rather than attempting to upgrade or backfill old development data.

- Review all current V1–V6 references and the target implementation before choosing the final migration file layout.
- If the branch replaces the old V1–V6 migration chain with a new clean baseline, existing disposable databases that already recorded V1–V6 must be recreated; applying changed historical files to an old Flyway history is not a supported upgrade strategy.
- Do not modify already-used migration history on a shared/deployed environment. Such an environment must not be treated as a clean-reset target without separate authorization.
- Validate the target baseline by creating an empty database from scratch and applying the target migrations in order. Populated-source migration tests are not required for this decision.

### 5.4 Seed strategy

Keep mandatory system/reference seeds separate from illustrative demo data.

- **Required system seed:** only rows required for the application to initialize and enforce approved RBAC/business rules, such as required roles/permissions and any owner-approved reference values.
- **Development/demo seed:** representative accounts, catalog, inventory, vouchers, carts and orders for UI/API testing; load only in an explicitly selected development/test profile or documented test fixture.
- Do not place reusable plaintext passwords, personal information, production secrets or demo-only records in a production migration.
- Seed IDs/codes must be deterministic where tests depend on them; seed operations must be safe for a fresh database and tested alongside constraints.

The exact seed rows and initial admin/bootstrap mechanism remain implementation decisions and must be documented before code is merged.

## 6. Remaining target-business decisions

Clean Schema Reset removes legacy-data preservation questions; it does not authorize incompatible or ambiguous runtime behavior. Resolve these matters against the new schema before implementation:

1. **Account identity:** the ERD does not mark `ACCOUNTS.phone` or `email` unique, but the current application uses phone login. Decide the physical uniqueness rule and login contract; never allow ambiguous account lookup.
2. **Cart/order authentication — resolved:** the owner decision dated 2026-10-05 requires login before using a persisted cart or placing an order. Do not add guest identity/session persistence to the 31-table target. Reconcile all legacy JWT-optional/guest-TBD annotations in API #14–20 to JWT-required target behavior. The old guest-order-lookup wording is not in the current 77-endpoint map and must not be treated as a target requirement without an explicit scope amendment.
3. **Parent/child Product and attributes:** define the supported attribute codes/types/options, which attributes distinguish child Products, and validation for parent/child inheritance and cycles.
4. **Voucher/checkout behavior:** the target omits voucher scope join tables, a usage ledger and `checkout_quotes`. Define the supported voucher capability and confirm checkout/API behavior can work without persistence omitted from the target.
5. **Order money contract:** define line `discount_amount`, order-level discounts, currency and placement time for new orders. Do not introduce a made-up historical allocation; historical rows will not be carried over by this reset.
6. **Payment/shipping contract:** define target statuses, whether payment methods are limited to COD, and how a new order's `PAYMENTS`, `ORDER_ADDRESSES` and `SHIPPING_INFOS` are created/updated.
7. **Physical SQL:** approve nullability, VARCHAR lengths, DECIMAL precision/scale, timestamp/time-zone policy, defaults, CHECK constraints, useful indexes and foreign-key delete behavior. The ERD alone does not specify all physical details.
8. **Initial seed:** list mandatory roles/permissions, attribute types/options, default warehouse (if required), and the development-only demo fixture. Keep production/bootstrap account creation secure.

The revised questionnaire narrows to these target-business and physical-schema decisions. Legacy-only questions about preserving old phone duplicates, source inventory balances, historical snapshots/refunds, source-only fields and old idempotency values are no longer migration blockers for disposable dev/test data.

## 7. Implementation and verification gates

### P1 — Logical schema freeze

- Preserve the exact 31-table owner-confirmed ERD and its relationships.
- Complete the active physical decisions above and update the data dictionary.
- Freeze public API/business contract changes before implementing the new schema.

### P2 — Clean target implementation

- Replace legacy entity/repository assumptions with the target model: one `PRODUCTS` parent/child hierarchy, typed attributes, target inventory keys, and the approved order/payment/shipping persistence shape.
- Implement fresh target DDL and minimum required system seeds; load demo fixtures separately for development/test.
- Do not retain unused legacy tables or columns merely to keep old tests passing. Update or remove tests that assert superseded behavior, while preserving tests for still-approved business requirements.
- Reconcile frontend DTO/API callers with the new contract. A schema reset alone does not make existing Java/TypeScript code compatible.

### P3 — Acceptance

Required evidence for release:

- Create a brand-new empty MySQL database and apply every target migration successfully.
- Assert exactly the approved target application-table set; Flyway metadata tables are not application tables.
- Verify PK/FK/UK/CHECK constraints, status transitions, parent/child Product rules, typed attributes, inventory transactions/concurrency, cart ownership, voucher behavior, order totals, payment and shipping flows.
- Load required system seeds and confirm the application starts with expected permissions; load demo data only through the development/test mechanism.
- Run the repository's actual backend/frontend lint, type-check, unit, integration and build commands after reviewing current scripts. Report each result accurately.
- Test the supported database reset/bootstrap path without connecting to production/shared data.

Do not claim success based only on a successful compilation or a documentation diff. No migration, application test, or database reset is claimed as performed in this phase.

## 8. Decision record and phase status

| Item | Decision/status |
|---|---|
| Target logical schema | **CONFIRMED — 31 tables** |
| Existing V1–V6 schema | Legacy reference only — 32 application tables |
| Development/test data preservation | **NOT REQUIRED — Clean Schema Reset approved** |
| Historical crosswalk/archive/populated-source migration | **OUT OF SCOPE** for disposable dev/test data |
| Production/shared database reset | **NOT AUTHORIZED** by this decision |
| Fresh target DDL and seed implementation | **ADDED — VERIFICATION OPEN** | Target DDL + seed exist in isolated `db/clean-reset`; not activated as default runtime migration |
| Physical SQL and active business/API decisions | **OPEN** |
| Automated acceptance on target schema | **NOT RUN** |
| Database reset performed | **NO** |

## 9. Target model invariants

- Do not add tables back from the old implementation (such as `PRODUCT_VARIANTS`, size/color master tables, voucher scope links, voucher usage ledger, or `CHECKOUT_QUOTES`) unless the owner explicitly revises the ERD.
- Do not add `image_url_snapshot` to `ORDER_ITEMS`; the target contract intentionally omits it.
- Product parent/child rows share `PRODUCTS`; child IDs must be normal Product IDs in the new database, not legacy Variant IDs. Validate no self-parent/cycle in the service layer; MySQL 8.4 forbids the attempted CHECK reference to the AUTO_INCREMENT id.
- Inventory is keyed by `(warehouse_id, product_id)` and stores `quantity_on_hand` plus `version`; the target has no reservation column/table.
- Keep required order address/voucher snapshots and the one-payment-per-order target shape according to the owner-approved ERD.
- Physical uniqueness, nullability and runtime semantics must be intentionally approved; do not infer them only from a column name.

## 10. Related artifacts and boundaries

- [Owner-confirmed ERD v2](phase-1-erd-v2-approved.mmd) is the logical schema authority.
- [Physical data dictionary](phase-1-physical-data-dictionary.md) records target columns and unresolved physical SQL details.
- [Owner decision questionnaire](phase-1-owner-decision-questionnaire.md) contains only remaining decisions relevant to the new target contract.
- The former preflight SQL, synthetic legacy fixture, runbook and static artifact test have been removed from this PR because Clean Schema Reset does not require them.

**Implementation status:** the 31-table logical target and Clean Schema Reset direction are confirmed. The target DDL and system seed now exist in an isolated Flyway location, but P1 remains **PARTIAL** until the dedicated CI run passes and the JPA/service/API/frontend integration is complete. The default runtime migrations were not changed, and no database reset was performed.

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
