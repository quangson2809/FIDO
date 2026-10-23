# 03 — Target Data Model and Persistence Contract

## 1. Authority and scope

This document describes the approved target model only. The canonical source for exact columns, keys and relationships is [ERD v2](refactor/phase-1-erd-v2-approved.mmd); the physical contract is [P1 Data Dictionary](refactor-v2/p1/P1-data-dictionary.csv). Do not infer target fields from implementation classes.

## 2. Target table inventory — 31 tables

| Domain | Tables |
|---|---|
| Account and RBAC | `ACCOUNTS`, `ADDRESSES`, `ROLES`, `PERMISSIONS`, `ACCOUNT_ROLES`, `ROLE_PERMISSIONS` |
| Catalog | `CATEGORIES`, `BRANDS`, `PRODUCTS`, `ATTRIBUTE_TYPES`, `ATTRIBUTES`, `ATTRIBUTE_OPTIONS`, `PRODUCT_ATTRIBUTE_VALUES`, `PRODUCT_IMAGES` |
| Cart, vouchers and orders | `CARTS`, `CART_ITEMS`, `VOUCHERS`, `ORDERS`, `ORDER_ITEMS`, `ORDER_ADDRESSES`, `ORDER_VOUCHER_SNAPSHOTS`, `PAYMENTS`, `SHIPPING_INFOS` |
| Procurement and inventory | `SUPPLIERS`, `GOODS_RECEIPTS`, `GOODS_RECEIPT_ITEMS`, `WAREHOUSES`, `INVENTORIES`, `INVENTORY_TRANSACTIONS` |
| Audit and content | `AUDIT_LOGS`, `CONTENT_PAGES` |

The inventory above is the complete logical target table set. Schema additions require an explicit owner-approved amendment.

## 3. Product identity and catalog

- Every sellable unit is identified by `PRODUCTS.id`; Product foreign keys store that Product ID.
- Parent and child records share `PRODUCTS`. A child is created explicitly, has its own identity, SKU, required selling price and stock, and is independently sellable. v1 allows one parent-child level only.
- No implicit field inheritance exists. In particular, NULL `name`, `slug` or `description` does not trigger a parent fallback. SKU, selling price and inventory belong to the individual Product row.
- Category hierarchy must remain acyclic. Product parent/child depth is a separate invariant limited to one level. Validate each hierarchy mutation in its owning service under concurrent updates.
- Dynamic metadata is descriptive. The supported types are `OPTION`, `TEXT`, `NUMBER` and `BOOLEAN`. A Product/Attribute pair has one typed value; exactly the column matching the Attribute type is populated. An `OPTION` value must reference an option owned by the same Attribute.
- `is_variant_defining` is informational metadata only; it must not trigger automatic Product creation or combinations.
- Product images belong to the Product. Primary-image behavior follows `is_primary` and the approved image contract. Order image references must continue to resolve to the retained order-time content.

## 4. Cart, order and money

- A Cart belongs to an authenticated account. `CART_ITEMS.product_id` identifies a Product and `quantity` must be positive.
- `CART_ITEMS`, `ORDER_ITEMS` and `GOODS_RECEIPT_ITEMS` reference Products directly.
- Order placement creates the Order, line snapshots, address snapshot, optional voucher snapshot, COD Payment, cart mutation, inventory effects and required audit as one atomic write set.
- Product, SKU/name/attribute, image, address and voucher facts needed to interpret a placed Order are recorded at order time. Later source edits must not rewrite historical order facts.
- Monetary amounts use whole VND and integer storage. The order discount is rounded HALF-UP to a whole VND, then allocated by largest remainder with ascending Product ID as the deterministic tie-break. Allocated line discounts must sum to the order discount.
- A checkout quote is stateless and advisory. It has no persisted quote record, stock reservation, or voucher side effect. Order placement reloads and reprices the current server-side state.
- Idempotency is scoped to the authenticated account and uses a canonical SHA-256 fingerprint of the semantic request. Same-key/same-payload retries replay the committed result; changed payloads conflict. A different account cannot access another account's result.

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
