# FIDO Documentation Control Center

**Last reconciled:** 2026-10-23

**Purpose:** establish the current source of truth, distinguish approved target requirements from historical implementation evidence, and prevent a documentation/schema gate from being mistaken for runtime acceptance.

**Current contract update:** [P1 owner approval](refactor-v2/p1/P1-owner-approval-2026-10-23.md), [contract reconciliation](refactor-v2/p1/P1-contract-reconciliation-2026-10-23.md), [canonical ERD v2](refactor/phase-1-erd-v2-approved.mmd) and [physical data dictionary](refactor-v2/p1/P1-data-dictionary.csv) supersede earlier proposal wording. The 2026-10-22 cleanup report below is historical.

## Current state at a glance

| Topic | Current record | Status |
|---|---|---|
| Target schema | [Owner-approved ERD v2](refactor/phase-1-erd-v2-approved.mmd) | Exactly 31 logical tables |
| Physical target contract | [P1 data dictionary](refactor-v2/p1/P1-data-dictionary.csv), target DDL and [schema constraints](refactor-v2/p1/P1-schema-constraints.md) | Previous exact-SHA clean-reset/MySQL checks passed on the recorded P1 candidate; current documentation candidate requires its own CI result |
| Owner decisions | [P1 approval record](refactor-v2/p1/P1-owner-approval-2026-10-23.md) and [decision log](refactor-v2/p1/P1-decision-log.md) | DB-01/02/03/05/06–12 target defaults recorded; numeric retention/anonymization values under DB-12 remain TBD |
| Active implementation | [Current roadmap](11-implementation-phases.md), [breaking-change map](refactor-v2/p1/P1-api-breaking-changes.md) and [traceability matrix](refactor-v2/p1/P1-traceability-matrix.csv) | PARTIAL: Java/backend, API/DTO and frontend still contain legacy mappings |
| Target acceptance | [P1 test matrix](refactor-v2/p1/P1-test-matrix.md) and [exit gate](refactor-v2/p1/P1-exit-gate.md) | Runtime security, transaction, concurrency and end-to-end acceptance remain open |
| Legacy schema | Repository active/default Flyway chain V1–V6 | Historical implementation evidence only; not a target contract |
| Clean Schema Reset | [Target runbook](refactor/clean-schema-reset-runbook.md) | Only for a verified disposable local/development/test database; no reset was performed by this documentation review |

The successful target-schema run recorded for the approved P1 baseline is [GitHub Actions run #39929497468](https://github.com/quangson2809/FIDO/actions/runs/39929497468), tested on source SHA `07cafb6d98a8878f3dc4dd8328772ffc0f21bdc5`. This evidence covers the contract checker and fresh MySQL target-schema tests on that SHA only. It does not prove the latest docs branch or legacy runtime passed end-to-end acceptance. The latest branch/commit must be matched to its own workflow run before a current PASS is claimed.

## Read order for ERD v2 work

1. [Source of truth and conflict resolution](00-source-of-truth.md)
2. [Owner approval](refactor-v2/p1/P1-owner-approval-2026-10-23.md)
3. [Canonical target ERD](refactor/phase-1-erd-v2-approved.mmd)
4. [Physical data dictionary](refactor-v2/p1/P1-data-dictionary.csv)
5. Target contracts: [data model](03-data-model.md), [API](04-api-contract.md), [DTO](05-dto-contract.md), [business rules](06-business-rules-state-machines.md) and [transactions/concurrency/idempotency](07-transactions-concurrency-idempotency.md)
6. [P1 target-vs-runtime mapping](refactor-v2/p1/P1-api-breaking-changes.md) and [traceability matrix](refactor-v2/p1/P1-traceability-matrix.csv)
7. [Clean Schema Reset runbook](refactor/clean-schema-reset-runbook.md)
8. [Implementation roadmap](11-implementation-phases.md)
9. [Remaining TBDs and out-of-scope behavior](12-tbd-out-of-scope.md)
10. [Decision log](refactor-v2/p1/P1-decision-log.md) and [test matrix](refactor-v2/p1/P1-test-matrix.md)
11. [P0 baseline audit package](refactor-v2/p0/P0-baseline-audit.md), including its [test baseline](refactor-v2/p0/P0-test-baseline.md) and [exit gate](refactor-v2/p0/P0-exit-gate.md), as historical evidence.

## Conflict-resolution rules

- **Target schema:** the approved 31-table ERD and canonical physical data dictionary take precedence. Do not reintroduce legacy tables/columns without a dated owner amendment.
- **Approved behavior:** use the P1 owner approval/decision log and active API/DTO/business/transaction contracts. Earlier questionnaires/proposals are historical decision inputs, not live alternatives.
- **Current code and V1–V6:** use them to find implementation gaps and regression risks; they do not override the target and do not require migration of disposable development data.
- **API mapping:** `P1-api-contract-mapping.csv` preserves historical route/source information for traceability. Rows marked retired are not target routes. The current target API contract is `04-api-contract.md`.
- **Historical reports:** retain original dates and results, but do not treat their unapproved-decision lists or old runtime/test status as current. Always cite the exact candidate SHA and workflow result for current acceptance.
- **Remaining owner input:** numeric retention periods for audit, immutable image assets and personal/business data, plus any legally required anonymization/deletion exceptions, remain TBD under DB-12.

## Status vocabulary

- **PASS:** the named acceptance scope is evidenced complete on the identified SHA; it does not imply unrelated runtime behavior passed.
- **PARTIAL:** deliverables exist, but one or more acceptance conditions remain open.
- **BLOCKED:** a material decision/prerequisite prevents the affected slice.
- **FAIL:** required verification ran and failed.
- **NOT RUN / NOT VERIFIED:** no result exists; never treat as PASS.

## Documentation maintenance rules

1. Put the effective date and evidence boundary on status/acceptance documents.
2. State branch and commit SHA when a claim depends on repository state.
3. Keep chronological reports historical; summarize effective target requirements in active contracts and this index.
4. When a target decision changes, update ERD, dictionary, API/DTO, tests and this index together.
5. Preserve audit evidence; mark superseded reports rather than using them as current specifications.
6. Do not require preservation, ID crosswalk or populated-source migration for a clean reset of a verified disposable development/test database.
