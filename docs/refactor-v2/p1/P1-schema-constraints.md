# P1 — Schema Constraints and Physical Contract

**Status: PARTIAL.** Static consistency and isolated MySQL 8.4.13 clean-reset PASS on SHA dbd7cb6a8293068c9939c3c06707c1d182c47030. SQL has 31 tables/229 physical columns, including generated ACCOUNTS.phone_active_key; this does not prove application compatibility or all business behavior.

## Verified by static source inspection

- Canonical ERD and target SQL have the same 31 table names.
- GOODS_RECEIPTS.warehouse_id and its FK are represented in the ERD and target SQL; WAREHOUSES is created before GOODS_RECEIPTS.
- The Data Dictionary has been expanded to one row per physical SQL column and now records SQL type, physical nullability/default, generated expression, constraint/index evidence, and current implementation status/evidence.
- Target money fields use BIGINT integer VND; descriptive numeric Product attributes may remain DECIMAL and are not monetary fields.
- The target DDL has a generated active-phone uniqueness key, typed Product attribute constraints, warehouse/product inventory composite key, ledger idempotency/reversal fields, Order request fingerprint and integer-VND checks, voucher usage counter, image snapshot, and refund metadata.

## Draft constraints and behavioral obligations

| Area | Current draft contract | Still required before P1 PASS |
|---|---|---|
| Phone identity | Generated nullable phone_active_key with a unique index, released when deleted_at is populated | MySQL 8.4 suite passed active duplicate rejection and reuse after soft delete; remap legacy Account entity which still declares global unique phone |
| Product hierarchy | Self-FK, unique SKU, selling/cost price checks | Define allowed depth, cycle-safe updates, and per-field inheritance/NULL semantics; target Product API remains legacy Variant-based |
| Dynamic attributes | Composite FK on option_id + attribute_id and CHECK that one typed value is set | Verify Attribute type compatibility, requiredness, and type-change behavior when values already exist |
| Inventory | Composite PK warehouse_id/product_id, nonnegative quantity/version | Concurrency-safe guarded balance updates, stable lock ordering, source uniqueness, exact balance=ledger and rollback semantics; DB-03 not approved |
| Goods receipt | Required warehouse_id FK, receipt-item source identity | Update target Entity/API and ensure confirmation is exactly once and immutable after confirmation |
| Inventory ledger | Unique idempotency_key, source FKs, reverses_transaction_id, reason_code, movement checks | Same semantic source under another key must not duplicate; define opening balance, adjustment reason vocabulary and reversal policy; DB-03 not approved |
| Checkout/order | Unique idempotency key, request_fingerprint, integer totals and reconciliation CHECK | Bind fingerprint to canonical request; same-key replay vs changed-payload conflict; atomic transaction and retry API; DB-05 not approved |
| Order snapshots | OrderItem image/SKU/name/attribute/price/discount/line snapshots; separate OrderAddress | Prove asset retention/versioning and immutable historical access; map old Order DTOs |
| Voucher | usage_limit plus usage_count bound check | Atomic increment/restoration, scope (global/per-account), cancellation semantics, and concurrency test; draft column does not prove behavior |
| Payment/refund | COD-only status, refund amount/actor/time/reason checks | Define partial/full refund semantics, idempotency, authorization, return/restock and audit atomicity |
| RBAC/audit | Composite role assignment keys, named FK/check constraints, system seed separate from demo fixtures | Fresh install seed test, external-secret bootstrap verification and audit redaction/security checks |

## Runtime evidence

- [Clean Schema Reset target verification — run 39904931447](https://github.com/quangson2809/FIDO/actions/runs/39904931447): SUCCESS using MySQL 8.4.13.
- [Backend verification — run 39904931498](https://github.com/quangson2809/FIDO/actions/runs/39904931498): SUCCESS, including H2 test suite and MySQL migration/mapping step.
- These runs validate clean-reset DDL, schema metadata, selected constraints and existing backend test jobs. They do not test every target business behavior.

## Exit blockers

1. DB-03 and DB-05 details remain unapproved design proposals.
2. Per-field Product inheritance and hierarchy depth remain unresolved.
3. DB-06 voucher quota/cancellation behavior needs a contract consistent with usage_count.
4. DB-07 requires retained immutable image-object/version semantics beyond a snapshot URL.
5. DB-08 partial/full refund, transitions, idempotency and return/restock remain unresolved.
6. DB-12 per-entity delete/restrict/cascade/history-retention matrix lacks explicit approval.
7. Existing Java Entity/Repository, API/DTO and frontend remain on legacy contracts. See P1-traceability-matrix.csv and P1-api-breaking-changes.md.
8. MySQL 8.4 clean-reset install and all targeted tests require a successful post-change CI result.

Do not move this clean-reset SQL into the active migration location or run it against any database containing data that must be retained.
