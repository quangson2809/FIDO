# 00 — Source of Truth & Conflict Resolution

## 1. Purpose

Codex must distinguish **locked business requirements** from **implementation choices** and **TBD**. This document defines which Analyst source wins when files overlap.

## 2. Source precedence

| Priority | Source | Authority |
|---:|---|---|
| 1 | Explicit, dated owner approvals in docs/refactor-v2/p1/P1-owner-approval-2026-10-23.md, docs/refactor/phase-1-owner-decision-questionnaire.md and APPROVED/OWNER-APPROVED rows of docs/refactor-v2/p1/P1-decision-log.md | Business behavior and accepted product constraints. The 2026-10-23 approval freezes DB-03/05, DB-12 lifecycle/FK defaults and the approved DB-01/02/06–11/API defaults; retention durations/anonymization exceptions remain TBD. |
| 2 | docs/refactor/phase-1-erd-v2-approved.mmd | Canonical target logical tables, columns, keys and relationships, interpreted within approved owner decisions. |
| 3 | docs/refactor/phase-1-erd-v2-contract.md and docs/refactor-v2/p1/P1-contract-reconciliation-2026-10-23.md | Target meaning, cross-document discrepancies, compatibility disposition and explicit blockers. Conflicts between the two higher authorities must be recorded, not silently resolved. |
| 4 | docs/refactor-v2/p1/P1-data-dictionary.csv, backend/src/main/resources/db/clean-reset/V1__clean_schema.sql and V2__system_seed.sql | Approved target physical defaults and column-level evidence. The SQL/dictionary still require exact-SHA static/MySQL verification and application mapping; passing DDL checks alone does not prove runtime behavior. |
| 5 | docs/04-api-contract.md, docs/05-dto-contract.md and reference/api-baseline-77.csv | Existing 77-endpoint API inventory and legacy wire contract, subject to target dispositions in the P1 API mapping and reconciliation report. |
| 6 | SRS/FRS/UC/process-flow/story documents under repository root and reference/ | Business context and legacy behavior evidence; check conflicts against current approved decisions. |
| 7 | Active code and migrations V1–V6 | Evidence of current legacy behavior, not automatic target specification. |
| 8 | docs/archive/ and reports captured at earlier SHAs | Traceability only; never overwrite a newer approved decision or claim current verification. |

This file maps authority but does not approve unresolved rules. Owner approval freezes target decisions; a field/API still cannot be marked accepted in implementation until runtime mappings and the required tests pass. Numeric data/image/audit retention duration and anonymization exceptions remain TBD.

## 3. Conflict rules

1. **Target schema conflict:** approved owner decisions govern business meaning; the owner-confirmed ERD v2 defines target logical shape within those decisions. If semantics conflict (including null/inheritance rules), record a HARD BLOCK and amend an artifact only after the approved decision is explicit. DB v1.3.0 and migrations V1–V6 describe source schema only.
2. **Endpoint conflict:** latest consolidated API document wins for URL, method, DTO and JWT rules.
3. **Business-state conflict:** use the locked SRS state model and DB invariants. The canonical successful delivery terminal state is `COMPLETED`; `DELIVERED` from older wording must not be introduced as an extra OrderStatus.
4. **Technology conflict:** Analyst Docs deliberately do not lock DBMS/framework version. Preserve the repository's existing technology; do not upgrade or replace it without an explicit task.
5. **Missing rule:** mark `BLOCKED/TBD`; do not infer from generic e-commerce practice.
6. **Target scope boundary:** do not reintroduce tables absent from the 31-table ERD (including payment/refund transaction history, shipment event/line tables, return tables, stock reservations, voucher scope joins, usage ledger or checkout quote) without an explicit owner change. If the current code/data depends on one, track a compatibility/retention blocker; do not silently broaden the target model.

## 4. Baseline implementation profile (pre-refactor)

The following bullets describe the existing implementation/business baseline and must not be read as the target database shape:

- single merchant;
- COD only;
- one warehouse in the source inventory model;
- older API/implementation text described guest checkout as supported/TBD. **Legacy-only:** this wording is superseded for the target by the owner decision dated 2026-10-05 requiring login before using a persisted cart or placing an order; do not implement guest checkout unless that decision is explicitly amended;
- no automatic shipping tracking integration in the current implementation;
- existing Order/Payment state behavior remains the business/API compatibility baseline;
- Catalog v1.3.0 uses Product SizeSystem and ProductVariant = Product + SizeValue + Color;
- V1 began with 28 tables, while the full current migration chain V1–V6 defines 32 application tables;
- the consolidated API baseline has 77 endpoints.

## 5. Owner-confirmed target database profile

The post-refactor persistence shape is the owner-confirmed 31-table ERD in docs/refactor/phase-1-erd-v2-approved.mmd:

- product parent and child records share PRODUCTS; the target has no ProductVariant, SizeSystem, SizeValue or Color tables;
- stock balance is keyed by warehouse and Product with quantity_on_hand and version; there is no reservation table or reserved-quantity column;
- an Order has one PAYMENTS row and optional SHIPPING_INFOS; there are no payment transaction/refund event, shipment event/line or return tables;
- VOUCHERS and ORDER_VOUCHER_SNAPSHOTS exist, but voucher target joins, usage ledger and checkout_quotes are not target tables;
- ORDER_ITEMS.image_url_snapshot, ORDERS.request_fingerprint, ORDERS.currency, VOUCHERS.usage_count, GOODS_RECEIPTS.warehouse_id and refund metadata are present in the current target ERD/DDL draft; their application semantics or retention policy may still be blocked;
- omitted source fields/history require an explicit migration transform/archive/retirement disposition;
- target schema changes do not automatically authorize public API/DTO or business-state changes. Use the consolidated API contract and SRS for those semantics, and document compatibility gates when the current behavior needs a persistence concept absent from the target.

## 6. Trace notation in this kit

- `SRS FR-xx`, `NFR-xx`, `BRULE-xx`, `AC-xx` refer to SRS IDs.
- `DB C-xx` refers to constraints in DD-DB-01.
- `API #xx` refers to current 77-endpoint consolidated contract.
- `TBD` means no production behavior may be invented.
