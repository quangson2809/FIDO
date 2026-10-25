# FIDO ERD v2 Reconstruction — Document Map

**Purpose:** single navigation point for the clean target redesign. This directory is the workstream for ERD v2; it is separate from the active legacy runtime and does not imply runtime migration is complete.

## Current status

- **P0:** baseline audit package retained as historical evidence under [`p0/`](p0/P0-baseline-audit.md). Its PASS refers to audit deliverables, not application health.
- **P1.1–P1.9:** contract design and cross-domain acceptance artifacts are grouped under [`p1/`](p1/README.md). P1.1 is the baseline/inventory entry point; P1.2–P1.8 own domain contracts; P1.9 reconciles cross-domain consistency.
- **P1.9 gate:** PASS for target contract/schema consistency on the exact candidate associated with [PR #38](https://github.com/quangson2809/FIDO/pull/38), merged into `demo1` at `4dcf0b835a994230273971cbd81d6f82f321f959`.
- **P1 overall:** PARTIAL. Runtime Entity/Repository/Service, API/DTO, authorization, frontend, transaction/concurrency and end-to-end acceptance remain implementation work. Passing target DDL checks does not certify runtime alignment.
- **Next implementation:** P2.1 may enter from the latest verified `origin/demo1` baseline only after checking that branch SHA and workflow status. No database reset is implied by this document.

## Directory responsibilities

| Location | Responsibility |
|---|---|
| [`target/`](target/README.md) | Canonical target inputs: approved ERD, ERD summary, physical dictionary pointer and isolated clean-reset runbook. These sources were consolidated here to avoid scattering the target baseline across `docs/refactor/` and `docs/refactor-v2/p1/`. |
| [`p0/`](p0/P0-baseline-audit.md) | Baseline inventory, risk register, schema impact, test baseline and P0 exit evidence. Historical code/test findings are not current target behavior. |
| [`p1/`](p1/README.md) | Ordered P1.1–P1.9 contract and acceptance work package. |
| [`docs/11-implementation-phases.md`](../11-implementation-phases.md) | Runtime implementation roadmap after the documentation/contract gates. |
| [`docs/archive/`](../archive/README.md) | Historical phase reports, completed review records, superseded questionnaire and pre-ERD-v2 plan. |

## P1 sequence and ownership

| Step | Canonical artifact | Responsibility / exit intent |
|---|---|---|
| P1.1 | [`baseline inventory`](p1/P1.1-baseline-inventory.md), [`owner map`](p1/P1.1-document-owner-map.csv), [`discrepancy matrix`](p1/P1.1-erd-discrepancy-matrix.csv) | Establish exact baseline and route findings; do not redesign owner contracts here. |
| P1.2 | [`Account/Address/RBAC`](p1/P1.2-account-address-rbac-contract.md) | Account identity/lifecycle, address ownership and permissions. |
| P1.3 | [`Catalog metadata`](p1/P1.3-catalog-metadata-contract.md) | Product hierarchy, attributes, Product images and catalog API. |
| P1.4 | [`Inventory`](p1/P1.4-inventory-contract.md) | Warehouse, receipts, stock ledger, reversals and concurrency. |
| P1.5 | [`Pricing/Voucher`](p1/P1.5-pricing-voucher-contract.md) | Integer-VND arithmetic, rounding/allocation and quota behavior. |
| P1.6 | [`Cart/Checkout`](p1/P1.6-cart-checkout-contract.md) | Authenticated Cart, stateless quote and account-scoped idempotency. |
| P1.7 | [`Order/Payment`](p1/P1.7-order-payment-contract.md) | State/actor matrix, snapshots, COD, shipping and compensation. |
| P1.8 | [`Operations/seed`](p1/P1.8-operations-seed-contract.md) | Audit, content/report scope, FK/deletion policy, seed manifest and runbook. |
| P1.9 | [`Consistency report`](p1/P1.9-contract-consistency-report.md), [`exit gate`](p1/P1-exit-gate.md) | Reconcile contracts, ERD, dictionary, target DDL, seed and reference matrices. |

## Rules

1. Modify the canonical artifact for each domain; do not create another copy under root `docs/` or inside a historical review.
2. Do not infer target behavior from the old V1–V6 migrations or archived reports.
3. Each implementation phase must start from the exact latest `origin/demo1` SHA, use a dedicated branch, and report exact-SHA CI evidence.
4. Keep the target DDL isolated from the active Flyway chain until the implementation/activation phase explicitly permits a reviewed migration.
5. Clean-reset tests must use a verified disposable database. No production, staging, shared integration or persistent business database may be reset.
6. Numeric retention and lawful anonymization/deletion exceptions remain TBD under DB-12; do not add purge jobs before approval.

For the repository-wide document hierarchy, start at [`docs/README.md`](../README.md); for precedence rules, see [`docs/00-source-of-truth.md`](../00-source-of-truth.md).
