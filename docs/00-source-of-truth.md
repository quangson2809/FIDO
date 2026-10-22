# 00 — Source of Truth & Conflict Resolution

## 1. Purpose

Codex must distinguish **locked business requirements** from **implementation choices** and **TBD**. This document defines which Analyst source wins when files overlap.

## 2. Source precedence

| Priority | Source | Authority |
|---:|---|---|
| 1 | `docs/refactor/phase-1-erd-v2-approved.mmd` + `docs/refactor/phase-1-erd-v2-contract.md` | Owner-confirmed target persistence model for refactor: 31 logical tables; authoritative for target table/column/key shape |
| 2 | `07_Thiet_ke_du_lieu_CSDL_Website_Ban_Quan_Ao_v1.3.0_catalog_final.docx` + repository migrations V1–V6 | Pre-refactor schema and source-data semantics only; the full current chain defines 32 application tables, distinct from the 31-table target |
| 3 | `DANH MỤC API TINH GỌN THEO CSDL` | Current consolidated HTTP/JWT/DTO contract; latest baseline is **77 APIs** |
| 4 | `02_SRS_Website_Ban_Quan_Ao.docx` | FR/NFR, business rules, state machine, acceptance criteria |
| 5 | `03_FRS_Website_Ban_Quan_Ao.docx` | Functional processing rules and error/transaction expectations |
| 6 | `04_Use Case_Website_Ban_Quan_Ao.docx` | Preconditions, happy path, alternatives, rejection flows |
| 7 | `05_Process_Flow_Website_Ban_Quan_Ao.docx` | Operational workflow visualization |
| 8 | `06_User_Story_Backlog_Website_Ban_Quan_Ao.docx` | Story/AC traceability and refinement flags |
| 9 | `mo_hinh_hoa_Website_ban_quan_ao.docx` | Conceptual class/component/package boundaries; target persistence follows owner-confirmed ERD v2 |

`Danh_muc_API_Website_Ban_Quan_Ao_v5_CSDL_v1.3.0_Tinh_gon.docx` is an older condensed API snapshot and contains 73 endpoints. It is useful for history, but the live consolidated API document now contains 77 baseline endpoints, including Permission CRUD. Do not regress the contract to 73.

## 3. Conflict rules

1. **Target schema conflict:** the owner-confirmed 31-table ERD v2 and its data contract win for the post-refactor persistence shape. DB v1.3.0 and migrations V1–V6 describe the current/source schema only.
2. **Endpoint conflict:** latest consolidated API document wins for URL, method, DTO and JWT rules.
3. **Business-state conflict:** use the locked SRS state model and DB invariants. The canonical successful delivery terminal state is `COMPLETED`; `DELIVERED` from older wording must not be introduced as an extra OrderStatus.
4. **Technology conflict:** Analyst Docs deliberately do not lock DBMS/framework version. Preserve the repository's existing technology; do not upgrade or replace it without an explicit task.
5. **Missing rule:** mark `BLOCKED/TBD`; do not infer from generic e-commerce practice.
6. **Target scope boundary:** do not reintroduce tables absent from the 31-table ERD (including payment/refund transaction history, shipment event/line tables, return tables, stock reservations, voucher scope joins, usage ledger or checkout quote) without an explicit owner change. If the current code/data depends on one, track a compatibility/retention blocker; do not silently broaden the target model.

## 4. Baseline identity

The implementation target is:

- single merchant;
- COD only;
- one warehouse;
- guest checkout supported;
- no automatic shipping tracking API;
- Order and Payment states separated;
- Catalog v1.3.0 with Category tree, leaf-only Product assignment, Product SizeSystem, Variant = Product + SizeValue + Color;
- 28 baseline tables;
- 77 green baseline APIs, with explicit yellow/TBD areas.

## 5. Trace notation in this kit

- `SRS FR-xx`, `NFR-xx`, `BRULE-xx`, `AC-xx` refer to SRS IDs.
- `DB C-xx` refers to constraints in DD-DB-01.
- `API #xx` refers to current 77-endpoint consolidated contract.
- `TBD` means no production behavior may be invented.
