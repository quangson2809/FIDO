# 03 — Target Data Model and Persistence Contract

## 1. Authority and scope

This document describes the approved target model only. The canonical source for exact columns, keys and relationships is [ERD v2](refactor-v2/target/erd-v2-approved.mmd); the physical contract is [P1 Data Dictionary](refactor-v2/p1/P1-data-dictionary.csv). Do not infer target fields from implementation classes.

## 2. Target table inventory — 29 tables

| Domain | Tables |
|---|---|
| Account and RBAC | `ACCOUNTS`, `ADDRESSES`, `ROLES`, `PERMISSIONS`, `ACCOUNT_ROLES`, `ROLE_PERMISSIONS` |
| Catalog | `CATEGORIES`, `BRANDS`, `PRODUCTS`, `ATTRIBUTES`, `ATTRIBUTE_OPTIONS`, `PRODUCT_ATTRIBUTE_VALUES`, `PRODUCT_IMAGES` |
| Cart, vouchers and orders | `CARTS`, `CART_ITEMS`, `VOUCHERS`, `ORDERS`, `ORDER_ITEMS`, `ORDER_ADDRESSES`, `ORDER_VOUCHER_SNAPSHOTS`, `PAYMENTS` |
| Procurement and inventory | `SUPPLIERS`, `GOODS_RECEIPTS`, `GOODS_RECEIPT_ITEMS`, `WAREHOUSES`, `INVENTORIES`, `INVENTORY_TRANSACTIONS` |
| Audit and content | `AUDIT_LOGS`, `CONTENT_PAGES` |

The inventory above is the complete logical target table set. Schema additions require an explicit owner-approved amendment.

## 3. Product identity and catalog

- Every sellable unit is identified by `PRODUCTS.id`; Product foreign keys store that Product ID.
- Parent and child records share `PRODUCTS`. A child is created explicitly, has its own identity, SKU, required selling price and stock, and is independently sellable. v1 allows one parent-child level only.
- No implicit field inheritance exists. In particular, NULL `name`, `slug` or `description` does not trigger a parent fallback. SKU, selling price and inventory belong to the individual Product row.
- Category hierarchy must remain acyclic. Product parent/child depth is a separate invariant limited to one level. Validate each hierarchy mutation in its owning service under concurrent updates.
- Dynamic metadata is descriptive and option-only. A Product/Attribute pair has at most one value, stored in a required `option_id` referencing an Option owned by the same Attribute. Backend derives `attribute_id` from the selected Option ID. Values never generate Product records.
- Purchase selection recognizes exact `COLOR` and Attribute codes starting with `SIZE`; other Attributes are descriptive. No persisted selection flag is used.
- Product images belong to the Product. The primary image is the row at `sort_order = 0`; no separate flag is persisted. Order image references must continue to resolve to the retained order-time content.

## 4. Cart, order and money

- Each authenticated Account has at most one reusable Cart, enforced by UNIQUE(account_id). Cart has no status. Reads do not create a missing Cart; the first add does. Successful placement deletes purchased CartItems and retains the Cart row/ID; failed placement rolls back the lines. CART_ITEMS.product_id identifies a Product and quantity must be positive.
- `CART_ITEMS`, `ORDER_ITEMS` and `GOODS_RECEIPT_ITEMS` reference Products directly.
- Order placement creates the Order, line snapshots, address snapshot, optional voucher snapshot, COD Payment, cart mutation, inventory effects and required audit as one atomic write set.
- Product, SKU/name/attribute, image, address and voucher facts needed to interpret a placed Order are recorded at order time. Later source edits must not rewrite historical order facts.
- Monetary amounts use whole VND and integer storage. `subtotal = Σ(unit_price × quantity)` before discount/shipping; calculate one order-wide Voucher discount using FIXED VND or PERCENT basis points (100 bps=1%), HALF_UP for the percentage result, optional VND cap and subtotal bound. Allocate with largest remainder and ascending Product ID tie-break. Line discounts sum exactly to Order.discount_amount; `line_total = unit_price × quantity − allocated discount`; `total_amount = subtotal − discount_amount + shipping_fee`; Payment.amount equals Order.total_amount. See [P1.5 Pricing and Voucher Contract](refactor-v2/p1/P1.5-pricing-voucher-contract.md) for exact examples.
- A checkout quote is stateless and advisory. It has no persisted quote record, stock reservation or voucher quota side effect. Order placement reloads/reprices current server-side state and atomically consumes one Voucher use with the Order/snapshot if eligible.
- Idempotency is scoped to the authenticated account and uses a canonical SHA-256 fingerprint of the semantic request. Same-key/same-payload retries replay the committed result; changed payloads conflict. A different account cannot access another account's result.

- `orders.created_at` is the order placement time. `order_addresses` is the sole stored recipient snapshot; recipient responses project its name/phone. `orders.discount_amount` is the authoritative actual Voucher discount. COD and integer VND are fixed application semantics; Payment/Order rows do not store method/currency constants. Cart lines retain `updated_at` only.

- There is no ShippingInfo table or separate shipping status. The COD completion/return/report timestamp is PAYMENTS.collected_at; recipient.name comes from the existing order address snapshot. No replacement Order columns are introduced.

## 5. Inventory and procurement

- v1 has one operational warehouse; the server resolves it for receipt and inventory commands.
- `INVENTORIES` uses the composite key `(warehouse_id, product_id)` with `quantity_on_hand` and a concurrency `version`. It must never become negative.
- `INVENTORY_TRANSACTIONS` is an append-only ledger. Source state, balance, ledger and required audit commit or roll back together.
- Approved movement types are `OPENING`, `GOODS_RECEIPT`, `ORDER`, `ORDER_CANCEL_REVERSAL`, `RETURN_RESTOCK` and `ADJUSTMENT`. Every movement follows the source/sign, actor, reason and reversal policy in [the transaction contract](07-transactions-concurrency-idempotency.md).
- A semantic source movement may not apply twice even when callers retry with different request keys. Lock affected stock rows in deterministic Product ID order.

## 6. Lifecycle, keys and history

- Accounts use soft deletion; active phone identity is unique and may be reused after soft deletion.
- Prefer disabling/soft deletion for referenced catalog, voucher and warehouse data. Business/history foreign keys use RESTRICT by default; CASCADE is limited to explicitly disposable dependent working data.
- Posted orders, order snapshots, payment facts, inventory ledger and audit history are not hard-deleted as a side effect of account/catalog deletion.
- Numeric retention durations and legally required anonymization/deletion exceptions remain TBD. Do not implement scheduled purging until those values are approved.
- Physical SQL types, nullability, defaults, generated values, checks, indexes and FK actions must match the canonical ERD and P1 data dictionary and be verified on the supported MySQL version.
