# 00 — Source of Truth & Conflict Resolution

## 1. Purpose

Codex must distinguish **locked business requirements** from **implementation choices** and **TBD**. This document defines which Analyst source wins when files overlap.

## 2. Source precedence

| Priority | Source | Authority |
|---:|---|---|
| 1 | Latest explicitly approved refinement/change request recorded in this repository | Narrow-scope override for the behavior/schema/API it explicitly changes; `docs/17-image-management-refinement.md` is the current Product-image refinement dated 2026-10-04 |
| 2 | `07_Thiet_ke_du_lieu_CSDL_Website_Ban_Quan_Ao_v1.3.0_catalog_final.docx` | Relational schema, data dictionary, invariants, transaction/concurrency rules except where a later approved refinement explicitly extends it |
| 3 | `DANH MỤC API TINH GỌN THEO CSDL` | Consolidated HTTP/JWT/DTO contract; the image refinement extends the prior 77 APIs with 3 Product-image commands, producing an 80-endpoint target contract |
| 4 | `02_SRS_Website_Ban_Quan_Ao.docx` | FR/NFR, business rules, state machine, acceptance criteria |
| 5 | `03_FRS_Website_Ban_Quan_Ao.docx` | Functional processing rules and error/transaction expectations |
| 6 | `04_Use Case_Website_Ban_Quan_Ao.docx` | Preconditions, happy path, alternatives, rejection flows |
| 7 | `05_Process_Flow_Website_Ban_Quan_Ao.docx` | Operational workflow visualization |
| 8 | `06_User_Story_Backlog_Website_Ban_Quan_Ao.docx` | Story/AC traceability and refinement flags |
| 9 | `mo_hinh_hoa_Website_ban_quan_ao.docx` | Conceptual class/component/package boundaries; older details yield to DB/API/current refinements |
| 10 | `01_BRD_Website_Ban_Quan_Ao.docx` | Business scope and high-level decisions |

`Danh_muc_API_Website_Ban_Quan_Ao_v5_CSDL_v1.3.0_Tinh_gon.docx` is an older condensed API snapshot. It is useful for history but does not override the current consolidated contract or later approved refinements.

The 2026-10-03 Product-image transport refinement that allowed image URLs/multipart on Product create and selected the smallest `image_id` as representative is **superseded** by `docs/17-image-management-refinement.md` wherever they conflict.

## 3. Conflict rules

1. **Schema conflict:** current synchronized Data Design plus a later explicit schema refinement wins. For Product images, `sort_order` and `order_items.image_url_snapshot` are locked by the 2026-10-04 refinement.
2. **Endpoint conflict:** latest consolidated API document plus later explicit API refinement wins for URL, method, DTO and JWT rules. Product-image add/reorder/remove are dedicated child-resource commands; Product create/update no longer accepts image URLs.
3. **Business-state conflict:** use the locked SRS state model and DB invariants. The canonical successful delivery terminal state is `COMPLETED`; `DELIVERED` from older wording must not be introduced as an extra OrderStatus.
4. **Technology conflict:** Analyst Docs deliberately do not lock DBMS/framework version. Preserve the repository's existing technology; do not upgrade or replace it without an explicit task.
5. **Missing rule:** classify as HARD BLOCK only for the affected business/API/security/schema/state/money/stock/external-contract slice; defer explicitly phase-later work; choose and record ordinary technical decisions in `docs/15-technical-decisions.md`. Do not infer business policy from generic e-commerce practice.
6. **Historical implementation conflict:** already-implemented behavior does not override a newer approved requirement. Record the impact, migrate deliberately and keep compatibility risk explicit instead of silently retaining old behavior.

## 4. Baseline identity

The implementation target is:

- single merchant;
- COD only;
- one warehouse;
- guest checkout supported;
- no automatic shipping tracking API;
- Order and Payment states separated;
- Catalog v1.3.0 with Category tree, leaf-only Product assignment, Product SizeSystem, Variant = Product + SizeValue + Color;
- Product image collection with backend file upload, ordered gallery, cover at `sort_order = 0`, current-cover Cart presentation and OrderItem image snapshot;
- 28 baseline tables structurally extended by migration columns rather than by new image/order tables;
- 80 target APIs after the three dedicated Product-image write endpoints, with existing yellow/TBD areas unchanged.

## 5. Trace notation in this kit

- `SRS FR-xx`, `NFR-xx`, `BRULE-xx`, `AC-xx` refer to SRS IDs.
- `DB C-xx` refers to constraints in DD-DB-01.
- `API #xx` refers to the synchronized 80-endpoint target contract; #78–80 are Product-image add/reorder/remove.
- `TBD` means no production behavior may be invented.
