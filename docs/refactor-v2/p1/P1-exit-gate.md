# P1 Exit Gate — ERD v2 & Data Contract Freeze

**STATUS: PARTIAL — P1 deliverables are now present, but the target contract is not frozen and P2 implementation is blocked.**

- Branch under review: `demo1`
- Review date: 2026-10-23
- Scope: documentation and contract alignment only. No Java/TypeScript runtime changes, migration execution, database reset, or schema activation is part of P1.
- Authority: owner-confirmed logical ERD v2 at `docs/refactor/phase-1-erd-v2-approved.mmd`, plus explicit owner decisions recorded in the project docs. A proposal, SQL draft or inferred API mapping is not owner approval.

## 1. Deliverable inventory

| Gate | Evidence | Result | Limitation |
|---|---|---|---|
| Canonical ERD v2 | `docs/refactor/phase-1-erd-v2-approved.mmd`; `P1-erd-v2.md` | PASS — logical shape | Exactly 31 logical tables. Physical constraints and unannotated nullability remain open. |
| Per-column dictionary | `P1-data-dictionary.csv`, `P1-data-dictionary.md` | PARTIAL | 217 logical-column rows across 31 tables; SQL/null/default values copied from isolated DDL are expressly proposals. Several semantic rules still depend on owner decisions below. |
| Constraint inventory | `P1-schema-constraints.md` | PARTIAL | ERD keys are mapped; extracted SQL CHECK/index/FK actions are not owner-approved and have not been proven on MySQL 8.4. |
| API-to-schema map | `P1-api-contract-mapping.csv` | PARTIAL | Maps the 77 numbered API baseline plus 10 source extensions (3 Product image commands, 3 analytics routes, 4 voucher CRUD routes). Legacy ProductVariant/SizeSystem/Color and voucher-scope behavior do not map directly to the 31-table target. Rows label source/controller DTO gaps instead of inventing contracts. |
| Domain invariants | `P1-domain-invariants.md` | PARTIAL | Source-confirmed rules are separated from proposed target behavior; blocked decisions must be resolved before implementation. |
| Acceptance matrix | `P1-test-matrix.md` | PASS as a plan, NOT as executed tests | These are P2 acceptance requirements. They are not evidence that P2 behavior already passes. |
| Decision log | `P1-decision-log.md` | PARTIAL | Approved decisions, technical decisions, proposals and owner blockers are separated. DB-01/02/03/05/06/07/08/09 plus DB-10/11 remain open. |
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

The API map also flags legacy contracts with no direct target table: ProductVariant IDs, SizeSystem/Color masters, checkout quote persistence assumptions, voucher scope/usage relations and historical Order image snapshots. P1 records these as compatibility gaps; it does not silently add those tables back.

## 4. Verification evidence and limits

- Logical cross-check recorded in P1: 31 ERD tables; 31 target DDL table definitions; 217 logical-column CSV rows.
- The dictionary-to-DDL comparison is a structural/source cross-check only. It does **not** prove the SQL is approved, executes on MySQL, or behaves correctly through the application.
- P0's recorded backend CI baseline was **FAILED** on audited SHA `22bd3d887cef3c077e714e5ec21e70ba89855d46`: 196 H2 tests, 3 failed and 1 skipped; failures concerned status CHECK constraints in `CleanResetSchemaTests`. The target MySQL verification step did not run. This is historical evidence; it is not a claim about a fresh CI run for this documentation update.
- No database was connected to, dropped or reset for this P1 documentation work.
- No production migration, JPA/API/frontend switch, or P2 implementation was performed.

## 5. P1 exit decision

P1 may be accepted as a **documentation checkpoint** only when a reviewer confirms the deliverables and compatibility map are complete for the intended scope. It is **not approved as a frozen implementable data contract** while any required owner decision above remains open.

**P2 readiness: BLOCKED.** Before P2 starts, obtain owner answers for DB-01/02/03/05/06/07/08/09/10/11, synchronize the logical contract, physical data dictionary, SQL proposal, API/DTO compatibility and invariant matrix, then verify the target on an explicitly disposable MySQL 8.4 database. Do not reset or switch any non-disposable/shared database as part of that verification.
