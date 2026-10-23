# P1 Exit Gate — ERD v2 & Data Contract Freeze

> **Owner decision update — 2026-10-23:** DB-03 and DB-05 proposals, DB-12 lifecycle/FK defaults, and the proposed DB-01/02/06–11/API contract defaults are approved. Clean Schema Reset is approved for verified disposable development/test databases: discard legacy test rows and reseed from the target ERD. Numeric retention durations for audit logs, image assets and personal/business data remain TBD. See [P1 owner approval record](P1-owner-approval-2026-10-23.md).

**STATUS: PARTIAL — P2 implementation is AUTHORIZED with environment and integration gates.** Owner decisions are now recorded, but Entity/Repository/service/API/DTO/frontend code has not been fully aligned to the approved target contract and the required business/security/concurrency acceptance tests have not all passed. No actual database reset was performed by recording this approval.

## Baseline and verification evidence

- Approved target authority: `docs/refactor/phase-1-erd-v2-approved.mmd`, 31 logical tables.
- PR #26 merged to `demo1` at commit [`f9229aad5b185489d53ac599a28b5d98899230f0`](https://github.com/quangson2809/FIDO/commit/f9229aad5b185489d53ac599a28b5d98899230f0).
- The reconciliation PR's exact code head `43fe744f13e155d7438eeeb4f67317b211d87748` passed GitHub Actions [run 39914506729](https://github.com/quangson2809/FIDO/actions/runs/39914506729), including the P1 contract checker and isolated MySQL clean-target schema tests. Those results verify that code revision, not later revisions automatically.
- Earlier isolated MySQL verification [run 39904931447](https://github.com/quangson2809/FIDO/actions/runs/39904931447) and backend verification [run 39904931498](https://github.com/quangson2809/FIDO/actions/runs/39904931498) are historical evidence only for their respective commit SHAs.
- Target reset DDL remains isolated in `backend/src/main/resources/db/clean-reset/`. It has not been activated as the application's default Flyway location and has not been run against production/shared data.

## Verification matrix

| Gate | Current result | Evidence / limit |
|---|---|---|
| 31-table inventory and ERD/SQL agreement | PASS on verified code SHA | Checker derives expected tables from the canonical ERD; latest document-only branch still needs its own exact-SHA CI. |
| SQL ↔ physical data dictionary | PASS on verified code SHA | 228 logical ERD fields; 229 physical columns, including generated `accounts.phone_active_key`. |
| Selected target MySQL constraints | PASS on verified code SHA | Active-phone uniqueness/reuse, nonnegative stock, voucher bound and attribute-option ownership have targeted checks. |
| Clean target schema creation and seed tests | PASS on verified code SHA | Isolated MySQL 8.4 workflow; does not authorize any non-disposable database reset. |
| Owner acceptance of DB-03 / DB-05 proposals | APPROVED 2026-10-23 | Design is frozen; behavior is not yet proven by runtime/concurrency tests. |
| DB-12 lifecycle/FK defaults | APPROVED; duration TBD | Do not implement scheduled purge until numeric retention periods and anonymization exceptions are accepted. |
| Entity/Repository/service alignment | NOT PASS | Current Account still has legacy phone mapping; Product uses ProductVariant; Inventory is variant-keyed; Order uses legacy contract/money behavior. |
| API/DTO/frontend compatibility | NOT PASS / not verified end-to-end | Frontend still contains quote_id/legacy Variant contract; Product-ID, idempotency and integer-VND alignment remains implementation work. |
| Business/security/concurrency acceptance | NOT PASS / incomplete | Inventory source dedupe and races, replay/conflict/rollback, voucher quota, discount allocation, state authorization, refund and history tests remain required. |
| Latest revision CI | PENDING for this approval PR | Do not infer a green result from an ancestor SHA. |

## Remaining engineering acceptance gates

1. **DB-03:** implement approved movement source/sign rules, source-derived duplicate prevention, deterministic locks, guarded stock updates, append-only reversals, and atomic source/balance/ledger/audit writes. Test concurrent receipt/order/cancel/return/adjustment on MySQL.
2. **DB-05:** implement account-scoped idempotency and canonical SHA-256 fingerprint; verify same-payload replay, changed-payload conflict, lost-response retry, cross-account isolation and transaction rollback.
3. **DB-01 / DB-02:** align Product ID, one-level parent-child behavior, row-owned SKU/price/stock and descriptive typed attributes through schema, service, API and frontend.
4. **DB-06:** implement global voucher quota in the order transaction; prove a concurrent last-use cannot exceed the limit and eligible cancellation restores usage at most once.
5. **DB-07:** persist complete immutable order snapshots and stable image/version references. Numeric asset/history retention period remains TBD; no automatic purge yet.
6. **DB-08:** implement COD/order/shipping state and actor matrix; support at most one full refund in v1; test replay, authorization, stock reversal and audit atomicity.
7. **DB-09:** align Account service and physical constraints with active-phone uniqueness and soft deletion; test entity deletion/FK behavior.
8. **DB-10:** align Java/API/frontend/report money fields to integer VND, HALF-UP order discount rounding and largest-remainder line allocation with deterministic product_id tie-break.
9. **DB-11:** verify Flyway system seeds, separate demo fixture, external-secret SUPERADMIN bootstrap, last-SUPERADMIN protection and source/configuration secret scan.
10. **DB-12:** implement approved delete/FK defaults. Decide numeric retention durations and anonymization exceptions before deploying automatic history/image purging.
11. **CI:** run the enhanced contract checker and isolated MySQL clean-reset tests for the exact PR head before claiming the schema/document changes pass.

## P2 authorization and safety boundary

**P2 is authorized to begin.** The approved target schema may be created and reseeded only in an explicitly disposable local/development/test database after verifying the exact host, database name and environment. Discard the existing disposable test rows; do not build a migration to preserve those rows.

This approval is **not** permission to delete an unspecified database, or any production, staging, shared-integration or real/persistent data. Keep clean-reset DDL isolated until the application mapping/activation step is ready. P1 remains PARTIAL until the implementation gates above and exact-SHA CI are satisfied; numeric retention periods remain an explicit open input.
