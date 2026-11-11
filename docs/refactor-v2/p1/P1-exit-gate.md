# P1 Exit Gate — ERD v2 and Cross-domain Contract Freeze

> Owner decisions recorded 2026-10-23 approve DB-03/DB-05 design proposals, DB-12 lifecycle/FK defaults and the stated DB-01/02/06–11/API defaults. The [P1.9 owner amendment](P1-owner-amendment-2026-10-25.md) records the later approval of the unique `(product_id, sort_order)` gallery index and `ORDER_EDIT` replacing `ORDER_PROCESS`, `ORDER_FULFILLMENT` and `ORDER_EXCEPTION` in the target seed. Numeric audit/image/personal-business retention and lawful anonymization exceptions remain TBD. See [owner approval](P1-owner-approval-2026-10-23.md), [decision log](P1-decision-log.md) and [P1.9 report](P1.9-contract-consistency-report.md).

**STATUS: PASS — owner decisions are applied to isolated target artifacts. Contract consistency checker, isolated clean-reset MySQL schema tests, and backend H2/MySQL migration/mapping verification are green on the current PR head. Evidence: [PR checks](https://github.com/quangson2809/FIDO/pull/38/checks). This closes the P1.9 cross-domain contract/schema gate, not runtime migration or full P1 implementation acceptance.

## Current target authority and candidate

- Source baseline for P1.9: `demo1@6b7c759dd0931fccff98645331cd72e6970ad16f`.
- Canonical logical model: `docs/refactor-v2/target/erd-v2-approved.mmd`.
- Physical target: `docs/refactor-v2/p1/P1-data-dictionary.csv` + isolated `backend/src/main/resources/db/migration/V1__fido_target_schema.sql`.
- Required system seed specification: [P1.8 operations/seed contract](P1.8-operations-seed-contract.md); target `same canonical V1 baseline` was updated to match the approved 13-code manifest. It remains isolated from the active Flyway chain.
- Cross-domain evidence and remaining validation gate: [P1.9 consistency report](P1.9-contract-consistency-report.md).
- The active Flyway migration chain and runtime Java/frontend code were not changed by P1.9. No database was reset.

## Cross-domain inventory and documentation verification

| Gate | Result | Evidence / boundary |
|---|---|---|
| Canonical table inventory | PASS — exact-SHA contract/schema verification | ERD: 31 tables / 228 logical fields; target DDL: 31 tables / 229 physical columns. The generated `accounts.phone_active_key` explains the difference; current PR checker/MySQL tests passed. |
| Data Dictionary ↔ DDL fields | PASS — exact-SHA check | The 229 physical-field rows agree with target DDL under `scripts/p1/check_contract_consistency.py`; checker and isolated MySQL tests passed on current PR head. |
| ERD relationship representation | Documentation reconciled | Added diagram links for existing Payment collector/refunder, receipt warehouse/confirmer and inventory reversal FKs; no new schema rule or field was added. |
| API contract reference matrix | PASS — documentation alignment | `reference/api-contract-matrix.csv` preserves 77 legacy runtime rows and adds separate target metadata; the authoritative `P1-api-contract-mapping.csv` has 96 entries, including target-only routes and retired/superseded aliases. |
| Table ownership index | PASS — scoped inventory | `reference/table-ownership.csv` distinguishes 28 legacy runtime rows from 31 `TARGET_ERD_V2` rows; original legacy rows remain first for existing `SchemaMappingTests` compatibility. |
| Audit/content/report mapping | PASS — documentation reconciliation | P1.8 target audit DTO, content slug semantics and report data sources override stale mapping notes. Runtime acceptance remains separate. |
| Frontend contract provenance | PASS — documentation only | `frontend/CONTRACT_ALIGNMENT.md` now points to the reviewed `demo1` baseline and distinguishes legacy source fields from target contracts. Frontend code/build is not asserted as aligned. |
| Product image gallery uniqueness | PASS — schema contract aligned | Isolated clean-reset DDL/Data Dictionary specify unique `(product_id, sort_order)`; application transaction/locking still maintains contiguous `0..n-1` and the single primary image. Existing-data rollout requires preflight/repair. |
| Order seed permissions | PASS — target manifest aligned | The 13-code target manifest and isolated V2 seed use `ORDER_EDIT` for P1.7 Order actions; `ORDER_PAYMENT` and `ORDER_AFTER_SALES` remain separate. P1.2 controls role grants. |
| Exact-SHA consistency checker + isolated MySQL | PASS — current PR head | Contract consistency checker, isolated clean-reset MySQL schema tests, and backend H2/MySQL migration/mapping verification are green on the current PR head. Evidence: [PR checks](https://github.com/quangson2809/FIDO/pull/38/checks). |

## Acceptance result and rollout boundary

1. **Exact-SHA validation: PASS.** Contract consistency checker, isolated clean-reset MySQL schema tests, and backend H2/MySQL migration/mapping verification are green on the current PR head. Evidence: [PR checks](https://github.com/quangson2809/FIDO/pull/38/checks).
2. **Existing-data rollout remains separate.** The unique gallery index is part of the clean-reset target schema. Any future deployment to a populated database requires an approved preflight/repair migration for duplicates, gaps and primary-image mismatch; P1.9 did not change a live database or active Flyway chain.

DB-12 numeric retention periods and anonymization exceptions remain TBD. This blocks purge/privacy-retention acceptance and does not authorize any default duration or scheduled deletion. Historical editable UC source documents are absent; do not invent old UC IDs.

**Current gate: P1.9 PASS for cross-domain contract/schema consistency; P1 overall remains PARTIAL because runtime Entity/Repository/Service, API/DTO, authorization, frontend, transaction/concurrency and end-to-end acceptance remain open. P1.9's entry restriction on P2.1 is cleared. DB-12 retention/anonymization and historical UC-ID traceability remain explicitly bounded limitations.


## Current candidate status — 2026-10-26

The PASS entries above are historical. The current single schema/seed file is `backend/src/main/resources/db/migration/V1__fido_target_schema.sql`; old clean-reset SQL, separate seed SQL, duplicate installer and V1–V14 migration files have been removed. The new candidate is not PASS until the single-baseline checker and fresh-MySQL workflow pass on the exact SHA. Runtime mapping/API/authorization acceptance remains separate.
