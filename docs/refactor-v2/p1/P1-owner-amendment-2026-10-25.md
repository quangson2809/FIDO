# P1 Owner Amendment — 2026-10-25

**Status:** Owner decisions are recorded and reflected in isolated target artifacts. Implementation and exact-SHA acceptance remain pending.

**Parent decision record:** [P1 owner approval — 2026-10-23](P1-owner-approval-2026-10-23.md)
**Decision log:** [P1 Decision Log](P1-decision-log.md)
**Integration gate:** [P1.9 consistency report](P1.9-contract-consistency-report.md) and [P1 Exit Gate](P1-exit-gate.md)

This amendment records two target-contract decisions for P1.9. It does not authorize runtime authorization changes, activation of the isolated clean-reset Flyway location, or resetting a live/non-disposable database.

## 1. Product image gallery ordering

**Decision:** require a database-enforced unique pair (product_id, sort_order) using the index uq_product_images_product_order in the isolated clean-reset target schema.

Normative behavior:
- sort_order is zero-based and the valid gallery sequence is contiguous 0..n-1.
- The database unique index prevents two images belonging to the same Product from sharing an order position.
- The unique index alone does not enforce contiguous positions. Every upload, removal and reorder command must lock or serialize gallery mutations per Product and atomically rewrite order plus is_primary.
- An empty gallery has no primary image. A non-empty gallery has exactly one primary image, which is the image with sort_order = 0.
- Before applying this constraint to a populated database, a separately approved migration must detect and resolve duplicate positions, gaps and primary-image mismatches. No such migration or database operation was performed by P1.9.

Affected target artifacts: canonical ERD annotation, P1.3 catalog contract, P1 Data Dictionary and isolated backend/src/main/resources/db/clean-reset/V1__clean_schema.sql.

## 2. Target Order permission catalogue

**Decision:** use ORDER_EDIT for the Order edits/actions and transitions allowed by the P1.7 contract, instead of separately seeding ORDER_PROCESS, ORDER_FULFILLMENT and ORDER_EXCEPTION.

- The target system-permission manifest and isolated V2__system_seed.sql contain 13 permission codes, including ORDER_EDIT.
- ORDER_PAYMENT and ORDER_AFTER_SALES remain separate capabilities; this decision does not combine those with ORDER_EDIT.
- P1.7 remains authoritative for the allowed Order transition/action set. P1.2 remains authoritative for role grants and route authorization.
- This decision does not imply any permission grant to ADMIN, CUSTOMER or a custom Role. The existing policy that SUPERADMIN receives the full target permission catalogue remains unchanged.
- The removed codes are retired from the target seed catalogue. Any remaining legacy runtime policies/tests mentioning those constants are not target runtime acceptance and must be reconciled in the implementation phase.

Affected target artifacts: P1.8 operations/seed contract, P1.8 runbook, isolated backend/src/main/resources/db/clean-reset/V2__system_seed.sql, traceability and exit-gate documentation.

## 3. Acceptance and scope boundary

- The changes above were applied only to isolated clean-reset target artifacts, target documentation and clean-reset schema test assertions for the 13-code target manifest.
- Runtime application logic, the active Flyway migration chain and any live database were not changed or reset.
- P1.9 remains BLOCKED until the contract-consistency checker, isolated MySQL schema verification and backend verification pass on the exact current candidate SHA.
- Numeric DB-12 retention periods and lawful anonymization/deletion exceptions remain TBD. No purge schedule or destructive operation is authorized by this amendment.