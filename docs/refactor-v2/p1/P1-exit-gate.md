# P1 Exit Gate — ERD v2 & Data Contract Freeze

**STATUS: PARTIAL — DB-03/DB-05 proposals and cross-document acceptance requirements are documented; owner approval, verified schema fit and reviewer evidence are still missing.**

- Branch under review: `demo1`
- Review date: 2026-10-23
- Scope: documentation and contract alignment only. No Java/TypeScript runtime changes, migration execution, database reset, or schema activation is part of P1.
- Authority: owner-confirmed logical ERD v2 at `docs/refactor/phase-1-erd-v2-approved.mmd`, plus explicit owner decisions recorded in the project docs. A proposal, SQL draft or inferred API mapping is not owner approval.


## 2. Owner decisions received on 2026-10-23

- DB-01: parent and child Products are both sellable; each has independent SKU, price and inventory.
- DB-02: dynamic attributes are descriptive only; variants are not generated from attributes and child Products are created explicitly.
- DB-06: simple order-wide voucher; non-stackable; no product/category conditions.
- DB-07: complete order snapshots with immutable image-retention policy. Implementation must not silently add a column to the 31-table ERD; the persistence/API solution still needs reconciliation.
- DB-08: COD with an Order state machine including transitions, cancellation, returns and refund; detailed states/persistence need a contract and scope check.
- DB-09: phone can be reused after soft deletion and is unique among active accounts.
- DB-10: VND only, money stored as integer VND; rounding and discount allocation must reconcile exactly. The isolated DECIMAL(18,2) proposal is superseded.
- DB-11: Flyway seeds roles/permissions; SUPERADMIN bootstrap uses external secret configuration; demo fixtures stay separate.
- DB-03 and DB-05 option D means prepare a design proposal; neither is approved until the proposal is reviewed and explicitly accepted.

## 3. Remaining P1 gates

1. Proposal package exists at docs/refactor-v2/p1/P1-design-proposals-DB-03-DB-05.md. Obtain explicit owner acceptance or revisions for DB-03 inventory/receipt/ledger/concurrency and DB-05 quote/idempotency/retry/recalculation. The document identifies ERD limitations; it does not imply approval.
2. Reconcile all dependent documents with recorded decisions: ERD-compatible image snapshot strategy, active-only phone uniqueness, integer-VND types/formulas, voucher scope/usage semantics, order/refund state contracts and API DTO mappings. Current ERD conflicts remain for DB-07 image history, DB-10 decimal-labelled money fields, DB-06 usage caps and DB-08 complete return/refund persistence.
3. Recompute and review the Data Dictionary and API mapping after reconciliation; no stale OPEN_BLOCKED labels for decided items, no unsupported schema columns/tables, and no conflict markers. Ensure API #19/#20, DTO contract, integer-VND arithmetic, stock transitions, image history, phone uniqueness and voucher/return/refund behavior tell one consistent story.
4. Reviewer verifies each gate against the owner-approved ERD and records acceptance evidence. P0 runtime/MySQL verification is reported separately and must not be represented as passed by this documentation work.

## 4. Deliverable inventory

| Gate | Evidence | Result | Limitation |
|---|---|---|---|
| Canonical ERD v2 | `docs/refactor/phase-1-erd-v2-approved.mmd`; `P1-erd-v2.md` | PASS — logical shape | Exactly 31 logical tables. Physical constraints and unannotated nullability remain open. |
| Per-column dictionary | `P1-data-dictionary.csv`, `P1-data-dictionary.md` | PARTIAL | 217 logical-column rows across 31 tables; SQL/null/default values copied from isolated DDL are expressly proposals. Several semantic rules still depend on owner decisions below. |
| Constraint inventory | `P1-schema-constraints.md` | PARTIAL | ERD keys are mapped; extracted SQL CHECK/index/FK actions are not owner-approved and have not been proven on MySQL 8.4. |
| API-to-schema map | `P1-api-contract-mapping.csv` | PARTIAL | Maps the 77 numbered API baseline plus 10 source extensions (3 Product image commands, 3 analytics routes, 4 voucher CRUD routes). Legacy ProductVariant/SizeSystem/Color and voucher-scope behavior do not map directly to the 31-table target. Rows label source/controller DTO gaps instead of inventing contracts. |
| Domain invariants | `P1-domain-invariants.md` | PARTIAL | DB-03/DB-05 proposal invariants are documented, but schema-fit limitations and owner acceptance remain open. |
| Acceptance matrix | `P1-test-matrix.md` | PASS as a plan, NOT as executed tests | These are P2 acceptance requirements. They are not evidence that P2 behavior already passes. |
| Decision log | `P1-decision-log.md` | PARTIAL | DB-03/DB-05 proposals exist but are not owner-approved; DB-01/02/06/07/08/09/10/11 choices are recorded, with dependent contract/schema-fit checks still open. |
| Physical SQL | `backend/src/main/resources/db/clean-reset` | BLOCKED | Isolated target DDL is a working draft, not an approved/fresh-MySQL-verified physical contract. It must not replace the active migration path during P1. |

## 2. Decisions already resolved — do not reopen as blockers

- **A-01:** The target logical schema is the owner-confirmed ERD v2 with exactly 31 tables. Adding a table/column requires an explicit owner amendment.
- **A-02:** Clean Schema Reset is allowed only for explicitly disposable development/test databases. This does not authorize destructive operations on production/shared environments.
- **A-03:** Persisted Cart use and order placement require authentication. Guest sessions, guest carts/orders, guest lookup and cart merge are out of scope.
- **A-04:** The v1 business baseline is single-merchant, COD-only, **one operational warehouse**, manual shipping, and no online payment gateway or automatic carrier integration.
- The Product identity choice, stock-accounting mechanics, voucher policy, money rounding, account/physical SQL details and seed/bootstrap details are **not** resolved merely because the draft DDL implements a suggested default.

## 3. Owner blockers before the target contract can be frozen

| Decision | Must be explicitly decided |
|---|---|
| DB-01 Product parent/child | Root vs child sale/stock/cart identity, hierarchy depth, inheritance, parent stop/delete rules and public API ID compatibility. |
| DB-02 Dynamic attributes | Allowed data types, one-compatible-value rule, option ownership, requiredness/inheritance, variant-defining matrix and duplicate-combination enforcement. |
| DB-03 Inventory/receipt/ledger | Meaning of `quantity_on_hand`, deduction transition, assignment to the single operational warehouse, source-to-movement mapping, reasons, reversals and concurrency protection. **Number of warehouses is already decided by A-04; do not ask that again.** |
| DB-05 Checkout quote/idempotency | Key origin/scope, normalized-payload binding, replay vs conflict, retention and non-persistent quote behavior. |
| DB-06 Voucher | Discount formula/rounding interaction, eligibility scope, stacking, limits, consumption/restoration, and whether removed scope/usage persistence can be dropped or ERD must be amended. |
| DB-07 Order snapshots | Required historical fields, image-history guarantee, address/recipient mutability, voucher snapshot completeness and line-discount allocation. |
| DB-08 Payment/shipping/order lifecycle | COD/refund amount/actor/time, separate state domains, shipping transitions, receiver authority and stock effects of cancel/return. |
| DB-09 Physical schema/account/audit | Exact types/lengths/nullability/defaults/status domains, phone uniqueness, FK actions/indexes, account lifecycle, soft-delete visibility and audit actor/redaction policy. |
| DB-10 Money policy | Currency, decimal scale/rounding, order total formula, allocation of order discounts to lines, shipping and reconciliation behavior. The formulas in the current technical draft are not owner approval. |
| DB-11 Seed/bootstrap | Required role/permission inventory, initial SUPERADMIN bootstrap boundary, deterministic system seed vs demo fixtures, and protection against hard-coded credentials. |

The API map also flags legacy contracts with no direct target table or field mapping: ProductVariant IDs, SizeSystem/Color masters, checkout quote persistence assumptions, voucher scope/usage relations, historical Order image snapshots, and API #70's AuditLogDto fields (`target_type`, `target_id`, `description`) versus target AUDIT_LOGS (`entity_type`, `entity_id`, `before_data`, `after_data`, `correlation_id`). P1 records these as compatibility gaps; it does not silently add tables/columns or change public DTOs to force a match.

## 4. Verification evidence and limits

- Logical cross-check recorded in P1: 31 ERD tables; 31 target DDL table definitions; 217 logical-column CSV rows.
- The dictionary-to-DDL comparison is a structural/source cross-check only. It does **not** prove the SQL is approved, executes on MySQL, or behaves correctly through the application.
- P0's recorded backend CI baseline was **FAILED** on audited SHA `22bd3d887cef3c077e714e5ec21e70ba89855d46`: 196 H2 tests, 3 failed and 1 skipped; failures concerned status CHECK constraints in `CleanResetSchemaTests`. The target MySQL verification step did not run. This is historical evidence; it is not a claim about a fresh CI run for this documentation update.
- The merge-conflict markers in `docs/05-dto-contract.md` were removed. The legacy `variant_id`/Order image-snapshot API expectations are now separated from the target ERD compatibility gaps; this resolves contradictory source text but does not approve DB-01 or DB-07.
- The Data Dictionary CSV now carries field-specific meaning and validation text for all 217 rows, and DB-10/DB-11 references are attached to relevant money and seed fields. These entries point to open decisions instead of inventing their values.
- No database was connected to, dropped or reset for this P1 documentation work.
- No production migration, JPA/API/frontend switch, or P2 implementation was performed.

## 5. P1 exit decision

P1 may be accepted as a **documentation checkpoint** only when a reviewer confirms the deliverables and compatibility map are complete for the intended scope. It is **not approved as a frozen implementable data contract** while DB-03/DB-05 proposals lack explicit owner acceptance or the identified schema/API contradictions remain unresolved.

**P2 readiness: BLOCKED.** Before P2 starts, obtain owner answers for DB-01/02/03/05/06/07/08/09/10/11, synchronize the logical contract, physical data dictionary, SQL proposal, API/DTO compatibility and invariant matrix, then verify the target on an explicitly disposable MySQL 8.4 database. Do not reset or switch any non-disposable/shared database as part of that verification.

## 5. Design proposals — not approval evidence

`P1-design-proposals-DB-03-DB-05.md` now specifies proposed stock movement timing, ledger semantics, row locking/atomicity, receipt/cancellation retry, stateless quote lifecycle, order-time recalculation, integer-VND arithmetic and idempotency behavior. It also explicitly identifies capabilities that may not fit the owner-approved 31-table ERD. No schema/runtime changes or MySQL tests were performed as part of this documentation update. Therefore P1 remains PARTIAL pending owner decision and reviewer evidence; P2 is not authorized by this status.
