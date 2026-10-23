# P1 Exit Gate — ERD v2 & Data Contract Freeze

**STATUS: PARTIAL — logical ERD and owner choices are recorded; the target data contract is not yet freeze-ready because several explicit choices cannot be represented or verified against the current 31-table ERD without a deliberate contract decision.**

- Branch: `demo1`
- Review date: 2026-10-23
- Scope: P1 documentation and contract readiness. This gate does not claim runtime implementation, migration activation, or database verification.
- Authority: `docs/refactor/phase-1-erd-v2-approved.mmd` is the canonical owner-confirmed 31-table logical ERD. Do not add tables/columns or change public API contracts implicitly.

## 1. Decisions recorded

- **DB-01:** Parent and child Products are sellable; each has independent SKU, price and inventory.
- **DB-02:** Dynamic attributes are descriptive only and do not generate variants.
- **DB-03:** Option D requested a design proposal. The proposal exists; it is not treated as owner-approved.
- **DB-05:** Option D requested a design proposal. The proposal exists; it is not treated as owner-approved.
- **DB-06:** Order-wide, non-stackable voucher; no product/category conditions.
- **DB-07:** Complete order snapshots and immutable image-retention policy are required.
- **DB-08:** COD and an order state machine including transitions, cancellation, returns and refund are required.
- **DB-09:** Phone number may be reused after soft deletion and is unique among active accounts.
- **DB-10:** VND only; monetary values are integer VND and reconciliation/rounding must be exact.
- **DB-11:** Roles/permissions are seeded by Flyway; SUPERADMIN bootstrap uses external secret configuration; demo fixtures are separate.

## 2. Cross-document contract gaps

These are implementation blockers, not invitations to silently amend the approved ERD.

| Area | Confirmed direction | Gap against current target model | Required resolution |
|---|---|---|---|
| Inventory and receipt (DB-03) | Single operational warehouse (A-04); stock changes must be atomic and concurrency-safe | Proposed movement semantics and retry/idempotency behavior have not been accepted; current ERD may not carry every adjustment/reversal audit attribute | Accept/revise the proposal, then map each invariant to existing fields and MySQL constraints |
| Quote/order idempotency (DB-05) | Authenticated cart/order; quote is advisory and order-time values must be revalidated | Current order schema lacks an explicit request fingerprint; voucher usage enforcement also lacks a redemption/counter structure | Accept/revise the proposal and prove same-key replay vs changed-payload conflict without adding unapproved schema |
| Order image history (DB-07) | Snapshot must preserve image references for historical orders | No explicit order-item image snapshot field in the approved ERD | Decide whether an existing snapshot field is formally defined to include immutable image references or amend the ERD explicitly; do not silently overload a field |
| Integer VND (DB-10) | Integer VND across persistence, DTOs and arithmetic | Canonical ERD still labels monetary fields as decimal | Reconcile the canonical ERD with DB-10 through an explicit owner-approved ERD revision, or formally revise DB-10; do not claim both contracts agree |
| Voucher limits (DB-06) | Simple order-wide discount; non-stackable | `usage_limit` cannot safely enforce concurrent redemption limits without persisted consumption state | Define whether hard usage caps are in scope. If yes, approve a schema amendment; if no, document the narrower rule consistently |
| Returns/refunds (DB-08) | Return/refund lifecycle required | Current model does not clearly persist return/refund case, amount, actor and timestamps | Approve a schema amendment or explicitly narrow return/refund scope; no implied persistence |
| Active-only phone uniqueness (DB-09) | Phone unique among active accounts; reusable after soft deletion | MySQL requires a concrete physical strategy for conditional uniqueness | Select and test a generated nullable key or another MySQL-compatible strategy in the physical contract |
| API/DTO compatibility | Existing public API mapping must remain explicit | Legacy variant IDs, Product image expectations and AuditLog DTO fields do not map directly to target schema | Define compatibility/adaptation at the service/DTO boundary; do not invent target columns or leak persistence entities |

## 3. Deliverable inventory

| Gate | Evidence | Status | Evidence limit |
|---|---|---|---|
| Logical ERD | `docs/refactor/phase-1-erd-v2-approved.mmd` | PASS for logical shape (31 tables) | Not proof of physical types, constraints or runtime behavior |
| Data dictionary | `P1-data-dictionary.csv`, `P1-data-dictionary.md` | PARTIAL | 217 logical-column rows; physical defaults/types must be reconciled with the decisions above |
| Schema constraints | `P1-schema-constraints.md` | PARTIAL | Proposed constraints have not been verified on MySQL 8.4 |
| API mapping | `P1-api-contract-mapping.csv` | PARTIAL | Numbered API baseline and source extensions mapped; several target-schema compatibility gaps remain |
| Domain invariants | `P1-domain-invariants.md` | PARTIAL | Proposals are documented but not accepted and verified end-to-end |
| Acceptance matrix | `P1-test-matrix.md` | PASS as a test plan only | Tests in the matrix have not thereby been executed |
| Decision log | `P1-decision-log.md` | PARTIAL | DB-03/DB-05 proposal approval and cross-contract reconciliation remain open |
| Physical SQL | `backend/src/main/resources/db/clean-reset` | BLOCKED as a frozen contract | Draft SQL is not the approved physical contract and must not replace the active migration path during P1 |

## 4. Verification evidence and limits

- The recorded structural inventory is 31 logical ERD tables, 31 target DDL table definitions and 217 logical-column dictionary rows.
- These counts are document/source cross-checks, not proof that target SQL executes on MySQL or that application behavior is correct.
- Historical P0 baseline: 196 H2 tests, 3 failures and 1 skipped on audited SHA `22bd3d887cef3c077e714e5ec21e70ba89855d46`; target MySQL verification did not run. This is historical evidence, not a fresh CI result.
- No database was connected to, dropped or reset as part of this P1 documentation work.
- No Java/TypeScript runtime code or active migration path was changed as part of this P1 documentation work.
- Current GitHub connector session has not produced evidence of a local compile/test/lint/typecheck run or a fresh MySQL 8.4 verification. These checks must not be marked PASS.

## 5. Exit decision

**P1: PARTIAL. P2 readiness: BLOCKED.**

The logical ERD and owner decisions are documented, but the implementable contract cannot truthfully be frozen while DB-03/DB-05 are proposals, integer-VND conflicts with the canonical ERD, and image history, voucher consumption and return/refund persistence lack a confirmed representation. Resolve these contract gaps explicitly, synchronize the ERD/dictionary/API/DTO/invariants/SQL, then run the acceptance suite against a disposable MySQL 8.4 database. Do not perform destructive operations on production or shared environments.
