# Phase 1 — Physical Data Dictionary (Clean Schema Reset target)

- Status: **PARTIAL / target DDL added in isolated Flyway location; CI verification pending; default application migration location not switched**
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

Do not silently add a unique key on ACCOUNTS.email, ACCOUNTS.phone, or PRODUCTS.slug: those columns are not marked UK in this ERD version. **The isolated target DDL currently makes phone NOT NULL and UNIQUE despite that ERD annotation.** Treat this as a working default, not an approved schema rule; resolve TGT-01 with the login/API contract, then align the ERD decision record, dictionary, DDL and tests.

## 4. Target behavior and physical decisions

Clean Schema Reset means legacy-source rows do not need to be mapped. The target DDL applies the following working defaults. Application-level enforcement and final acceptance tests remain pending.

| ID | Topic | Target decision required | Status |
|---|---|---|---|
| TGT-01 | Account identity | Draft DDL applies required+unique phone and nullable/non-unique email, but the ERD does not mark phone/email unique. Treat uniqueness as an unresolved working default until the owner approves the login and physical schema contract. | WORKING DEFAULT / DECISION OPEN |
| TGT-02 | Nullability and lengths | Bounded lengths and required/nullable fields are encoded in target DDL; cross-check each against DTO validation during integration. | DDL DRAFT / REVIEW |
| TGT-03 | Monetary contract | DECIMAL(18,2), VND, line/order discount snapshots, and total = subtotal − all discounts + shipping are applied as working defaults. | DDL APPLIED / SERVICE OPEN |
| TGT-04 | Attribute system | Typed TEXT/NUMBER/BOOLEAN/OPTION values are supported; Size/Color are option-backed and variant-defining in the dev fixture. | SCHEMA APPLIED / CATALOG OPEN |
| TGT-05 | Product hierarchy | Parent/child rows share PRODUCTS; nullable inherited fields and SKU uniqueness are applied. MySQL 8.4 rejects a CHECK that references the AUTO_INCREMENT id, so self-parent and multi-row cycle prevention must be enforced by the product service and tests. | DDL APPLIED / SERVICE OPEN |
| TGT-06 | Inventory | Composite warehouse/product key, non-negative quantity, version and idempotency uniqueness are applied; locking and ledger/balance atomicity remain service-level work. | DDL APPLIED / SERVICE OPEN |
| TGT-07 | Cart and guest behavior | Clean target carts/orders require an account. Authenticated-only behavior still needs API/frontend enforcement. | DDL APPLIED / API OPEN |
| TGT-08 | Voucher/checkout | Target-only simple vouchers and order voucher snapshots are selected; scope links and persisted checkout_quotes are excluded. Limit enforcement and atomic redemption remain service-level work. | DDL APPLIED / SERVICE OPEN |
| TGT-09 | Payment and shipping | COD-only initial method and one payment per order are applied; status transitions, authorization and shipping API behavior remain open implementation work. | DDL APPLIED / API OPEN |
| TGT-10 | Address snapshots | Required immutable order address snapshot fields are present. Service-level copy-on-place and immutability tests remain pending. | DDL APPLIED / SERVICE OPEN |
| TGT-11 | Idempotency | Unique mandatory keys are applied for new orders and inventory transactions; same-payload replay and conflicting-payload handling are still service-level requirements. | DDL APPLIED / SERVICE OPEN |
| TGT-12 | Status/default rules | Allowed values/defaults are encoded in target CHECK constraints for the principal status fields; service transitions must be aligned. | DDL DRAFT / REVIEW |
| TGT-13 | Referential actions | Foreign keys use restrictive/default behavior; no cascading deletes are added. | DDL APPLIED |
| TGT-14 | Operational SQL | BIGINT, DECIMAL(18,2), TIMESTAMP(6), checks and supporting indexes are drafted in SQL; MySQL 8 verification and complete metadata review remain pending. | DDL DRAFT / CI PENDING |
| TGT-15 | Seed separation | Required roles/permissions are seeded in Flyway. Catalog/attribute/warehouse demo rows are separate, account-free test/dev SQL; first-admin provisioning stays environment-configured. | SEED ADDED / INTEGRATION OPEN |

Applied defaults are working choices in the isolated target draft, not a claim that application behavior has already been integrated. The target DDL is kept in a separate Flyway location until entity mappings and services are compatible. Review physical nullability/lengths and align each status literal with API validators before activating it.

The owner-confirmed target ERD is the table/relationship authority. The existing V1–V6 schema is used only to locate legacy code that must be updated or removed; no source row mapping, populated-source migration, legacy archive or historical crosswalk is a release gate for disposable development/test data.

## 5. Approval and exit gate

The physical dictionary is ready to drive implementation only after the active TGT-01–TGT-15 decisions are recorded or their proposed defaults are explicitly accepted. Then:

1. Pass `CleanResetSchemaTests` against the isolated DDL/seed location.
2. Verify the SQL on the supported MySQL version using an ephemeral empty database; this has not yet been run here.
3. Refactor entity/repository/service mappings and the API/frontend contracts to the target model.
4. Only after those mappings pass JPA validate and integration tests, switch the default Flyway location to the new clean baseline.
5. Keep demo data separate from system seeds and execute it only on disposable local/dev/test databases. Never reset production/shared environments under this decision.

Do not claim DDL readiness or test success until the target migration and actual test suite have been run.
