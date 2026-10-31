# 10 — Testing Strategy and ERD v2 Acceptance Matrix

This is the target testing plan for the revised 30-table option-only catalog ERD v2. Historical P0/Phase reports record results on their original code revisions only; they do not prove the target runtime has passed.

## 1. Test levels

### Unit
- Order, COD Payment, ShippingInfo and GoodsReceipt transition/actor policy.
- Product parent/child depth and cycle validation.
- Option-only Attribute equality filtering, same-Attribute Option ownership and rejection of typed filters.
- Integer-VND calculation, HALF-UP order discount and largest-remainder line allocation with Product-ID tie-break.
- Request mapping, safe error codes and DTO projection without persistence.

### Schema and persistence
- Fresh isolated MySQL install creates exactly the 31 target tables and required system seed.
- Assert SQL types, nullability, defaults, generated active-phone key, PK/FK, uniqueness, checks and indexes against the target dictionary.
- Validate every JPA Entity, composite key and Repository query against the target schema; do not use the old schema as a compatibility baseline.
- Run checker plus MySQL tests on the exact candidate SHA. H2-only results do not prove MySQL locking, generated columns or concurrency behavior.

### API/security
- JSON snake_case, standard response envelope, pagination and typed errors.
- Public versus JWT access, Account ownership isolation, permission enforcement, last-SUPERADMIN guard and server-derived actor IDs.
- No secret/entity leakage; no request-supplied authoritative price, total, stock, state or actor identity.
- Product, Cart, quote, Order, receiving, inventory, report and content API fields match docs/04 and docs/05.

### Service/integration and transaction behavior
- Transaction rollback covers the source aggregate, stock balance/ledger, voucher usage, Payment/state changes and required audit.
- Snapshot immutability for Product, SKU/name/attributes/image, voucher and recipient address.
- Test the actual target database and exact schema, not only mocks or controller unit tests.

## 2. Required target acceptance matrix

| ID | Required automated behavior |
|---|---|
| T-01 | Parent/child Products have independent IDs, SKUs, required prices and stock; depth > 1, self-parent and cycles are rejected. |
| T-02 | Attributes are option-only; valid `attribute_value_ids` resolve to owning Attributes; unknown Options, multiple selected Options for one Attribute and missing required Options on activation are rejected; attributes never generate Products. |
| T-03 | Duplicate Product SKU and duplicate active phone are rejected; a phone becomes reusable after Account soft deletion. |
| T-04 | Authenticated Cart lines use product_id; non-positive quantity and foreign Cart/item ownership are rejected. If multiple Cart rows exist, the current-Cart selection policy must be explicitly agreed and tested; do not infer one-active-Cart uniqueness or a merge from the schema. |
| T-05 | Quote is stateless/advisory: no quote row/ID, stock reservation, voucher use or Order side effect. Order placement re-reads and reprices current data. |
| T-06 | Same Account-scoped idempotency key and same semantic payload replays the committed Order; changed payload conflicts; cross-Account access is isolated; concurrent duplicates commit once. |
| T-07 | Integer-VND totals reconcile; HALF-UP and largest-remainder allocation are deterministic with ascending Product-ID tie-break. |
| T-08 | Inventory balance/ledger remains consistent under last-stock race, receipt double-confirm, same source event with different request keys, cancellation reversal, eligible return restock and adjustment. |
| T-09 | Voucher global quota cannot be exceeded under concurrent final-use requests; eligible cancellation restores use at most once. No catalog targeting or per-account usage ledger is introduced. |
| T-10 | Approved Order/Payment/ShippingInfo state and actor transitions pass; duplicate COD collection/refund is rejected; one full refund maximum in v1. |
| T-11 | Injected order/receipt/cancellation failures roll back source state, balance, ledger, voucher/Payment changes and audit atomically. |
| T-12 | Product/image changes do not rewrite a placed Order's image snapshot; snapshot points to immutable versioned content for the applicable retention window. |
| T-13 | Report calculations, timezone/date boundaries, content publication and audit redaction match the target contracts. |
| T-14 | Frontend lint/type-check/build and representative 375/768/1024/1440 product, Cart, checkout, inventory and admin workflows use target DTOs. |

## 3. Inventory and money evidence

For every stock-changing command, assert the resulting balance and exactly one expected append-only ledger movement; validate semantic source deduplication independently of request idempotency keys. Reconcile every Order/line/payment/refund report total in integer VND.

## 4. Completion gate

Compilation alone does not close a phase. Acceptance must pass on the exact candidate SHA with schema, module, security, transaction, concurrency and client evidence. Report tests as PASS only when the run and tested SHA are verified; state untested behaviors explicitly.
