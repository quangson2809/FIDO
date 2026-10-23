# P1 — Schema Constraints and Persistence Invariants

**Status: PARTIAL.** ERD key annotations are logical authority; constraints extracted from the isolated target DDL are proposals, not approved SQL and not MySQL-verified.

## Owner ERD primary/foreign-key annotations

| Table | Primary key | FK columns called out in ERD |
|---|---|---|
| ACCOUNTS | id | — |
| ADDRESSES | id | account_id |
| ROLES | id | — |
| PERMISSIONS | id | — |
| ACCOUNT_ROLES | account_id, role_id | account_id, role_id |
| ROLE_PERMISSIONS | role_id, permission_id | role_id, permission_id |
| CATEGORIES | id | parent_category_id |
| BRANDS | id | — |
| PRODUCTS | id | parent_product_id, category_id, brand_id |
| ATTRIBUTE_TYPES | id | — |
| ATTRIBUTES | id | attribute_type_id |
| ATTRIBUTE_OPTIONS | id | attribute_id |
| PRODUCT_ATTRIBUTE_VALUES | product_id, attribute_id | product_id, attribute_id, option_id |
| PRODUCT_IMAGES | id | product_id |
| CARTS | id | account_id |
| CART_ITEMS | id | cart_id, product_id |
| VOUCHERS | id | — |
| ORDERS | id | account_id, voucher_id |
| ORDER_ITEMS | id | order_id, product_id |
| ORDER_ADDRESSES | order_id | order_id |
| ORDER_VOUCHER_SNAPSHOTS | order_id | order_id |
| PAYMENTS | order_id | order_id, collected_by_account_id |
| SHIPPING_INFOS | order_id | order_id |
| SUPPLIERS | id | — |
| GOODS_RECEIPTS | id | supplier_id, created_by, confirmed_by |
| GOODS_RECEIPT_ITEMS | id | goods_receipt_id, product_id |
| WAREHOUSES | id | — |
| INVENTORIES | warehouse_id, product_id | warehouse_id, product_id |
| INVENTORY_TRANSACTIONS | id | warehouse_id, product_id, goods_receipt_item_id, order_item_id, created_by |
| AUDIT_LOGS | id | actor_account_id |
| CONTENT_PAGES | id | updated_by |

## Unique keys annotated in the owner ERD

The diagram marks these columns as UK: ROLES.code, PERMISSIONS.code, CATEGORIES.slug, BRANDS.slug, PRODUCTS.sku, ATTRIBUTE_TYPES.code, ATTRIBUTES.code, VOUCHERS.code, ORDERS.order_number, ORDERS.idempotency_key, SUPPLIERS.code, GOODS_RECEIPTS.receipt_number, WAREHOUSES.code, INVENTORY_TRANSACTIONS.idempotency_key and CONTENT_PAGES.slug.

Do not silently mark ACCOUNTS.phone, ACCOUNTS.email or PRODUCTS.slug unique. D1 and DB-09 must resolve phone-login uniqueness and the owner diagram does not mark those fields as UK.

## Constraint/index inventory from the isolated DDL draft

Detailed named PK/FK/UNIQUE/CHECK/index definitions are extracted in the per-column P1-data-dictionary.csv and P1-data-dictionary.md. They are proposals copied from backend/src/main/resources/db/clean-reset/V1__clean_schema.sql; they do not prove successful MySQL application or owner acceptance.

## DB constraints versus application invariants

### Product hierarchy and Category
- A parent/category/brand FK prevents dangling references but not self-parent, longer cycles, hierarchy depth or sellability rules.
- Product service must validate parent-child policy, cycle-free graph, the approved leaf-category rule, and stopped/deleted parent behavior.
- SKU uniqueness does not ensure unique normalized sets of variant-defining attributes. P1-PROP-03 is an unapproved concurrency-safe option.

### Dynamic attributes
- PRODUCT_ATTRIBUTE_VALUES composite PK allows at most one row per product/attribute.
- FK on option_id alone cannot prove the option belongs to this row's attribute. A composite FK on option_id + attribute_id requires a suitable alternate key and MySQL verification.
- A row CHECK may enforce exactly one of option/text/number/boolean columns. It cannot by itself match the value column to ATTRIBUTE_TYPES.data_type, guarantee required values across an entire Product, or guarantee unique sets of variant attributes.

### Cart, quote and idempotency
- A-03 approves authenticated Cart and Order. Account IDs from the client do not grant ownership.
- CARTS.status does not establish one active Cart per account; decide whether that invariant is required and implement concurrency-safe enforcement.
- Unique ORDERS.idempotency_key prevents duplicate values only. It does not bind the key to normalized request payload or account, define retention, or guarantee same-response replay.
- Target has no CHECKOUT_QUOTES table. If quote is approved as a nonpersistent preview, order creation must re-compute all authoritative price/discount/shipping and check stock at transaction time.

### Money and snapshots
- Target DDL proposes DECIMAL(18,2), VND and total = subtotal - discount + shipping. Those are not owner-approved accounting/rounding rules.
- A row CHECK cannot reconcile summed OrderItems with order subtotal or reconcile line-discount allocation to Order-level discount and voucher snapshot. Application/service validation must do so once formulas and rounding are approved.
- Order history must not rebuild old Product facts from current catalog. Image history remains blocked by DB-07.

### Inventory and goods receipts
- INVENTORIES uses (warehouse_id, product_id); a version column only helps if writes compare/guard version or lock the row and check affected-row count.
- Balance, immutable inventory movement, relevant Order/Receipt state and required audit must commit or roll back together.
- GOODS_RECEIPTS does not persist destination warehouse (P1-PROP-04). Existing adjustment API requires a reason but the target ledger has no reason column (P1-PROP-05).
- Candidate inbound movement: exactly one GoodsReceiptItem source with positive delta. Candidate outbound movement: exactly one OrderItem source with outbound delta. Opening/adjustment/cancel/return/reversal semantics require DB-03/08 approval.
- Unique idempotency_key does not prevent the same source event from being recorded twice using different keys.

### Voucher, Payment, Shipping, Audit and Content
- Voucher targeting joins and usage ledger were removed. usage_limit alone does not define atomic consumption or whether cancellation/return restores a use.
- PAYMENTS.order_id one-to-one key does not decide amount equality, refund amount/actor/time or lifecycle. Tracking fields alone do not authorize carrier integration.
- Audit JSON should be allowlisted: exclude password/hash, JWT/refresh tokens, OTP, cookies/session IDs, secrets, raw Authorization headers and unnecessary PII. actor_account_id nullability depends on an explicit system-event policy.
- Product status and deleted_at are separate axes until DB-09 defines public visibility and parent/history behavior. Public content should return only the approved published status.

## Protection-layer summary

| Concern | DB-enforceable after approval | Application/service/transaction required |
|---|---|---|
| PK/FK/UK/NOT NULL/type/default/row CHECK | Yes | Ownership, business-compatible error and transition check |
| Attribute option/type/requiredness | FK/CHECK can cover a subset | Same-attribute option, type matching, complete required set |
| Product/category cycle | FK checks reference existence | Acyclic graph update with concurrency protection |
| Order totals | Single-row formulas | Line sum, discount allocation, voucher snapshot and rounding |
| Nonnegative stock | CHECK plus guarded update | Lock/version, source consistency, exactly-once ledger |
| Voucher caps | Unique code only | Eligibility, serialized count and cancellation release |
| Idempotent replay | Unique key only | Payload binding, account scope, response replay and retention |
| Audit privacy | JSON column validity | Field allowlist, redaction, actor and correlation correctness |
