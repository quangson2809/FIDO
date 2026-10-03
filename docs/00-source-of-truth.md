# 00 — Source of Truth & Conflict Resolution

## 1. Purpose

Codex must distinguish **locked business requirements** from **implementation choices** and **TBD**. This document defines which Analyst source wins when files overlap.

## 2. Source precedence

| Priority | Source | Authority |
|---:|---|---|
| 1 | `07_Thiet_ke_du_lieu_CSDL_Website_Ban_Quan_Ao_v1.3.0_catalog_final.docx` | Current relational schema, 28-table baseline, data dictionary, invariants, transaction/concurrency rules |
| 2 | `DANH MỤC API TINH GỌN THEO CSDL` | Current consolidated HTTP/JWT/DTO contract; latest baseline is **77 APIs** |
| 3 | `02_SRS_Website_Ban_Quan_Ao.docx` | FR/NFR, business rules, state machine, acceptance criteria |
| 4 | `03_FRS_Website_Ban_Quan_Ao.docx` | Functional processing rules and error/transaction expectations |
| 5 | `04_Use Case_Website_Ban_Quan_Ao.docx` | Preconditions, happy path, alternatives, rejection flows |
| 6 | `05_Process_Flow_Website_Ban_Quan_Ao.docx` | Operational workflow visualization |
| 7 | `06_User_Story_Backlog_Website_Ban_Quan_Ao.docx` | Story/AC traceability and refinement flags |
| 8 | `mo_hinh_hoa_Website_ban_quan_ao.docx` | Conceptual class/component/package boundaries; older details yield to DB v1.3.0/API consolidated doc |
| 9 | `01_BRD_Website_Ban_Quan_Ao.docx` | Business scope and high-level decisions |

`Danh_muc_API_Website_Ban_Quan_Ao_v5_CSDL_v1.3.0_Tinh_gon.docx` is an older condensed API snapshot and contains 73 endpoints. It is useful for history, but the live consolidated API document now contains 77 baseline endpoints, including Permission CRUD. Do not regress the contract to 73.

## 3. Conflict rules

1. **Schema conflict:** DB v1.3.0 `catalog_final` wins for table/column/invariant design.
2. **Endpoint conflict:** latest consolidated API document wins for URL, method, DTO and JWT rules.
3. **Business-state conflict:** use the locked SRS state model and DB invariants. The canonical successful delivery terminal state is `COMPLETED`; `DELIVERED` from older wording must not be introduced as an extra OrderStatus.
4. **Technology conflict:** Analyst Docs deliberately do not lock DBMS/framework version. Preserve the repository's existing technology; do not upgrade or replace it without an explicit task.
5. **Missing rule:** classify as HARD BLOCK only for the affected business/API/security/schema/state/money/stock/external-contract slice; defer explicitly phase-later work; choose and record ordinary technical decisions in `docs/15-technical-decisions.md`. Do not infer business policy from generic e-commerce practice.

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
