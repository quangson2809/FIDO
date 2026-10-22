# Phase 1 — Physical Data Dictionary (Clean Schema Reset target)

- Status: **DRAFT / target DDL not yet implemented or verified**
- Target: owner-confirmed ERD v2, exactly 31 tables
- Authority: docs/refactor/phase-1-erd-v2-approved.mmd
- Legacy comparison only: repository Flyway V1–V6, currently 32 application tables
- Owner-approved strategy: Clean Schema Reset for disposable development/test databases; do not preserve old test rows
- Date: 2026-10-22

## 1. Rules for this document

This dictionary enumerates the exact columns and key annotations supplied in the approved ERD. It does **not** silently fill unspecified SQL details. PK, FK, UK and the explicit inherited/nullable comments are copied from the diagram. Other nullability must not be inferred solely from the SQL type or column name. Relationship cardinalities may guide a proposed nullability value but do not replace an explicit physical data dictionary decision.

The ERD supplies SQL type families such as BIGINT, VARCHAR, TEXT, DECIMAL, INT, BOOLEAN, TIMESTAMP and JSON. It does not generally supply VARCHAR lengths, DECIMAL precision/scale, physical nullability, default values, timestamp precision/time-zone policy, foreign-key actions, secondary indexes, or most CHECK constraints. Those fields remain open below. This is an evidence register, not a generated DDL script.

## 2. Target columns by table

| Table | Columns exactly in target ERD |
|---|---|
| ACCOUNTS | id BIGINT PK; full_name VARCHAR; email VARCHAR; phone VARCHAR; password_hash VARCHAR; status VARCHAR; created_at TIMESTAMP; updated_at TIMESTAMP |
| ADDRESSES | id BIGINT PK; account_id BIGINT FK; recipient_name VARCHAR; recipient_phone VARCHAR; province VARCHAR; district VARCHAR; ward VARCHAR; address_line VARCHAR; is_default BOOLEAN; created_at TIMESTAMP; updated_at TIMESTAMP |
| ROLES | id BIGINT PK; code VARCHAR UK; name VARCHAR; description VARCHAR; status VARCHAR |
| PERMISSIONS | id BIGINT PK; code VARCHAR UK; name VARCHAR; description VARCHAR |
| ACCOUNT_ROLES | account_id BIGINT PK,FK; role_id BIGINT PK,FK |
| ROLE_PERMISSIONS | role_id BIGINT PK,FK; permission_id BIGINT PK,FK |
| CATEGORIES | id BIGINT PK; parent_category_id BIGINT FK; name VARCHAR; slug VARCHAR UK; status VARCHAR; created_at TIMESTAMP; updated_at TIMESTAMP |
| BRANDS | id BIGINT PK; name VARCHAR; slug VARCHAR UK; status VARCHAR |
| PRODUCTS | id BIGINT PK; parent_product_id BIGINT FK; category_id BIGINT FK; brand_id BIGINT FK; name VARCHAR; slug VARCHAR; sku VARCHAR UK; description TEXT; selling_price DECIMAL; cost_price DECIMAL; status VARCHAR; deleted_at TIMESTAMP; created_at TIMESTAMP; updated_at TIMESTAMP |
| ATTRIBUTE_TYPES | id BIGINT PK; code VARCHAR UK; name VARCHAR; data_type VARCHAR |
| ATTRIBUTES | id BIGINT PK; attribute_type_id BIGINT FK; code VARCHAR UK; name VARCHAR; is_required BOOLEAN; is_variant_defining BOOLEAN; sort_order INT |
| ATTRIBUTE_OPTIONS | id BIGINT PK; attribute_id BIGINT FK; value VARCHAR; label VARCHAR; sort_order INT |
| PRODUCT_ATTRIBUTE_VALUES | product_id BIGINT PK,FK; attribute_id BIGINT PK,FK; option_id BIGINT FK; text_value VARCHAR; number_value DECIMAL; boolean_value BOOLEAN |
| PRODUCT_IMAGES | id BIGINT PK; product_id BIGINT FK; image_url VARCHAR; is_primary BOOLEAN; sort_order INT; created_at TIMESTAMP |
| CARTS | id BIGINT PK; account_id BIGINT FK; status VARCHAR; created_at TIMESTAMP; updated_at TIMESTAMP |
| CART_ITEMS | id BIGINT PK; cart_id BIGINT FK; product_id BIGINT FK; quantity INT; added_at TIMESTAMP; updated_at TIMESTAMP |
| VOUCHERS | id BIGINT PK; code VARCHAR UK; discount_type VARCHAR; discount_value DECIMAL; minimum_order_value DECIMAL; maximum_discount DECIMAL; starts_at TIMESTAMP; ends_at TIMESTAMP; usage_limit INT; status VARCHAR |
| ORDERS | id BIGINT PK; account_id BIGINT FK; voucher_id BIGINT FK; order_number VARCHAR UK; idempotency_key VARCHAR UK; status VARCHAR; subtotal DECIMAL; discount_amount DECIMAL; shipping_fee DECIMAL; total_amount DECIMAL; currency VARCHAR; placed_at TIMESTAMP; created_at TIMESTAMP; updated_at TIMESTAMP |
| ORDER_ITEMS | id BIGINT PK; order_id BIGINT FK; product_id BIGINT FK; sku_snapshot VARCHAR; product_name_snapshot VARCHAR; attribute_snapshot VARCHAR; quantity INT; unit_price DECIMAL; discount_amount DECIMAL; line_total DECIMAL |
| ORDER_ADDRESSES | order_id BIGINT PK,FK; recipient_name VARCHAR; recipient_phone VARCHAR; province VARCHAR; district VARCHAR; ward VARCHAR; address_line VARCHAR |
| ORDER_VOUCHER_SNAPSHOTS | order_id BIGINT PK,FK; voucher_code_snapshot VARCHAR; discount_type_snapshot VARCHAR; discount_value_snapshot DECIMAL; discount_amount_snapshot DECIMAL |
| PAYMENTS | order_id BIGINT PK,FK; method VARCHAR; payment_status VARCHAR; amount DECIMAL; currency VARCHAR; collected_by_account_id BIGINT FK; collected_at TIMESTAMP; created_at TIMESTAMP; updated_at TIMESTAMP |
| SHIPPING_INFOS | order_id BIGINT PK,FK; recipient_name VARCHAR; recipient_phone VARCHAR; carrier_name VARCHAR; tracking_number VARCHAR; shipping_status VARCHAR; shipped_at TIMESTAMP; delivered_at TIMESTAMP; updated_at TIMESTAMP |
| SUPPLIERS | id BIGINT PK; code VARCHAR UK; name VARCHAR; phone VARCHAR; email VARCHAR; status VARCHAR; created_at TIMESTAMP; updated_at TIMESTAMP |
| GOODS_RECEIPTS | id BIGINT PK; supplier_id BIGINT FK; receipt_number VARCHAR UK; status VARCHAR; created_by BIGINT FK; confirmed_by BIGINT FK; confirmed_at TIMESTAMP; created_at TIMESTAMP; updated_at TIMESTAMP |
| GOODS_RECEIPT_ITEMS | id BIGINT PK; goods_receipt_id BIGINT FK; product_id BIGINT FK; quantity_received INT; unit_cost DECIMAL |
| WAREHOUSES | id BIGINT PK; code VARCHAR UK; name VARCHAR; status VARCHAR |
| INVENTORIES | warehouse_id BIGINT PK,FK; product_id BIGINT PK,FK; quantity_on_hand INT; version INT; updated_at TIMESTAMP |
| INVENTORY_TRANSACTIONS | id BIGINT PK; warehouse_id BIGINT FK; product_id BIGINT FK; transaction_type VARCHAR; quantity_delta INT; goods_receipt_item_id BIGINT FK; order_item_id BIGINT FK; idempotency_key VARCHAR UK; created_by BIGINT FK; created_at TIMESTAMP |
| AUDIT_LOGS | id BIGINT PK; actor_account_id BIGINT FK; action VARCHAR; entity_type VARCHAR; entity_id VARCHAR; before_data JSON; after_data JSON; correlation_id VARCHAR; created_at TIMESTAMP |
| CONTENT_PAGES | id BIGINT PK; slug VARCHAR UK; title VARCHAR; content TEXT; status VARCHAR; updated_by BIGINT FK; updated_at TIMESTAMP |

### Explicit nullability/inheritance notes from the ERD

- PRODUCTS.name, PRODUCTS.slug and PRODUCTS.description may be NULL for a child if inherited; PRODUCTS.selling_price may be NULL on a child to mean inherited price.
- PRODUCTS.cost_price is nullable.
- PRODUCT_ATTRIBUTE_VALUES.option_id is shown as an optional relationship to ATTRIBUTE_OPTIONS. Whether each typed value is nullable and whether exactly one of option_id/text_value/number_value/boolean_value must be set still requires a constraint contract.
- Root-vs-child nullability for PRODUCTS.parent_product_id, optional category/brand associations, optional voucher links, draft GOODS_RECEIPTS.confirmed_by, optional transaction source links and optional timestamps must be translated from the ERD relationships into physical NULL/NOT NULL explicitly before DDL. The diagram marks each CARTS and ORDERS row as belonging to one account; reconcile this with the legacy schema's nullable guest-cart/guest-order references.
- A column not listed in an explicit nullability comment is **not** deemed NOT NULL just because it has a value-like name.

## 3. Key and uniqueness constraints explicitly shown

### Primary keys
- Single-column: every table with an id PK, plus order_id PK/FK in ORDER_ADDRESSES, ORDER_VOUCHER_SNAPSHOTS, PAYMENTS and SHIPPING_INFOS.
- Composite: ACCOUNT_ROLES(account_id, role_id); ROLE_PERMISSIONS(role_id, permission_id); PRODUCT_ATTRIBUTE_VALUES(product_id, attribute_id); INVENTORIES(warehouse_id, product_id).

### Unique keys
Only the following fields are marked UK in the owner-provided ERD:
- ROLES.code
- PERMISSIONS.code
- CATEGORIES.slug
- BRANDS.slug
- PRODUCTS.sku
- ATTRIBUTE_TYPES.code
- ATTRIBUTES.code
- VOUCHERS.code
- ORDERS.order_number
- ORDERS.idempotency_key
- SUPPLIERS.code
- GOODS_RECEIPTS.receipt_number
- WAREHOUSES.code
- INVENTORY_TRANSACTIONS.idempotency_key
- CONTENT_PAGES.slug

Do not silently add a unique key on ACCOUNTS.email, ACCOUNTS.phone, or PRODUCTS.slug: those columns are not marked UK in this ERD version. This creates a contract question because the existing application uses phone as the login identifier and current migration V2 makes it unique; see the decision register below.

## 4. Target behavior and physical decisions that remain before DDL

Clean Schema Reset means legacy-source rows do not need to be mapped. The following are still active decisions because they define the **new application**, not old-data preservation.

| ID | Topic | Target decision required | Status |
|---|---|---|---|
| TGT-01 | Account identity | The ERD does not mark phone/email unique, but current login uses phone. Define login identity and physical uniqueness; avoid ambiguous lookup. | OPEN |
| TGT-02 | Nullability and lengths | Assign physical nullability and VARCHAR lengths from runtime/API validation; do not infer them only from the ERD's logical type names. | OPEN |
| TGT-03 | Monetary contract | Confirm DECIMAL precision/scale, VND/currency support, line discount semantics, order total formula, rounding and `placed_at` meaning for new orders. | OPEN |
| TGT-04 | Attribute system | Define stable codes, data types, option values, selectability, variant-defining flag, inheritance and uniqueness for `ATTRIBUTE_TYPES`, `ATTRIBUTES`, `ATTRIBUTE_OPTIONS` and `PRODUCT_ATTRIBUTE_VALUES`. | OPEN |
| TGT-05 | Product hierarchy | Validate parent/child invariants, inherited nullable fields, SKU uniqueness, permissible status combinations and prevention of self-reference/cycles. `PRODUCTS.slug` is not marked unique in the supplied ERD. | OPEN |
| TGT-06 | Inventory | Define non-negative `quantity_on_hand`, version/locking semantics, transaction types and idempotent writes. The target has no reservation model; do not add `quantity_reserved` implicitly. | OPEN |
| TGT-07 | Cart and guest behavior | Target carts/orders are account-owned. Confirm authentication requirements or amend the ERD before supporting guest persistence. | OPEN |
| TGT-08 | Voucher/checkout | Define the supported voucher limits, eligibility and snapshot rules; target has no scope link tables, usage ledger or checkout_quotes. | OPEN |
| TGT-09 | Payment and shipping | Define allowed methods, statuses, transitions and actor permissions for the one-payment-per-order and optional shipping-information model. | OPEN |
| TGT-10 | Address snapshots | Define required order recipient/address fields and guarantee `ORDER_ADDRESSES` remains immutable after order placement. | OPEN |
| TGT-11 | Idempotency | Define runtime key scope, retry/conflicting-payload behavior and transaction boundaries for order creation and inventory transactions. No historical key backfill is required. | OPEN |
| TGT-12 | Status/default rules | Enumerate allowed statuses and initial values for account, role, category, brand, products, carts, vouchers, orders, payments, shipping and receiving. | OPEN |
| TGT-13 | Referential actions | Approve FK delete/update actions table-by-table; use restrictive behavior by default unless a specific lifecycle rule justifies another action. | OPEN |
| TGT-14 | Operational SQL | Select timestamp precision/time-zone policy, CHECK constraints, supporting indexes, decimal precision, ID strategy and database version compatibility. | OPEN |
| TGT-15 | Seed separation | Specify mandatory system/reference seeds separately from development-only demo accounts/catalog/orders, and define secure first-admin provisioning. | OPEN |

Suggested defaults for owner review (not yet implementation facts): BIGINT identifiers; DECIMAL(18,2) for money; TIMESTAMP(6) with a documented UTC convention; explicit status checks; restrictive FK deletion by default; unique system codes as marked by the ERD. Any exception must be recorded here before DDL is generated.

The owner-confirmed target ERD is the table/relationship authority. The existing V1–V6 schema is used only to locate legacy code that must be updated or removed; no source row mapping, populated-source migration, legacy archive or historical crosswalk is a release gate for disposable development/test data.

## 5. Approval and exit gate

The physical dictionary is ready to drive implementation only after the active TGT-01–TGT-15 decisions are recorded or their proposed defaults are explicitly accepted. Then:

1. Generate a fresh target-first migration for the approved 31-table schema.
2. Validate it against a newly created empty MySQL database.
3. Verify constraints, required seeds and application behavior, including authentication, Product hierarchy, typed attributes, inventory concurrency, cart/checkout, order totals, payment/shipping and RBAC.
4. Keep demo data separate from mandatory system seeds and load it only in a disposable development/test profile.
5. Recreate only explicitly disposable local/dev/test databases if the old Flyway history is replaced. Never reset production/shared environments under this decision.

Do not claim DDL readiness or test success until the target migration and actual test suite have been run.
