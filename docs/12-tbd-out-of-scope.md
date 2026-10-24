# 12 — Remaining TBDs and Out-of-Scope Behavior

## 1. Remaining owner input

The [P1.8 operations contract](refactor-v2/p1/P1.8-operations-seed-contract.md) defines the default deletion/FK matrix, audit/content/report policy and existing system seed manifest. The following numeric retention/privacy decisions remain unresolved in the recorded P1 approval:

- Numeric retention duration for audit logs.
- Numeric retention duration for immutable order image assets.
- Numeric retention duration for personal/business data, plus any legally required anonymization or deletion exceptions.

Until these rules are approved, do not implement scheduled purging of audit history, placed-order facts, content/business data or retained image assets. Do not improvise account anonymization, nulling audit actors or rewriting immutable snapshots to satisfy an unapproved deletion request. This does not prevent an explicitly authorized Clean Schema Reset of a verified disposable development/test database.

## 2. Implementation contracts still requiring acceptance evidence

- P1.6 now specifies fail-closed current-Cart resolution: zero OPEN rows yields an empty read/create-on-mutation; exactly one is current; multiple OPEN rows return CART_SELECTION_AMBIGUOUS with no mutation or merge. The approved schema still has no one-active-Cart unique constraint. P3.8 runtime enforcement and concurrency tests remain pending.

These items are engineering acceptance gates, not open choices about the approved database model:

- Stable image object/version references, overwrite/delete protection and historical access for order image snapshots.
- End-to-end integer-VND arithmetic, approved discount allocation, and consistent request/response/frontend/report representation.
- Active-phone uniqueness and phone reuse after account soft deletion.
- Authenticated Cart and order creation, stateless quote, order-time re-pricing, account-scoped idempotency/replay/conflict and full transaction rollback.
- Product/Attribute typed-value validation, including same-Attribute option ownership and the rule that metadata never creates Products.
- Product hierarchy validation, independent parent/child sellability, row-owned SKU/price/stock and no implicit NULL inheritance.
- Inventory source/sign/deduplication, deterministic locking, append-only reversal and atomic source/balance/ledger/audit behavior.
- Voucher usage concurrency, Order/Payment/Shipping transition enforcement, authorization and historical snapshot stability; P1.7 defines the target contract, while P3.10 runtime evidence remains pending.
- Explicit APIs for authoring Attribute/AttributeOption metadata must be designed and approved before implementing those write operations. The current metadata-read routes do not by themselves define such CRUD contracts.
- P1.6 specifies the required Idempotency-Key HTTP header, Account-scoped stored key namespace, canonical SHA-256 fingerprint, replay response, changed-payload conflict and concurrent-loser behavior. P3.9 implementation/runtime acceptance remains pending.
- P1.7 specifies the Order, Payment and ShippingInfo state/actor matrix; confirmation-time stock deduction, one-time cancellation compensation/Voucher release, immutable snapshots, manual COD collection, and one whole-order full refund only. P3.10 implementation/runtime acceptance remains pending.
- P1.8 specifies audit actor/event/correlation/redaction/atomicity, content/report UC, the 31-table deletion lifecycle and existing role/permission seed manifest. P2.1 seed SQL, P3.0 audit-write and P3.11 audit-read/content/report runtime acceptance remain pending. DB-12 numeric retention/anonymization decisions remain blocked.

## 3. Out of scope for the current target

Unless the owner formally amends the ERD/API scope, do not add:

- Guest sessions, anonymous Cart persistence, guest checkout, guest order lookup or guest-Cart merge.
- Online payment gateways, partial refunds, multiple refunds per Order, automated carrier integrations/tracking events, or generic post-create command-id persistence.
- A detailed item-level return/exchange workflow, persisted return inspection/quantities, or separate return/refund event persistence. Order status alone cannot establish return sellability or trigger restocking.
- Automatic creation of saleable Product rows from attribute combinations.
- Persisted checkout quotes, stock reservations, voucher Product/Category targeting, or a per-account voucher usage ledger.
- New event/timeline tables, content revision tables, report snapshots, audit-retention columns, or other tables absent from the approved 31-table ERD.

## 4. Clean Schema Reset boundary

Recreate and reseed only a specifically identified disposable local/development/test database. Verify host, database name and environment before any destructive action. Never apply the reset to production, staging, shared integration or a database containing real/persistent data. No database reset is implied or performed by this document.
