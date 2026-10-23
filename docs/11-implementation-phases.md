# 11 — ERD v2 Implementation Roadmap (Clean Schema Reset)

> **Current execution authority — 2026-10-22.** This roadmap replaces the pre-ERD v2 nine-phase plan. The previous version is preserved at [docs/archive/11-implementation-phases-pre-erd-v2.md](archive/11-implementation-phases-pre-erd-v2.md) for historical context only. Do not use its 28-table baseline or ProductVariant-era implementation instructions as target requirements.

## 1. Baseline and status

| Area | Verified current state | Meaning |
|---|---|---|
| Legacy implementation | Flyway V1–V6 describe 32 application tables | Source-code and API dependency evidence only; not the target schema |
| Target model | Owner-confirmed ERD v2 defines 31 logical tables | Schema authority for the refactor |
| Target DDL and system seed | Present under `backend/src/main/resources/db/clean-reset/` | Isolated; not yet the default runtime Flyway location |
| Application integration | Not complete | Entities, repositories, services, DTOs, API and frontend still need alignment |
| P0 audit deliverable | PASS for audit scope on the separate audit branch | Does not mean backend CI passed |
| Exact-SHA backend CI | Historical P0 result: 196 tests completed, 3 failed, 1 skipped on the audited P0 SHA | This is not the current `demo1` verification result; exact-SHA CI for this reconciliation PR is required |
| Target-schema MySQL verification | NOT RUN for the audited SHA | Do not claim the new target passes MySQL until an exact-SHA run succeeds |

Detailed evidence: [P0 baseline audit](refactor-v2/p0/P0-baseline-audit.md), [test baseline](refactor-v2/p0/P0-test-baseline.md), [risk register](refactor-v2/p0/P0-risk-register.md), and [exit gate](refactor-v2/p0/P0-exit-gate.md).

## 2. Authority and decision rules

Use the following order when documents conflict:

1. [Owner-confirmed target ERD](refactor/phase-1-erd-v2-approved.mmd) — target tables and relationships.
2. [Target contract](refactor/phase-1-erd-v2-contract.md) — source/target compatibility gaps and target boundaries.
3. [Physical data dictionary](refactor/phase-1-physical-data-dictionary.md) — columns, constraints and unresolved physical SQL.
4. [Owner decision questionnaire](refactor/phase-1-owner-decision-questionnaire.md) — working defaults and decisions that still need explicit approval.
5. [Clean Schema Reset runbook](refactor/clean-schema-reset-runbook.md) — safe test/reset procedure.
6. [Source of truth](00-source-of-truth.md), [business/TBD register](12-tbd-out-of-scope.md), and [technical decision log](15-technical-decisions.md) — API/business compatibility and historical decisions.

The legacy implementation and V1–V6 migrations identify code paths and current behavior; they do not override the target ERD. Clean Schema Reset means **do not migrate or preserve disposable development/test rows**. It does not remove the need to decide which API/business behaviors the rewritten application must support.

Classify open items as:
- **HARD BLOCK** — requires an owner/business/API/security/data-semantics decision before the affected behavior can be implemented.
- **TECHNICAL DECISION** — semantics are fixed; record and test the implementation choice.
- **DEFERRED / OUT OF SCOPE** — explicitly excluded from this delivery; do not implement it indirectly through schema or endpoint additions.

## 3. P0 — Baseline audit and documentation

**Goal:** establish a reliable source baseline, inventory the migration and module dependencies, and record incompatible assumptions before runtime changes.

Required evidence:
- exact source commit and complete V1–V6 inventory;
- 31-target-table impact matrix, module dependency map and risk register;
- exact-SHA test/CI result with failures and unrun checks reported truthfully;
- no target runtime migration activation or destructive database operation.

**Historical P0 gate record:** the audit deliverable was marked PASS for its own scope, while backend CI failed on that audited SHA and target-schema MySQL had not yet been run. Do not apply this old result to the current reconciliation branch; require current exact-SHA checks.

## 4. P1 — Freeze target contract and physical schema

**Goal:** close or explicitly disposition every material decision before the target schema becomes the default runtime schema.

Required work:
- review D1–D10 in the decision questionnaire; distinguish owner-approved requirements from working defaults;
- freeze account identity, authentication and account ownership;
- freeze parent/child Product identity, typed attributes, inheritance and public ID/DTO compatibility;
- define stock semantics, transaction boundaries, concurrency and idempotency for inventory;
- decide voucher scope, usage limits/redemption, checkout quote behavior and order-create retries;
- freeze order money calculations/snapshots, payment/refund scope, shipping states and address snapshot behavior;
- resolve phone uniqueness versus the ERD, physical nullability/defaults/indexes/FK actions, timestamp/timezone rules and allowed literals;
- update the contract, data dictionary and tests together for every approved decision.

**Gate:** every material decision is either approved with traceable evidence or explicitly excluded/deferred without contradicting the target ERD. No unresolved HARD BLOCK may be treated as a technical default.

## 5. P2 — Implement the clean target persistence and align the application

**Goal:** replace legacy assumptions with the approved 31-table target while preserving only the API/business behaviors still in scope.

Required work:
- establish the approved target-first Flyway baseline and system seed; do not rewrite historical V1–V6 files and expect existing Flyway histories to upgrade;
- align entity/repository mappings, module-owned services, transaction boundaries and architecture tests;
- update controllers, DTOs, validation, error behavior, authorization and frontend API callers as one contract-aligned change;
- remove or rewrite tests that assert superseded storage details, while retaining tests for approved business invariants;
- preserve atomicity and retry/concurrency behavior for order placement, inventory movements and goods-receipt confirmation;
- keep demo fixtures separate from system seeds and free of credentials.

**Safety boundary:** never run Clean Schema Reset against production, shared integration, staging, or any database containing data that must remain. A reset is permitted only after the exact database is verified disposable.

**Gate:** clean target DDL and seed are applied successfully to a disposable, empty supported MySQL database; target mappings and relevant service/API tests pass; no unresolved contract blocker is hidden by schema changes.

## 6. P3 — Acceptance and release evidence

**Goal:** prove the integrated target works rather than relying on compilation or a schema table count alone.

Required evidence:
- an exact-commit MySQL clean-install test and full backend test/build result;
- table, column, key, CHECK, index, seed and Flyway validation for the target;
- representative end-to-end tests for authentication/RBAC, catalog, cart/checkout, orders/COD, inventory/receiving, reporting/content and error/authorization paths;
- rollback, duplicate request, concurrency, stock and money invariants where applicable;
- architecture-boundary checks and frontend typecheck/tests/build for the changed contract;
- review of the final diff, credentials/secrets, dead code and out-of-scope changes.

**Gate:** publish exact SHA, commands, test results, unresolved issues and scope. Do not label the target accepted while a required test failed or was not run.

## 7. Phase report template

```text
PHASE:
STATUS: PASS | PARTIAL | BLOCKED | FAIL
BASE SHA:
FINAL SHA:
SOURCE / API CONTRACTS CHANGED:
SCHEMA / MIGRATION CHANGES:
DECISIONS APPROVED:
TESTS RUN + EXACT RESULTS:
MYSQL TARGET VERIFICATION:
ARCHITECTURE REVIEW:
OPEN HARD BLOCKS:
DEFERRED / OUT OF SCOPE:
NEXT GATE READY: YES | NO
```



## 1A. P1 reconciliation snapshot — 2026-10-23

- Verified base: `origin/demo1` SHA `551d91dab8b47ac709283f9222667b06c6b1b6de`; reconciliation branch starts from that exact commit.
- Current draft inventory at base: 31 target tables, 228 logical fields, 229 physical SQL columns including generated `accounts.phone_active_key`.
- Earlier MySQL/backend runs `39904931447` and `39904931498` are historical evidence at prior commits, not validation of the reconciliation changes.
- The current exact-commit checker/workflow result is pending until the reconciliation PR runs. No current PASS is implied here.
- Status remains **PARTIAL / P2 NOT AUTHORIZED** because DB-03, DB-05 and DB-12 are open, as are specified product inheritance, monetary allocation, asset retention and refund behavior details.
