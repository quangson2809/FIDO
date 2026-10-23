# Phase 1 — Physical Data Dictionary (current target reconciliation)

- **Status: PARTIAL.** This file is regenerated from the canonical target ERD at baseline 551d91dab8b47ac709283f9222667b06c6b1b6de and is not evidence that the active application is migrated.
- **Logical authority:** docs/refactor/phase-1-erd-v2-approved.mmd
- **Physical column evidence:** docs/refactor-v2/p1/P1-data-dictionary.csv (RFC 4180)
- **Draft DDL:** backend/src/main/resources/db/clean-reset/V1__clean_schema.sql (isolated, not the active Flyway migration location)
- **Legacy comparison only:** active Flyway V1–V6 and current JPA entities.
- **P1 reconciliation:** docs/refactor-v2/p1/P1-contract-reconciliation-2026-10-23.md

## 1. Counting rules and authority

The canonical diagram currently parses to 31 logical tables and 228 logical fields. The isolated DDL has one additional generated physical-only column, accounts.phone_active_key, used for active-account phone uniqueness. These counts are snapshot metadata; the static checker derives expected table count from the ERD and checks the exact table set.

The canonical ERD describes logical fields, key annotations and comments. The field-level CSV is the row-per-physical-column register for SQL type, physical nullability/default/generated expression, constraint/index references, owner module, lifecycle, validation and implementation status. If the CSV, DDL or ERD disagree, P1 is blocked until a source-backed correction is made; passing a checker alone does not approve an unapproved physical choice.

## 2. Canonical target table/field inventory

The following inventory is derived directly from the canonical Mermaid ERD. Type family and PK/FK/UK marks are logical diagram metadata; physical lengths, nullability, defaults, generated expressions, secondary indexes and FK delete actions must be read from the physical CSV and draft SQL.

| Table | Canonical logical fields |
|---|---|
| ACCOUNTS | id BIGINT [PK]; full_name VARCHAR; email VARCHAR; phone VARCHAR; password_hash VARCHAR; status VARCHAR; deleted_at TIMESTAMP — NULL means active; soft-deleted accounts release phone; created_at TIMESTAMP; updated_at TIMESTAMP |
| ADDRESSES | id BIGINT [PK]; account_id BIGINT [FK]; recipient_name VARCHAR; recipient_phone VARCHAR; province VARCHAR; district VARCHAR; ward VARCHAR; address_line VARCHAR; is_default BOOLEAN; created_at TIMESTAMP; updated_at TIMESTAMP |
| ROLES | id BIGINT [PK]; code VARCHAR [UK]; name VARCHAR; description VARCHAR; status VARCHAR |
| PERMISSIONS | id BIGINT [PK]; code VARCHAR [UK]; name VARCHAR; description VARCHAR |
| ACCOUNT_ROLES | account_id BIGINT [PK,FK]; role_id BIGINT [PK,FK] |
| ROLE_PERMISSIONS | role_id BIGINT [PK,FK]; permission_id BIGINT [PK,FK] |
| CATEGORIES | id BIGINT [PK]; parent_category_id BIGINT [FK]; name VARCHAR; slug VARCHAR [UK]; status VARCHAR; created_at TIMESTAMP; updated_at TIMESTAMP |
| BRANDS | id BIGINT [PK]; name VARCHAR; slug VARCHAR [UK]; status VARCHAR |
| PRODUCTS | id BIGINT [PK]; parent_product_id BIGINT [FK]; category_id BIGINT [FK]; brand_id BIGINT [FK]; name VARCHAR — NULL for child if inherited; slug VARCHAR — NULL for child if inherited; sku VARCHAR [UK]; description TEXT — NULL for child if inherited; selling_price BIGINT — Integer VND; each parent/child Product owns its own required price; never inherited; cost_price BIGINT — Integer VND; nullable; status VARCHAR; deleted_at TIMESTAMP; created_at TIMESTAMP; updated_at TIMESTAMP |
| ATTRIBUTE_TYPES | id BIGINT [PK]; code VARCHAR [UK]; name VARCHAR; data_type VARCHAR |
| ATTRIBUTES | id BIGINT [PK]; attribute_type_id BIGINT [FK]; code VARCHAR [UK]; name VARCHAR; is_required BOOLEAN; is_variant_defining BOOLEAN; sort_order INT |
| ATTRIBUTE_OPTIONS | id BIGINT [PK]; attribute_id BIGINT [FK]; value VARCHAR; label VARCHAR; sort_order INT |
| PRODUCT_ATTRIBUTE_VALUES | product_id BIGINT [PK,FK]; attribute_id BIGINT [PK,FK]; option_id BIGINT [FK]; text_value VARCHAR; number_value DECIMAL — Descriptive numeric attribute; not money; boolean_value BOOLEAN |
| PRODUCT_IMAGES | id BIGINT [PK]; product_id BIGINT [FK]; image_url VARCHAR; is_primary BOOLEAN; sort_order INT; created_at TIMESTAMP |
| CARTS | id BIGINT [PK]; account_id BIGINT [FK]; status VARCHAR; created_at TIMESTAMP; updated_at TIMESTAMP |
| CART_ITEMS | id BIGINT [PK]; cart_id BIGINT [FK]; product_id BIGINT [FK]; quantity INT; added_at TIMESTAMP; updated_at TIMESTAMP |
| VOUCHERS | id BIGINT [PK]; code VARCHAR [UK]; discount_type VARCHAR; discount_value BIGINT — Integer VND for FIXED; integer percent basis points for PERCENT; minimum_order_value BIGINT — Integer VND; maximum_discount BIGINT — Integer VND; nullable; starts_at TIMESTAMP; ends_at TIMESTAMP; usage_limit INT; usage_count INT — Atomically incremented on successful placement; never exceeds usage_limit; status VARCHAR |
| ORDERS | id BIGINT [PK]; account_id BIGINT [FK]; voucher_id BIGINT [FK]; order_number VARCHAR [UK]; idempotency_key VARCHAR [UK]; request_fingerprint CHAR(64) — Canonical hash of semantic checkout input; status VARCHAR; subtotal BIGINT — Integer VND; discount_amount BIGINT — Integer VND; shipping_fee BIGINT — Integer VND; total_amount BIGINT — Integer VND; currency CHAR(3); placed_at TIMESTAMP; created_at TIMESTAMP; updated_at TIMESTAMP |
| ORDER_ITEMS | id BIGINT [PK]; order_id BIGINT [FK]; product_id BIGINT [FK]; sku_snapshot VARCHAR; product_name_snapshot VARCHAR; attribute_snapshot VARCHAR; image_url_snapshot VARCHAR — Immutable retained asset reference; quantity INT; unit_price BIGINT — Integer VND; discount_amount BIGINT — Integer VND; line_total BIGINT — Integer VND |
| ORDER_ADDRESSES | order_id BIGINT [PK,FK]; recipient_name VARCHAR; recipient_phone VARCHAR; province VARCHAR; district VARCHAR; ward VARCHAR; address_line VARCHAR |
| ORDER_VOUCHER_SNAPSHOTS | order_id BIGINT [PK,FK]; voucher_code_snapshot VARCHAR; discount_type_snapshot VARCHAR; discount_value_snapshot BIGINT — Integer VND or integer percent basis points; discount_amount_snapshot BIGINT — Integer VND |
| PAYMENTS | order_id BIGINT [PK,FK]; method VARCHAR; payment_status VARCHAR; amount BIGINT — Integer VND; currency CHAR(3) — VND only; collected_by_account_id BIGINT [FK]; collected_at TIMESTAMP; refund_amount BIGINT — Integer VND; default zero; refunded_by_account_id BIGINT [FK]; refunded_at TIMESTAMP; refund_reason VARCHAR; created_at TIMESTAMP; updated_at TIMESTAMP |
| SHIPPING_INFOS | order_id BIGINT [PK,FK]; recipient_name VARCHAR; recipient_phone VARCHAR; carrier_name VARCHAR; tracking_number VARCHAR; shipping_status VARCHAR; shipped_at TIMESTAMP; delivered_at TIMESTAMP; updated_at TIMESTAMP |
| SUPPLIERS | id BIGINT [PK]; code VARCHAR [UK]; name VARCHAR; phone VARCHAR; email VARCHAR; status VARCHAR; created_at TIMESTAMP; updated_at TIMESTAMP |
| GOODS_RECEIPTS | id BIGINT [PK]; supplier_id BIGINT [FK]; warehouse_id BIGINT [FK] — Destination warehouse for this receipt; receipt_number VARCHAR [UK]; status VARCHAR; created_by BIGINT [FK]; confirmed_by BIGINT [FK]; confirmed_at TIMESTAMP; created_at TIMESTAMP; updated_at TIMESTAMP |
| GOODS_RECEIPT_ITEMS | id BIGINT [PK]; goods_receipt_id BIGINT [FK]; product_id BIGINT [FK]; quantity_received INT; unit_cost BIGINT — Integer VND |
| WAREHOUSES | id BIGINT [PK]; code VARCHAR [UK]; name VARCHAR; status VARCHAR |
| INVENTORIES | warehouse_id BIGINT [PK,FK]; product_id BIGINT [PK,FK]; quantity_on_hand INT; version INT; updated_at TIMESTAMP |
| INVENTORY_TRANSACTIONS | id BIGINT [PK]; warehouse_id BIGINT [FK]; product_id BIGINT [FK]; transaction_type VARCHAR; quantity_delta INT; goods_receipt_item_id BIGINT [FK]; order_item_id BIGINT [FK]; idempotency_key VARCHAR [UK]; reason_code VARCHAR — Required for manual adjustments and reversals; reverses_transaction_id BIGINT [FK] — Nullable; reversal references original movement; created_by BIGINT [FK]; created_at TIMESTAMP |
| AUDIT_LOGS | id BIGINT [PK]; actor_account_id BIGINT [FK]; action VARCHAR; entity_type VARCHAR; entity_id VARCHAR; before_data JSON; after_data JSON; correlation_id VARCHAR; created_at TIMESTAMP |
| CONTENT_PAGES | id BIGINT [PK]; slug VARCHAR [UK]; title VARCHAR; content TEXT; status VARCHAR; updated_by BIGINT [FK]; updated_at TIMESTAMP |

## 3. Target/legacy boundaries and physical decisions

- Target monetary values are integer VND (1 unit = 1 VND) and use BIGINT columns. DECIMAL remains valid for non-money descriptive numeric values such as PRODUCT_ATTRIBUTE_VALUES.number_value; legacy BigDecimal money types are not the target contract.
- ORDERS.currency and PAYMENTS.currency are constrained to VND in the current draft. DB-10 resolves currency/storage units; discount rounding/allocation and full cross-field formula acceptance remain separately gated.
- accounts.phone_active_key is a generated physical-only column, not an ERD entity property. It derives from phone while deleted_at is NULL and is NULL after soft deletion, supporting active-account-only uniqueness.
- GOODS_RECEIPTS.warehouse_id is required and references WAREHOUSES. One operational warehouse is the v1 business boundary; receiving/ledger transaction behavior remains under DB-03.
- ORDERS.request_fingerprint, VOUCHERS.usage_count, ORDER_ITEMS.image_url_snapshot and Payment refund metadata are in the target ERD/DDL/dictionary. Their presence does not complete idempotency, quota, immutable asset retention or refund policies.
- Under DB-01, parent and child Products are independently sellable and each has its own SKU, selling price and inventory. selling_price is therefore NOT NULL in the isolated DDL draft and is never inherited. name/slug/description are the only fields annotated as child inheritance candidates; their effective read, hierarchy depth and parent-update propagation rules remain open. Do not infer inheritance for category_id, brand_id, status, cost_price, images, attributes or inventory.
- Do not add ProductVariant, SizeSystem, SizeValue, Color, CHECKOUT_QUOTES, voucher-scope, inventory-reservation, payment/refund-event, shipment-event or return tables unless a later owner decision explicitly amends the target model.
- FK deletion actions and per-entity retention must be frozen under DB-12 before P2 schema reset. Draft DDL constraints/indexes outside approved decisions remain proposals until acceptance.

## 4. Verification

Run from repository root: python scripts/p1/check_contract_consistency.py. This script checks ERD/DDL table and field sets, SQL/dictionary field coverage, type/nullability/default/generated-expression consistency, key annotations, constraint/index evidence and selected critical constraints.

The current P1 branch still requires an exact-commit run after reconciliation. A static PASS does not prove MySQL behavior, service/entity/API/DTO/frontend alignment, RBAC, state transitions, race safety or retention behavior. See P1-exit-gate.md for the acceptance status.
