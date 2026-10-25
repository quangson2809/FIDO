# P1 Exit Gate — ERD v2 and Cross-domain Contract Freeze

> Owner decisions recorded 2026-10-23 approve DB-03/DB-05 design proposals, DB-12 lifecycle/FK defaults and the stated DB-01/02/06–11/API defaults. On 2026-10-25, the owner additionally approved a unique `(product_id, sort_order)` gallery index and using `ORDER_EDIT` instead of `ORDER_PROCESS`, `ORDER_FULFILLMENT` and `ORDER_EXCEPTION` in the target seed. Numeric audit/image/personal-business retention and lawful anonymization exceptions remain TBD. See [owner approval](P1-owner-approval-2026-10-23.md) and [decision log](P1-decision-log.md) plus the P1.9 report for the later dispositions.

**STATUS: BLOCKED — both owner decisions have been recorded and applied to isolated target artifacts; exact-SHA checker/MySQL/backend verification is the remaining P1.9 gate. P2.1 must not start before the current gate passes.**

## Current target authority and candidate

- Source baseline for P1.9: `demo1@6b7c759dd0931fccff98645331cd72e6970ad16f`.
- Canonical logical model: `docs/refactor/phase-1-erd-v2-approved.mmd`.
- Physical target: `docs/refactor-v2/p1/P1-data-dictionary.csv` + isolated `backend/src/main/resources/db/clean-reset/V1__clean_schema.sql`.
- Required system seed specification: [P1.8 operations/seed contract](P1.8-operations-seed-contract.md); SQL remains in isolated `V2__system_seed.sql` and is not modified in P1.9.
- Cross-domain evidence and blockers: [P1.9 consistency report](P1.9-contract-consistency-report.md).
- The active Flyway migration chain and runtime Java/frontend code were not changed by P1.9. No database was reset.

## Cross-domain inventory and documentation verification

| Gate | Result | Evidence / boundary |
|---|---|---|
| Canonical table inventory | DOCUMENT COMPARISON PASS; exact-SHA check pending | ERD: 31 tables / 228 logical fields. Target DDL: 31 tables / 229 physical columns. The extra generated `accounts.phone_active_key` is documented in the Data Dictionary. |
| Data Dictionary ↔ DDL fields | Historical static PASS; current exact-SHA check pending | Dictionary has 229 physical-field rows. Re-run `scripts/p1/check_contract_consistency.py` through the required workflow against the exact P1.9 PR head. |
| ERD relationship representation | Documentation reconciled | Added diagram links for existing Payment collector/refunder, receipt warehouse/confirmer and inventory reversal FKs; no new schema rule or field was added. |
| API contract reference matrix | PASS — documentation alignment | `reference/api-contract-matrix.csv` preserves 77 legacy runtime rows and adds separate target metadata; the authoritative `P1-api-contract-mapping.csv` has 96 entries, including target-only routes and retired/superseded aliases. |
| Table ownership index | PASS — scoped inventory | `reference/table-ownership.csv` distinguishes 28 legacy runtime rows from 31 `TARGET_ERD_V2` rows; original legacy rows remain first for existing `SchemaMappingTests` compatibility. |
| Audit/content/report mapping | PASS — documentation reconciliation | P1.8 target audit DTO, content slug semantics and report data sources override stale mapping notes. Runtime acceptance remains separate. |
| Frontend contract provenance | PASS — documentation only | `frontend/CONTRACT_ALIGNMENT.md` now points to the reviewed `demo1` baseline and distinguishes legacy source fields from target contracts. Frontend code/build is not asserted as aligned. |
| Product image gallery uniqueness | PASS — schema contract aligned | Isolated clean-reset DDL/Data Dictionary specify unique `(product_id, sort_order)`; application transaction/locking still maintains contiguous `0..n-1` and the single primary image. Existing-data rollout requires preflight/repair. |
| Order seed permissions | PASS — target manifest aligned | The 13-code target manifest and isolated V2 seed use `ORDER_EDIT` for P1.7 Order actions; `ORDER_PAYMENT` and `ORDER_AFTER_SALES` remain separate. P1.2 controls role grants. |
| Exact-SHA consistency checker + isolated MySQL | PENDING | Prior workflow successes apply only to their historical SHAs. A fresh result is required for the P1.9 PR head. |

## Required validation before P1.9 PASS

1. **Exact-SHA validation.** The contract checker, isolated MySQL clean-reset workflow and backend verification must pass on the exact P1.9 PR head. No ancestor SHA is accepted as evidence for the candidate.
2. **Existing-data rollout boundary.** The unique gallery index is part of the clean-reset target schema. Any future deployment to a populated database requires an approved preflight/repair migration for duplicates, gaps and primary-image mismatch; P1.9 did not change a live database or active Flyway chain.

DB-12 numeric retention periods and anonymization exceptions remain TBD. This blocks purge/privacy-retention acceptance and does not authorize any default duration or scheduled deletion. Historical editable UC source documents are absent; do not invent old UC IDs.

**Current gate: P1.9 BLOCKED solely pending exact-SHA checker/MySQL/backend verification; P1 overall remains PARTIAL; P2.1 must not start until the updated candidate passes.**
