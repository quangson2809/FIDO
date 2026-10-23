# P1 Exit Gate — ERD v2 & Data Contract Freeze

> **Latest reconciliation note — 2026-10-23:** Current work starts from `origin/demo1` SHA `551d91dab8b47ac709283f9222667b06c6b1b6de`. The baseline counts (31 logical tables / 228 logical fields / 229 physical columns including generated `accounts.phone_active_key`) are snapshot observations, not checker constants. Prior successful MySQL/backend runs listed below are historical evidence at previous commits; exact-SHA checks must run against the reconciliation PR. Status remains PARTIAL / P2 NOT AUTHORIZED while DB-03, DB-05 and DB-12 and other listed contract details remain open.

**STATUS: PARTIAL. P2 is NOT AUTHORIZED.** Static schema and isolated MySQL clean-reset verification have passed for the current target draft, but the whole contract is not approved or implemented across the application.

## Baseline and verification evidence

- Initial inspected baseline: `c08a8c0c89019e19fd597b70a22eb2e10e38b834`.
- Latest completed verification of database changes: SHA `dbd7cb6a8293068c9939c3c06707c1d182c47030`.
- [Clean Schema Reset target verification — run 39904931447](https://github.com/quangson2809/FIDO/actions/runs/39904931447): SUCCESS on MySQL 8.4.13.
- [Backend verification — run 39904931498](https://github.com/quangson2809/FIDO/actions/runs/39904931498): SUCCESS, including H2 tests and MySQL migration/mapping.
- MySQL run reports 31 tables, 229 physical columns and successful build/test completion. Static checker output at that revision reported 31 ERD tables, 228 logical ERD fields and 229 Dictionary rows.
- The target script remains in `db/clean-reset`; it has not been put into active Flyway migrations or run against a production/shared database.

## Verification matrix

| Gate | Result | Evidence / limits |
|---|---|---|
| 31-table inventory | PASS — static | ERD and clean-reset SQL agree on 31 table names. |
| ERD ↔ SQL fields/types | PASS — static | 228 logical ERD fields; SQL contains 229 physical columns including generated `accounts.phone_active_key`. |
| SQL ↔ Dictionary | PASS — static at SHA dbd7 | 229 RFC-4180 CSV field rows; old checker compared types, nullability/defaults and generated expression. Enhanced checker additionally checks ERD key annotations and per-column constraint evidence; require its own latest CI run. |
| Critical constraints | PASS — selected DB checks | MySQL suite rejects active duplicate phones, permits phone reuse after soft delete, rejects negative stock, rejects voucher use above limit and rejects a Product Attribute Option from a different Attribute. This does not validate full application behavior. |
| MySQL clean-reset | PASS | MySQL 8.4.13 applies the isolated reset DDL; exact table/column metadata and clean/reseed assertions pass in run 39904931447. |
| Backend H2 + MySQL migration/mapping | PASS | Backend run 39904931498. This is not proof the live application matches all target APIs. |
| Entity/Repository alignment | FAIL | Current Account uses legacy `account_id` and global unique phone; Product uses ProductVariant; Inventory is variant-keyed; Order and monetary logic still use legacy fields/BigDecimal. |
| API/DTO/frontend compatibility | FAIL / NOT VERIFIED | Checkout still uses `quote_id`; target idempotency/fingerprint, Product-ID inventory and integer-VND contracts are not fully implemented end-to-end. See `P1-api-breaking-changes.md`. |
| Full business/security/concurrency tests | NOT VERIFIED | Order/ledger race tests, same-key changed-payload behavior, atomic voucher consumption/restoration, discount allocation, refund idempotency, state authorization and full API contract tests remain outstanding. |

## Remaining blockers

1. **DB-03:** detailed inventory/receipt/ledger movement types, source shape, same-source/different-key deduplication, reversal rules, opening balance and concurrency behavior are proposals, not owner-approved mechanics.
2. **DB-05:** idempotency/fingerprint scope, same-key replay versus changed-payload conflict, retention, retry/error contract and atomic checkout behavior remain proposed and are not implemented in current Order/API/frontend flow.
3. **Product hierarchy/inheritance:** permitted hierarchy depth and field-by-field requiredness/NULL meaning/propagation for `name`, `slug`, `description`, `selling_price`, `category_id` and `brand_id` have not been decided. NULL does not imply inheritance.
4. **DB-06:** `usage_count` and a database bound check exist, but atomic quota use, global/per-account scope, cancellation/return restoration and retry behavior remain open.
5. **DB-07:** `image_url_snapshot` exists; stable asset versioning, overwrite/deletion prevention and historical access/retention are not established.
6. **DB-08:** refund amount/actor/time/reason columns exist; partial/full refund, idempotency, authorized state transitions, return/restock and audit atomicity are not defined or tested end-to-end.
7. **DB-09:** target DDL phone uniqueness/reuse passed MySQL tests, but the active Account entity/service is not mapped to `deleted_at` and generated `phone_active_key`.
8. **DB-10:** target ERD/SQL uses integer VND, but current Java/API/frontend amount types and calculation/discount-allocation rules are not aligned.
9. **DB-11 / DB-12:** basic seed/grant checks passed in the MySQL suite. External-secret SUPERADMIN bootstrap and source secret scan need evidence; an owner-approved per-entity soft/hard-delete, FK action and historical-retention matrix is missing.
10. **Static checker follow-up:** the enhanced checker now explicitly verifies ERD PK/FK/UK markers and per-column constraint/index evidence. Its own post-change CI must pass before claiming those additional checks verified.

## Architecture review

- **BLOCKER:** DB-03 and DB-05 mechanics remain proposals, not approvals.
- **MAJOR:** active backend/API/frontend contracts remain on the legacy schema.
- **MAJOR:** inventory/checkout concurrency, refund lifecycle, API authorization, voucher restoration and immutable asset retention are not proven.
- **NOTE:** current layered modular-monolith structure is retained; P1 has not justified broadening the refactor into active feature behavior. See `P1-architecture-review.md`.

## P2 authorization

**NOT AUTHORIZED.** The schema/runtime portion has substantial passing evidence, but P1 as a whole is not complete until the remaining business decisions are explicitly recorded, target mappings and APIs are reconciled, required behavioral/security/concurrency tests are implemented and passed, and the enhanced checker passes CI.
