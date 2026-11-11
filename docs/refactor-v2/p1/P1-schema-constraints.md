# P1 — Schema Constraints and Physical Contract

**Status: single baseline consolidated; exact-SHA schema verification required.** The pre-release schema source is `backend/src/main/resources/db/migration/V1__fido_target_schema.sql`. The previous incremental V1–V14 SQL files were removed so phases cannot apply independent schema versions. The current candidate must pass its exact-SHA fresh-MySQL workflow; application compatibility and behavioral acceptance remain separate gates.

## 1. Canonical physical contract

- Logical table/relationship authority: `docs/refactor-v2/target/erd-v2-approved.mmd`.
- Physical field/type/null/default/key/index/constraint authority: `docs/refactor-v2/p1/P1-data-dictionary.csv` and the single installer `backend/src/main/resources/db/migration/V1__fido_target_schema.sql`.
- Owner behavior authority: `P1-owner-approval-2026-10-23.md` and `P1-decision-log.md`.
- Target SQL uses integer BIGINT for monetary VND values. DECIMAL is permitted for descriptive numeric Product attributes only where specified by the dictionary.
- The target includes the generated physical `accounts.phone_active_key` for active-account phone uniqueness; it is not an independently writable domain field.
- Product identity is used by Cart, OrderItems, goods receipt items, inventory balance and inventory ledger. The stock key is `(warehouse_id, product_id)`.
- Target `ORDER_ITEMS.image_url_snapshot`, Order idempotency/fingerprint fields, voucher usage counter, inventory reversal/source fields and refund metadata are part of the approved target contract.

## 2. Database constraints and corresponding application invariants

| Area | Approved target invariant | Required runtime verification |
|---|---|---|
| Account identity | Active phone unique; soft deletion releases the phone for reuse. | Entity/auth mapping, concurrent registration, delete/reuse and generic authentication errors. |
| Product hierarchy | One parent-child level; self-FK; each Product row owns SKU, required selling price and stock; no implicit NULL inheritance. | Cycle/depth checks under concurrent changes; Product create/update and sale eligibility. |
| Attributes | Option-only; `option_id` is mandatory and belongs to `attribute_id`; one Option per Product/Attribute; no auto-generated Products. | Service/API ID resolution, requiredness, duplicate Attribute selection and composite FK checks. |
| Cart/order item identity | Product foreign keys; authenticated ownership; positive quantities. | DTO/query/frontend alignment; ownership and concurrency tests. |
| Inventory | Composite warehouse/Product key; non-negative quantity/version; append-only ledger; source-linked movements. | Real MySQL last-stock race, deterministic locks, semantic source dedupe, reversal and balance=ledger reconciliation. |
| Goods receipt | Required warehouse FK; one operational warehouse resolved server-side; DRAFT-only edits; confirmation posts stock once. | Receipt double-confirm concurrency and atomic source/balance/ledger/audit. |
| Checkout/Order | Stateless quote; integer-VND totals; account-scoped idempotency key and canonical request fingerprint; same-payload replay, changed-payload conflict. | Concurrent create-order replay/conflict, commit-then-timeout, cross-account isolation and complete rollback. |
| Voucher | Global order-wide non-stacking limit and usage counter; consume with order placement; restore at most once for eligible cancellation. | Concurrent final-use race and cancellation retries; no catalog-scope or per-account usage ledger. |
| Snapshots/history | Immutable Product/address/voucher/money/image facts for placed Orders. | Replace source Product/gallery/address/voucher and verify historical Order remains stable; validate versioned asset access. |
| Payment/shipping | COD-only; at most one full refund; manual shipping; approved state/actor matrix. | Authorization, legal transitions, duplicate collection/refund rejection and atomic side effects. |
| FK/deletion policy | RESTRICT by default for business/history references; CASCADE only for approved disposable dependent data. | Verify FKs and prove ordinary deletes cannot erase posted Order/Payment/ledger/audit history. |

## 3. Money and Voucher contract

The detailed normative calculation is [P1.5 Pricing and Voucher Contract](P1.5-pricing-voucher-contract.md). The physical schema constraints and runtime validation must jointly maintain: `subtotal=Σ(unit_price×quantity)`; Order discount equals allocated line discounts; each line total equals gross less allocation; `total_amount=subtotal-discount_amount+shipping_fee`; Payment amount/currency equals Order total/VND. Voucher `discount_value` is FIXED VND or PERCENT basis points; `maximum_discount`/`minimum_order_value` are VND. Status, UTC window, minimum subtotal and global quota must be guarded on redemption; `usage_count` cannot exceed a configured `usage_limit`. Schema-only checks do not prove HALF_UP, largest-remainder, concurrent final-use, replay, rollback or cancellation compensation behavior.

## 4. Exact-SHA verification requirements

1. Parse the dictionary as RFC 4180 CSV and ensure all records have the header column count.
2. Run `scripts/p1/check_contract_consistency.py` against the canonical ERD and target DDL.
3. Apply the target schema and system seed to a fresh isolated MySQL 8.4 database; validate tables, generated keys, types, indexes, checks, FK actions and seed.
4. Run backend mapping/integration tests and target business/security/concurrency acceptance on the exact candidate SHA.
5. Report each workflow by tested SHA. A previous successful run does not prove a later candidate passed.

The only schema-installation SQL is `backend/src/main/resources/db/migration/V1__fido_target_schema.sql`. It is a fresh-install baseline for a newly created empty database, not an in-place upgrade path for a database created by the retired incremental chain. Do not add `V2__...` or phase-specific schema SQL. An approved ERD/Data Dictionary change must update this single baseline in place and be verified on a fresh disposable MySQL database. Never run it against production, staging, shared integration or persistent business data.
