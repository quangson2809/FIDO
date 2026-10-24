# P1 Exit Gate — ERD v2 and Cross-domain Contract Freeze

> Owner decisions recorded 2026-10-23 approve DB-03/DB-05 design proposals, DB-12 lifecycle/FK defaults and the stated DB-01/02/06–11/API defaults. Numeric audit/image/personal-business retention and lawful anonymization exceptions remain TBD. See [owner approval](P1-owner-approval-2026-10-23.md) and [decision log](P1-decision-log.md).

**STATUS: BLOCKED — P1.9 has reconciled documented contradictions but cannot be marked PASS yet. P2.1 seed SQL must not start before P1.9 PASS.** Two material decisions remain: Product image ordering uniqueness and seed-permission-to-Order-action mapping. The exact-SHA checker/MySQL workflow also remains pending for the P1.9 candidate.

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
| API contract reference matrix | PASS — documentation alignment | `reference/api-contract-matrix.csv` now follows all 96 entries in the P1 target mapping. Legacy runtime status is separated from target contract status. Retired routes and superseded aliases remain explicitly marked. |
| Table ownership index | PASS — scoped inventory | `reference/table-ownership.csv` distinguishes 28 legacy runtime rows from 31 `TARGET_ERD_V2` rows; original legacy rows remain first for existing `SchemaMappingTests` compatibility. |
| Audit/content/report mapping | PASS — documentation reconciliation | P1.8 target audit DTO, content slug semantics and report data sources override stale mapping notes. Runtime acceptance remains separate. |
| Frontend contract provenance | PASS — documentation only | `frontend/CONTRACT_ALIGNMENT.md` now points to the reviewed `demo1` baseline and distinguishes legacy source fields from target contracts. Frontend code/build is not asserted as aligned. |
| Product image gallery uniqueness | BLOCKED | P1.3 requires unique contiguous `sort_order`; current target DDL contains a non-unique gallery-order index. Owner/schema disposition is needed. |
| Order seed permissions | BLOCKED | `ORDER_PROCESS`, `ORDER_FULFILLMENT`, `ORDER_EXCEPTION` are in seed manifest while P1.7 uses `ORDER_EDIT` for Order transitions. Owner/domain approval is needed. |
| Exact-SHA consistency checker + isolated MySQL | PENDING | Prior workflow successes apply only to their historical SHAs. A fresh result is required for the P1.9 PR head. |

## Required decisions before P1.9 PASS

1. **P1.9-BLK-01 — Product image gallery uniqueness.** P1.3/schema owner must approve either a unique `(product_id, sort_order)` constraint/index with the corresponding target DDL/Data Dictionary change, or an explicit application-serialized invariant with the non-unique index intentionally retained. P1.9 does not choose or implement a schema change.
2. **P1.9-BLK-02 — Order seed permission mapping.** P1.7/P1.8 and the authorization owner must approve whether `ORDER_PROCESS`, `ORDER_FULFILLMENT` and `ORDER_EXCEPTION` are retained as codes with no target route grant, mapped to named route/action groups, or retired from the seed manifest. No seed SQL may be authored based on an inferred choice.
3. **Exact-SHA validation.** The contract checker and isolated MySQL clean-reset workflow must pass on the exact P1.9 PR head. No ancestor SHA is accepted as evidence for the candidate.

DB-12 numeric retention periods and anonymization exceptions remain TBD. This blocks purge/privacy-retention acceptance and does not authorize any default duration or scheduled deletion. Historical editable UC source documents are absent; do not invent old UC IDs.

## Implementation acceptance remains separate

Even after P1.9 PASS, runtime Entity/Repository/Service/API/DTO/frontend migration, RBAC tests, audit atomicity/redaction, inventory/voucher/idempotency concurrency, Order/refund tests and end-to-end verification remain later-phase acceptance gates. Schema/static checks do not prove application behavior.

**Current gate: P1.9 BLOCKED; P1 overall remains PARTIAL; P2.1 must not start.**
