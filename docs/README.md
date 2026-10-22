# FIDO Documentation Control Center

**Last reconciled:** 2026-10-22
**Purpose:** identify the authority for each decision, show what is current versus historical, and prevent a passing document/audit gate from being mistaken for a passing application.

## Current state at a glance

| Topic | Current record | Status |
|---|---|---|
| Target schema | [Owner-confirmed ERD v2](refactor/phase-1-erd-v2-approved.mmd) | 31 logical tables |
| Target physical SQL | [Physical data dictionary](refactor/phase-1-physical-data-dictionary.md) and isolated `backend/src/main/resources/db/clean-reset/` | Draft DDL + system seed exist; target verification remains open |
| Legacy schema | Repository Flyway V1–V6 | 32 application tables; evidence for old code/contracts only |
| Application integration | [Target contract](refactor/phase-1-erd-v2-contract.md) | Not complete; default runtime Flyway location still uses the legacy chain |
| P0 baseline audit | [Audit report](refactor-v2/p0/P0-baseline-audit.md) and [exit gate](refactor-v2/p0/P0-exit-gate.md) | PASS for the documentation/audit deliverable only |
| Backend CI on audited SHA | [GitHub Actions run #39760829809](https://github.com/quangson2809/FIDO/actions/runs/39760829809) | FAIL: 196 tests completed, 3 failed, 1 skipped |
| Target-schema MySQL run | [Test baseline](refactor-v2/p0/P0-test-baseline.md) | NOT RUN for the audited SHA |
| Owner decisions | [Decision questionnaire](refactor/phase-1-owner-decision-questionnaire.md) | D2-A (authenticated Cart/order placement) is owner-confirmed 2026-10-05; D1 and D3–D10 remain working defaults unless separately approved |

The latest evidence must be read before reusing older status statements. In particular, the dated PASS in the [Phase 7 gate](16-phase-7-gate.md) is a historical result for that phase and commit, not the current full-repository CI status.

## Read order for ERD v2 work

1. [Source of truth and conflict resolution](00-source-of-truth.md)
2. [Target ERD](refactor/phase-1-erd-v2-approved.mmd)
3. [Target contract and compatibility gaps](refactor/phase-1-erd-v2-contract.md)
4. [Physical data dictionary](refactor/phase-1-physical-data-dictionary.md)
5. [Owner decision questionnaire](refactor/phase-1-owner-decision-questionnaire.md)
6. [Clean Schema Reset runbook](refactor/clean-schema-reset-runbook.md)
7. [Current implementation roadmap](11-implementation-phases.md)
8. [Hard blocks, deferred work and exclusions](12-tbd-out-of-scope.md)
9. [Technical decision log](15-technical-decisions.md) — chronological history; later target-contract documents take precedence when explicitly stated.
10. [P0 audit package](refactor-v2/p0/P0-baseline-audit.md), including the [schema matrix](refactor-v2/p0/P0-schema-impact-matrix.csv), [dependency map](refactor-v2/p0/P0-module-dependency-map.md), [risk register](refactor-v2/p0/P0-risk-register.md), [test baseline](refactor-v2/p0/P0-test-baseline.md) and [exit gate](refactor-v2/p0/P0-exit-gate.md).

## Conflict-resolution rules

- **Historical API snapshot:** `reference/api-baseline-77.csv` is a legacy endpoint/access snapshot. Its JWT-optional/guest-TBD annotations for APIs #14–20 are superseded by the 2026-10-05 owner decision and the aligned access column in `04-api-contract.md`; do not treat the CSV's old access values as current target requirements.

- **Schema shape:** the owner-confirmed 31-table ERD wins. Do not reintroduce a legacy table/column without an explicit owner amendment.
- **Physical SQL:** use the current physical data dictionary and the verified SQL; mark missing details OPEN rather than guessing.
- **Business/API semantics:** use the consolidated API contract and approved business rules. An ERD shape change alone does not approve a breaking endpoint/DTO behavior change.
- **Working defaults are not approvals:** the D1–D10 draft values are implementation defaults only until explicitly approved.
- **Legacy code and V1–V6:** use them to locate dependent services, tests and public behavior; they do not require migrating old disposable development data.
- **Historical status pages:** retain their original date and result, but link to the latest exact-SHA CI record before claiming a current PASS.

## Status vocabulary

- **PASS:** the named acceptance scope is evidenced complete; it does not imply unrelated CI/deployment or later phases passed.
- **PARTIAL:** some deliverables exist, but one or more acceptance conditions remain open.
- **BLOCKED:** a material decision or prerequisite prevents work on the affected slice.
- **FAIL:** a required verification ran and failed.
- **NOT RUN / NOT VERIFIED:** no result exists; never treat this as PASS.

## Documentation maintenance rules

1. Put the effective date and evidence boundary on status/acceptance documents.
2. State branch and commit SHA when a claim depends on repository state.
3. Keep chronological decision logs historical; summarize the current target state in active index/roadmap pages.
4. When target decisions change, update ERD, contract, data dictionary, affected tests and this index together.
5. Archive superseded roadmaps instead of leaving them beside the current plan without a clear warning.
6. Do not describe legacy row retention, ID crosswalks or populated-source migration as Clean Schema Reset gates for disposable development/test databases. Do keep runtime/business/API compatibility questions visible.
