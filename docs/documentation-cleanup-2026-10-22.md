# Documentation Cleanup Review — 2026-10-22

> **HISTORICAL SNAPSHOT:** This report records the repository/doc state before the owner approval dated 2026-10-23. Its open-decision lists, phone-uniqueness note, and runtime/schema status are not current requirements. Use [P1 owner approval](refactor-v2/p1/P1-owner-approval-2026-10-23.md), [current contract reconciliation](refactor-v2/p1/P1-contract-reconciliation-2026-10-23.md), the canonical ERD and current target contracts for effective requirements. This report is preserved as evidence of the earlier cleanup, not as a live specification.

**Status: PASS for the 2026-10-22 documentation cleanup scope.** This result applies only to document quality and consistency; it is not an application/test acceptance result.

- **Repository:** `quangson2809/FIDO`
- **Working branch:** `docs/cleanup-and-control-20261022`
- **Compared baseline:** `demo1` at `22bd3d887cef3c077e714e5ec21e70ba89855d46`
- **Merge/PR:** none created; changes remain on the working branch.

## 1. Findings and disposition

| Finding | Cleanup applied | Remaining state |
|---|---|---|
| Old implementation roadmap was still the active plan | Replaced `docs/11-implementation-phases.md` with the ERD v2 P0–P3 roadmap; preserved the prior plan under `docs/archive/` with an explicit historical-only banner. | Target application integration and runtime acceptance remain incomplete. |
| Source and target table counts were easy to confuse | Clarified that V1 has 28 tables, the legacy V1–V6 chain has 32 application tables, and the owner-confirmed target ERD has 31 logical tables. | Counts describe different baselines and must not be compared as if they were the same schema. |
| Target DDL existence and successful application were conflated | Updated the contract and physical data dictionary to say target DDL/system seed files exist in the isolated `db/clean-reset` location, but verification is open. Replaced ambiguous “DDL APPLIED” labels with “PRESENT IN DRAFT DDL” where appropriate. | The target DDL has not earned a successful MySQL acceptance result. |
| Guest checkout remained described as an undecided requirement | Aligned the active API access labels for #14–20 with the 2026-10-05 owner decision: login is required for persisted Cart use and order placement. Updated the source-of-truth, target contract, decision questionnaire, TBD register, technical decision log, module map and P0 findings. Marked the guest ownership decision closed while keeping any later scope amendment explicit. | `POST /api/v1/orders/lookup` appears in old TBD wording but not in the current 77-endpoint table; it is not a target requirement unless the owner explicitly amends scope. The legacy CSV is labelled as historical. |
| P0 checklist had a PASS label beside failed/unrun tests | Restructured the exit gate into a readable checklist; verification evidence is now marked PARTIAL where tests failed or were not run. Converted the 9-column risk register into severity-grouped, one-risk-per-section entries. | P0 audit documentation can pass while application CI remains failed; these statuses are intentionally distinct. |
| API contract retained raw merge-conflict markers | Removed the three `<<<<<<<` / `=======` / `>>>>>>>` marker lines from `docs/04-api-contract.md`, preserving the intervening Phase 10 Product-image contract text. | The API contract now has one coherent section; the conflict-marker scan is part of final verification. |
| Runbook understated the possible database selected by the tests | Documented the default H2 path, the environment-driven local MySQL path, its host guard, and the fact that the test calls `flyway.clean()` on the selected test database. | Only an empty, dedicated, disposable database may be selected for the MySQL path. |
| Historical Phase 7 PASS could be read as current repository health | Added a historical-result warning and linked the current exact-SHA P0 test baseline. | Do not reuse the old Phase 7 PASS as evidence for the ERD v2 target. |
| Phone uniqueness disagrees between logical ERD annotations and the target draft DDL | Exposed TGT-01 as a working default / decision open in the physical dictionary and security notes. | Deliberately unresolved pending approval; this cleanup did not silently alter the ERD or DDL. |

## 2. Documentation navigation

- [Documentation Control Center](README.md) is the starting point for source precedence, current target status, CI evidence and read order.
- [Current implementation roadmap](11-implementation-phases.md) defines P0–P3 gates and required evidence.
- [Target contract](refactor/phase-1-erd-v2-contract.md), [physical data dictionary](refactor/phase-1-physical-data-dictionary.md), [owner decision questionnaire](refactor/phase-1-owner-decision-questionnaire.md) and [Clean Schema Reset runbook](refactor/clean-schema-reset-runbook.md) separate target rules, open decisions and safe test procedure.
- [P0 baseline audit](refactor-v2/p0/P0-baseline-audit.md), [exit gate](refactor-v2/p0/P0-exit-gate.md), [risk register](refactor-v2/p0/P0-risk-register.md), [schema impact matrix](refactor-v2/p0/P0-schema-impact-matrix.csv), [module dependency map](refactor-v2/p0/P0-module-dependency-map.md) and [test baseline](refactor-v2/p0/P0-test-baseline.md) retain the evidence package.

## 3. Verification boundary

- The documentation branch is compared with `demo1`; the intended changes are documentation-only (Markdown/CSV, including the frontend contract document). No Java/TypeScript implementation, migration SQL, build file, workflow or database content is changed by this cleanup.
- The P0 audit records backend CI run [#39760829809](https://github.com/quangson2809/FIDO/actions/runs/39760829809) as **FAIL**: 196 tests completed, 3 failed, 1 skipped. The dedicated target-schema MySQL verification is **NOT RUN** for that audited SHA.
- This session did not reset a database, deploy code, merge branches or dispatch the dedicated workflow.
- No Markdown linter was run; source-level checks include the remote path diff, conflict-marker/trailing-whitespace checks and relative-link existence checks on the inspected document set.

## 4. Material decisions that remain open

Do not treat this cleanup as resolving: public Product ID/DTO compatibility; typed-attribute inheritance and validation; inventory quantity semantics/concurrency; voucher discount/scope/usage; quote-to-order behavior and durable idempotency; order money/snapshot semantics; payment/refund behavior; shipping state and physical SQL choices. The phone uniqueness discrepancy also remains open.

**Acceptance statement:** documentation has a clearer source-of-truth order, current-versus-legacy distinction, status vocabulary and review structure. The application is not certified by this document.
