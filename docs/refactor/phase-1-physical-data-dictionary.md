# Phase 1 — Physical Data Dictionary (logical schema mapped, physical decisions open)

- Status: **DRAFT / NOT migration-ready**
- Target: owner-confirmed ERD v2, exactly 31 tables
- Authority: docs/refactor/phase-1-erd-v2-approved.mmd
- Source baseline: repository Flyway migrations V1–V6, currently 32 application tables
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
- Root-vs-child nullability for PRODUCTS.parent_product_id, optional category/brand associations, optional voucher/account links, draft GOODS_RECEIPTS.confirmed_by, optional transaction source links and optional timestamps must be translated from the ERD relationships into physical NULL/NOT NULL explicitly before DDL.
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

## 4. Physical decisions that remain before DDL

| ID | Item | Required decision/evidence | Status |
|---|---|---|---|
| PHY-01 | VARCHAR lengths | Set a length for every VARCHAR column using API limits, legacy maxima and required headroom; identify columns needing larger legacy snapshots. | OPEN |
| PHY-02 | DECIMAL precision/scale | Set precision and scale for prices, costs, totals, discounts and amounts; validate all source values fit without rounding/truncation. | OPEN |
| PHY-03 | Nullability | Produce a column-level NULL/NOT NULL matrix using relationship cardinalities and explicit ERD inheritance comments; no guesswork. | OPEN |
| PHY-04 | Timestamp type | Choose TIMESTAMP precision/time-zone storage consistently; include nullable semantics for starts/ends/placed/shipped/delivered/confirmed times. | OPEN |
| PHY-05 | Defaults | Define only justified technical defaults (e.g. version initialization) and do not invent business defaults/statuses. | OPEN |
| PHY-06 | Status literals | Publish allowed values/transitions for account, role, category, brand, product, cart, voucher, order, payment, shipping, supplier, receipt, warehouse and content status. | OPEN |
| PHY-07 | CHECK constraints | Decide/test nonnegative money, positive quantities, nonnegative on-hand stock, version bounds, parent-product self-reference/cycle avoidance and typed attribute exclusivity. | OPEN |
| PHY-08 | FK actions | Define ON DELETE/ON UPDATE for every FK. Current source documentation says it avoids cascading deletes, but target action must be explicit. | OPEN |
| PHY-09 | Secondary indexes | Derive indexes from FK joins, catalogue filters, order lookup, inventory ledger and audit queries; verify with explain plans later. No speculative index is marked approved. | OPEN |
| PHY-10 | Account identity | Reconcile the target ERD's lack of UK marker on phone/email with existing phone login and V2 UNIQUE(phone). Preserve a safe, unambiguous login contract before target DDL. | BLOCKER |
| PHY-11 | Product/category/brand slugs | Source schema has no slug columns. Approve a deterministic slug-generation/collision policy before backfill. PRODUCTS.slug is not UK in this ERD; category/brand/content slugs are UK. | OPEN |
| PHY-12 | Target-only source values | ACCOUNTS.full_name, SUPPLIERS.code, GOODS_RECEIPT_ITEMS.unit_cost and PRODUCTS.cost_price have no authoritative equivalents in the source schema. Define nullable/unknown or approved external-source mapping. | BLOCKER |
| PHY-13 | Attribute snapshot encoding | Define deterministic encoding of legacy size/color and other fields into ORDER_ITEMS.attribute_snapshot. Preserve exact original facts. | BLOCKER |
| PHY-14 | Idempotency keys | ORDERS.idempotency_key and INVENTORY_TRANSACTIONS.idempotency_key are UK in target. Define historical row backfill, nullability, key derivation and runtime retry semantics. | BLOCKER |
| PHY-15 | Stock meaning | Current inventories.available_quantity is the legacy sellable quantity; target quantity_on_hand is not automatically equivalent. Review active orders/concurrency and approve the conversion. | BLOCKER |
| PHY-16 | Historical image URL | Current order_items.image_url_snapshot is not in target ORDER_ITEMS. Approve an archive/retention representation before contracting the source column. | BLOCKER |
| PHY-17 | Reduced voucher/checkout persistence | Target omits voucher scope joins, usage ledger and checkout_quotes. Profile source rows and approve transform/archive/retire rules; do not add tables back silently. | BLOCKER |
| PHY-18 | COD aggregate payment | Current payments has due/received/refunded amounts and collection/refund attribution; target PAYMENTS is a smaller one-row aggregate. Define a lossless archive/mapping for all source facts. | BLOCKER |
| PHY-19 | Source-only operational/audit data | Disposition order recipient_email/notes/reasons/terminal timestamps, shipping delivery_mode, supplier address/note, receipt date/note and audit description. | BLOCKER |
| PHY-20 | Target-only warehouse | Provision and map a deliberate initial warehouse; existing source has no WAREHOUSES table. | OPEN |

## 5. Approval and exit gate

The logical table/relationship set is owner-confirmed. The physical dictionary is **not complete enough to authorize DDL** until PHY-01–PHY-09 are completed and reviewed, and any blocker relevant to rows present in the source has an evidence-backed disposition. A missing source value must not be fabricated, and a data-preservation decision must not be implemented by silently adding a table/column outside the approved 31-table ERD.

P1 does not pass merely because this file exists. The final physical dictionary must be reflected in reviewed target DDL and tests during the migration implementation phase.
