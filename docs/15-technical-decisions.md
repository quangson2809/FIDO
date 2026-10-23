# 15 — Current Technical Decisions

> This is the active decision summary for implementation against the owner-approved ERD v2. Historical implementation/audit reports are not target contracts. For business decisions, see the dated [P1 owner approval](refactor-v2/p1/P1-owner-approval-2026-10-23.md) and [Decision Log](refactor-v2/p1/P1-decision-log.md).

## 1. Architecture and stack

- Preserve the current Java/Spring Boot/Gradle application stack; no framework or database-platform upgrade is implied by the schema refactor.
- Use a modular monolith and package-by-feature. The normal call path is Controller → Service → Repository.
- Each module owns its persistence and business invariants. Cross-module writes call the owning module's service, not its Repository.
- Flyway owns schema changes; ORM schema generation does not replace versioned migrations. Validate mappings against an empty target database.
- Use `Long` for BIGINT identifiers and the repository's approved timestamp types/UTC policy. Composite keys must be represented explicitly.

## 2. Approved persistence and money contract

- The target is the 31-table model in `docs/refactor/phase-1-erd-v2-approved.mmd`; exact physical details are in `docs/refactor-v2/p1/P1-data-dictionary.csv`.
- Target monetary values are whole VND stored as integer BIGINT values. Do not use decimal money or JSON floating-point money. DECIMAL is acceptable for non-monetary descriptive numeric attributes.
- Calculate order-level discount with HALF-UP rounding to a whole VND, then allocate with largest remainder and ascending Product ID tie-break. Line discounts reconcile exactly to the order discount.
- Product, Order, OrderItem, address, voucher, Payment and image facts that must remain historically stable are snapshotted at the appropriate write boundary.

## 3. Account, catalog and RBAC

- Account phone identity is unique among active accounts and can be reused after soft deletion. Account lifecycle and generated active-phone enforcement must agree between DDL, Entity, authentication and service validation.
- Product parent/child records share `PRODUCTS`. v1 allows one parent-child level; children are explicit, independently sellable records. Each row owns SKU, required selling price and inventory; NULL never means implicit inheritance.
- Typed catalog attributes use `OPTION`, `TEXT`, `NUMBER` and `BOOLEAN`. Options must belong to the selected Attribute. Attribute metadata is descriptive and never creates Products automatically.
- Required system roles/permissions are seeded by Flyway. Bootstrap SUPERADMIN credentials come from external secret/configuration, never committed source or demo seed. Protect the last SUPERADMIN invariant and audit privileged changes.

## 4. Cart, checkout, Order and vouchers

- Persisted Cart and Order creation require authentication. Account ownership comes from the security principal.
- Quote is stateless/advisory: no quote persistence, stock reservation or voucher use. Order placement re-reads and reprices Product eligibility, price, stock, voucher and server-owned shipping inputs.
- Order creation idempotency is scoped to the authenticated account. Persist a canonical SHA-256 semantic-request fingerprint with the Order. Same key/payload replays; changed payload conflicts; a different account cannot access the result.
- One transaction covers Order, OrderItems, immutable address/Product/voucher/image snapshots, COD Payment, voucher usage, stock/ledger effects, Cart mutation and required audit.
- v1 vouchers are order-wide, non-stackable and use one global limit. Consume usage atomically with successful order placement and restore at most once on eligible cancellation. No catalog-targeting joins or per-account usage ledger.
- Payment is COD-only with one Payment aggregate per Order. v1 allows at most one full refund per Order; partial/multiple refunds and detailed item-level return workflows need a future approved scope change.

## 5. Inventory, receiving and audit

- v1 has one operational warehouse; the server selects the active warehouse for stock-affecting commands.
- `INVENTORIES` is keyed by `(warehouse_id, product_id)` and stores `quantity_on_hand` plus a concurrency version. A successful movement updates source state, balance, append-only `INVENTORY_TRANSACTIONS` and required audit in one transaction.
- Approved movements are `OPENING`, `GOODS_RECEIPT`, `ORDER`, `ORDER_CANCEL_REVERSAL`, `RETURN_RESTOCK` and `ADJUSTMENT`. Use source-derived uniqueness, deterministic Product-ID lock order, guarded non-negative updates and linked reversal rows.
- Adjustments require a non-zero delta, actor, reason code and idempotency/correlation evidence. No ledger row may be edited/deleted to correct history.
- Audit rows record actor/action/entity, before/after data and correlation ID where applicable. Redact passwords, tokens, secrets and sensitive payload values from logs and public errors.

## 6. Order states, shipping and reporting

- Enforce the state/actor matrix in `docs/06-business-rules-state-machines.md`; reject unknown states, illegal transitions and replays.
- Shipping is manual; do not introduce carrier API or automatic tracking integration in v1.
- Reports use Asia/Ho_Chi_Minh date boundaries. Sales include the approved received amount with shipping; returned value is adjusted in its original completion period. Current status counts use Order creation date. Keep report formulas consistent with the Order/Payment contract and test inclusive date boundaries.

## 7. Image history, retention and deletion

- Order image references must resolve to immutable object/version content for the required retention window. Later Product image changes must not rewrite historical order image results.
- Prefer soft-delete/disable for referenced Account/catalog/voucher/warehouse records. Use RESTRICT by default for business/history foreign keys; CASCADE only for explicitly disposable working data.
- Posted Orders, snapshots, Payment facts, inventory ledger and audit history are not cascade-deleted.
- Numeric retention duration and anonymization/deletion exceptions remain TBD. Do not implement scheduled purge until they are approved.

## 8. Delivery status

Owner-approved behavior and target schema are recorded; application/DTO/frontend alignment and runtime acceptance remain open until verified on the exact candidate SHA. DDL validation does not prove transaction/concurrency, authorization or user-flow behavior. Clean Schema Reset may be run only against a verified disposable development/test database; no reset is authorized against persistent/shared data.
