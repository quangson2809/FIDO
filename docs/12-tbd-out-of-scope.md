# 12 — Remaining TBDs and Out-of-Scope Behavior

## 1. Remaining owner input

Only the following retention/privacy values remain unresolved in the recorded P1 approval:

- Numeric retention duration for audit logs.
- Numeric retention duration for immutable order image assets.
- Numeric retention duration for personal/business data, plus any legally required anonymization or deletion exceptions.

Until these rules are approved, do not implement scheduled purging of audit history, placed-order facts or retained image assets. This does not prevent an explicitly authorized Clean Schema Reset of a verified disposable development/test database.

## 2. Implementation contracts still requiring acceptance evidence

- Current Cart selection uses the most recently updated Cart with a deterministic Cart-ID tie-break. Do not infer a one-active-Cart uniqueness constraint or Cart merge; test the selection rule if an Account has multiple Cart rows.

These items are engineering acceptance gates, not open choices about the approved database model:

- Stable image object/version references, overwrite/delete protection and historical access for order image snapshots.
- End-to-end integer-VND arithmetic, approved discount allocation, and consistent request/response/frontend/report representation.
- Active-phone uniqueness and phone reuse after account soft deletion.
- Authenticated Cart and order creation, stateless quote, order-time re-pricing, account-scoped idempotency/replay/conflict and full transaction rollback.
- Product/Attribute typed-value validation, including same-Attribute option ownership and the rule that metadata never creates Products.
- Product hierarchy validation, independent parent/child sellability, row-owned SKU/price/stock and no implicit NULL inheritance.
- Inventory source/sign/deduplication, deterministic locking, append-only reversal and atomic source/balance/ledger/audit behavior.
- Voucher usage concurrency, order/payment/shipping transitions, authorization and historical snapshot stability.
- Explicit APIs for authoring Attribute/AttributeOption metadata must be designed and approved before implementing those write operations. The current metadata-read routes do not by themselves define such CRUD contracts.
- The transport location and exact wire representation of the order-creation idempotency key must be specified in the API contract before implementation. Its account scope and fingerprint/replay/conflict behavior are already approved.

## 3. Out of scope for the current target

Unless the owner formally amends the ERD/API scope, do not add:

- Guest sessions, anonymous Cart persistence, guest checkout, guest order lookup or guest-Cart merge.
- Online payment gateways, partial refunds, multiple refunds per Order, or automated carrier integrations/tracking events.
- A detailed item-level return/exchange workflow or separate return/refund event persistence.
- Automatic creation of saleable Product rows from attribute combinations.
- Persisted checkout quotes, stock reservations, voucher Product/Category targeting, or a per-account voucher usage ledger.
- New event/timeline tables or other tables absent from the approved 31-table ERD.

## 4. Clean Schema Reset boundary

Recreate and reseed only a specifically identified disposable local/development/test database. Verify host, database name and environment before any destructive action. Never apply the reset to production, staging, shared integration or a database containing real/persistent data. No database reset is implied or performed by this document.
