# FIDO P1 — ERD v2 and Data Contract

**Status: PARTIAL — owner-approved target contract; runtime implementation and acceptance remain open.**

Baseline: `demo1`; owner approvals recorded 2026-10-23. This folder documents delivery against the canonical 31-table target, not a second competing schema definition.

## Authority

1. [Owner approval record](P1-owner-approval-2026-10-23.md)
2. [Canonical logical ERD](../../refactor/phase-1-erd-v2-approved.mmd)
3. [Canonical physical data dictionary](P1-data-dictionary.csv)
4. [Decision log](P1-decision-log.md)
5. Current API/DTO/business/transaction contracts under `docs/04–07`.

## Artifact index

| File | Purpose |
|---|---|
| `P1-erd-v2.md` | Pointer and concise status for the canonical ERD; avoids a stale duplicate copy. |
| `P1-data-dictionary.csv` | Canonical machine-readable physical field contract and current implementation discrepancy evidence. |
| `P1-data-dictionary.md` | Rules for interpreting/validating the canonical dictionary. |
| `P1-decision-log.md` | Approved decisions and remaining retention/anonymization TBDs. |
| `P1-schema-constraints.md` | Target database constraints and exact-SHA validation gates. |
| `P1-api-contract-mapping.csv` | Legacy API inventory mapped to target/retired route disposition for traceability; not a second active API definition. |
| `P1-domain-invariants.md` | Approved domain, transaction and lifecycle invariants. |
| `P1-test-matrix.md` | Required schema, API, security, transaction and concurrency acceptance cases. |
| `P1-exit-gate.md` | P1 evidence and remaining implementation gates. |
| `P1-design-proposals-DB-03-DB-05.md` | Approved DB-03 inventory/ledger and DB-05 checkout/idempotency mechanics; runtime tests remain pending. |
| `P1-architecture-review.md` | Current target-vs-code architecture findings; implementation mismatches remain open. |
| `P1-api-breaking-changes.md` | Cross-layer breaking-change inventory to guide P2/P3; mismatch findings are not new owner-choice questions. |
| `P1-traceability-matrix.csv` | Separate status/evidence for ERD, DDL, dictionary, backend, API/DTO, frontend and tests. |
| `P1-use-case-target-mapping.md` | Target use-case flow and acceptance mapping. |
| `P1-contract-reconciliation-2026-10-23.md` | Summary of approved target rules, retired legacy concepts and remaining implementation gates. |

| `P1.4-inventory-contract.md` | Inventory balance/version, warehouse and receipt lifecycle, signed movement/source, reversals, semantic deduplication, lock order and reconciliation. |
| `P1.5-pricing-voucher-contract.md` | VND money formula, HALF_UP and largest-remainder examples, Voucher units/eligibility/state, global quota consume/release and API/DTO contract. |

## Frozen target rules

- Exactly 31 target logical tables; no unapproved legacy or new tables.
- Product-ID identity throughout cart/order/receipt/inventory.
- Explicit parent/child Products; required row-owned SKU, integer-VND price and stock; no implicit NULL inheritance.
- Descriptive OPTION/TEXT/NUMBER/BOOLEAN attributes only, with same-Attribute option validation and no automatic Product generation.
- Authenticated Cart/order placement, stateless quote, server-side repricing and account-scoped idempotency.
- Integer VND, approved discount allocation, append-only stock ledger, source-derived deduplication and atomic source/balance/ledger/audit updates.
- Global order-wide non-stacking voucher quota, COD, one operational warehouse, manual shipping and approved Order/Payment/ShippingInfo state rules.
- Immutable Order-time image snapshot with stable object/version reference; numeric retention/anonymization requirements remain TBD.
- Clean Schema Reset only for a database proven to be disposable local/development/test data. No reset is implied.

## Acceptance boundary

The recorded owner approvals close design-choice gates for DB-01/02/03/05/06–11 and the DB-12 lifecycle/FK defaults; only numeric retention/anonymization values remain TBD. That is **not** runtime acceptance. Entity/Repository/Service, API/DTO, frontend, security, transaction, concurrency, seed and end-to-end evidence must pass on the exact candidate SHA before P1/P2 work is considered complete.
