# FIDO — ERD v2 Target Contract

## 1. Status and authority

The owner-approved target logical model contains **31 tables**. This document summarizes its invariants; exact entity relationships and columns are authoritative in [phase-1-erd-v2-approved.mmd](phase-1-erd-v2-approved.mmd), and physical definitions are authoritative in [P1-data-dictionary.csv](../refactor-v2/p1/P1-data-dictionary.csv). The dated [owner approval record](../refactor-v2/p1/P1-owner-approval-2026-10-23.md) freezes the target business defaults.

This contract describes only the target. Baseline inventories and old implementation reports are not alternative table/column specifications.

## 2. Domain structure

The table groups are Account/RBAC, Catalog, Cart/Voucher/Order, Procurement/Inventory, and Audit/Content. The complete table inventory is in [docs/03-data-model.md](../03-data-model.md). Schema additions require explicit owner approval.

## 3. Frozen data invariants

### Accounts and permissions
- Soft-delete Accounts. Active phone identity is unique and may be reused after soft deletion.
- Role/permission writes are authorized and audited; preserve the last-SUPERADMIN invariant.
- Required system roles/permissions are migration seeds. Bootstrap SUPERADMIN credentials are supplied externally, never hard-coded.

### Products and attributes
- Parent/child Products share one table. v1 permits one parent-child level. Children are explicitly created and independently sellable.
- Every Product owns its SKU, required integer-VND selling price and inventory. NULL does not mean inherit from parent.
- Typed attributes are descriptive only. Allowed types: `OPTION`, `TEXT`, `NUMBER`, `BOOLEAN`. Validate that an option belongs to the same Attribute. Metadata does not auto-generate Products.
- Product category hierarchy remains acyclic; validate Product-parent changes under concurrency.

### Cart, Order and money
- Persisted Cart and order placement require authentication.
- Cart, Order, receiving and inventory relationships reference Product IDs.
- Money is whole VND stored as integers. Round the order-level discount HALF-UP, then allocate by largest remainder with ascending Product ID tie-break.
- The quote is stateless/advisory and has no persisted quote record or stock/voucher side effects.
- Order creation uses account-scoped idempotency and a canonical SHA-256 request fingerprint. Same payload replays; changed payload conflicts; cross-account access is forbidden.
- Order, line, address, voucher, image, Payment and required audit effects are atomic. Order-time snapshots remain immutable.

### Procurement and inventory
- v1 has one operational warehouse resolved by the server.
- `INVENTORIES` is keyed by `(warehouse_id, product_id)`, with `quantity_on_hand` and concurrency version.
- Ledger entries use the approved movement vocabulary, source-derived duplicate prevention, deterministic locks and linked reversals. Balance/source/ledger/audit changes are one transaction.
- Stock is never negative; Cart and quote do not reserve stock.

### Payment, shipping, lifecycle
- One COD Payment aggregate per Order and manual shipping.
- At most one full refund per Order in v1; partial/multiple refunds and detailed item-level return workflows are out of scope.
- Use the approved Order, Payment, ShippingInfo and GoodsReceipt state/actor matrix.
- Business/history foreign keys use RESTRICT by default. Preserve posted Order/Payment/ledger/audit history; cascade only approved disposable working data.

## 4. Physical and implementation gates

- Use the P1 physical data dictionary for column type, nullability, defaults, generated columns, checks, indexes and FK actions.
- Validate the target-first migration and system seed on a fresh, isolated MySQL database.
- Runtime Entity/Repository/Service/API/DTO/frontend mappings and business/security/concurrency acceptance tests remain required. Passing DDL checks alone does not close P1.
- Numeric audit/image/personal-data retention durations and anonymization exceptions remain TBD. Do not implement scheduled purge before approval.
- Clean Schema Reset is authorized only for a database verified as disposable local/development/test. It does not authorize resetting production, staging, shared integration or persistent business data.
