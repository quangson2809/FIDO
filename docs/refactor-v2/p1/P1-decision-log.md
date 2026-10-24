# P1 — Decision Log

> **Owner approval recorded — 2026-10-23:** DB-03, DB-05 and DB-12 proposals and the proposed DB-01/02/06–11/API defaults were approved. The development/test data policy is Clean Schema Reset: discard disposable legacy test data and rebuild/seed from the 31-table target ERD. DB-12 numeric retention periods remain TBD. See [P1-owner-approval-2026-10-23.md](P1-owner-approval-2026-10-23.md).

**Status: PARTIAL — owner decision gates are recorded, but implementation acceptance remains open.** Clean-reset work may proceed only against a verified disposable development/test database. No reset has been executed. Do not activate target migrations in the app until entity/service/API/DTO/frontend mapping and acceptance evidence are ready.

## APPROVED

| ID | Decision | Evidence/source | Status | Acceptance evidence |
|---|---|---|---|---|
| A-01 | Target logical schema is the owner-confirmed ERD v2 with exactly 31 tables. Schema additions need explicit owner amendment. | docs/refactor/phase-1-erd-v2-approved.mmd; docs/refactor/phase-1-erd-v2-contract.md | APPROVED | P2 checks exact table/key/relationship metadata. |
| A-02 | Clean Schema Reset: discard disposable legacy development/test rows, create the approved ERD v2 target from a clean baseline and seed it again. No legacy data migration is required. Production, staging, shared integration and real/persistent data are excluded. | Owner approval 2026-10-23; docs/refactor/clean-schema-reset-runbook.md | APPROVED | Fresh isolated MySQL install; verify exact host/database and disposability before any destructive operation. |
| A-03 | Persisted Cart and order placement require authentication. Guest identity, guest Cart/checkout, guest order lookup and cart merge are out of target scope. | docs/15-technical-decisions.md; docs/04-api-contract.md; frontend/CONTRACT_ALIGNMENT.md, owner decision 2026-10-05 | APPROVED | P2 security tests reject anonymous access to API #14–20. |
| A-04 | Business baseline is single-merchant, COD-only, one operational warehouse in v1 and manual shipping; no gateway or automatic carrier integration. | docs/00-source-of-truth.md; docs/03-data-model.md; docs/12-tbd-out-of-scope.md | APPROVED | P2 validates scope boundaries. This does not define stock meaning or warehouse persistence. |

## TECHNICAL_DECIDED

| ID | Decision | Evidence | Status |
|---|---|---|---|
| TD-01 | Preserve Modular Monolith + Package by Feature. Cross-module writes go through the owner module service, not another module's Repository. | backend/ARCHITECTURE.md; docs/01-architecture-package-structure.md; docs/02-module-ownership.md | TECHNICAL_DECIDED |
| TD-02 | Flyway is the schema authority; Hibernate validates mappings and does not replace versioned migrations. | docs/15-technical-decisions.md; backend/AGENTS.md | TECHNICAL_DECIDED |
| TD-03 | Use Java Long for BIGINT IDs. UTC TIMESTAMP(6) is the recorded technical convention. Money mapping must follow DB-10 integer VND; BigDecimal is not the default money contract. Physical SQL/JPA mapping remains unfrozen until all monetary columns are reconciled. | docs/15-technical-decisions.md; DB-10 owner decision | TECHNICAL_DECIDED — money mapping superseded by DB-10 |
| TD-04 | Represent ACCOUNT_ROLES, ROLE_PERMISSIONS, PRODUCT_ATTRIBUTE_VALUES and INVENTORIES composite keys explicitly. Order-owned one-to-one rows use order_id as PK/FK. | Owner ERD and existing key-mapping convention | TECHNICAL_DECIDED |
| TD-05 | A self-referencing FK validates reference existence but cannot prevent longer hierarchy cycles. The owner service must protect acyclic changes with concurrency-aware validation. | Owner ERD; docs/06-business-rules-state-machines.md | TECHNICAL_DECIDED |

## OWNER-APPROVED TECHNICAL DEFAULTS — IMPLEMENTATION PENDING

The following technical defaults were accepted by the owner on 2026-10-23. "Approved" freezes target behavior; it does not assert that live Java/SQL/API/frontend mappings or acceptance tests already pass.

| ID | Topic | Approved target default | Remaining engineering evidence |
|---|---|---|---|
| P1-PROP-01 | Phone uniqueness | Generated active-phone key plus soft-delete timestamp; active phone unique and reusable after soft delete. | Map current Account entity/service and auth flows to deleted_at / generated key; schema checks alone are insufficient. |
| P1-PROP-02 | Product hierarchy/inheritance | One parent-child level in v1; parent and child each own SKU, required selling price and inventory. No implicit inheritance from NULL; child creation is explicit. | Reconcile ERD, DDL, validation, DTOs and catalog tests. |
| P1-PROP-03 | Variant identity | No auto-generated variants or attribute-combination signature. Each child Product is explicitly created and identified by its own Product ID/SKU. | Remove legacy Variant-backed contracts; do not silently add variant tables. |
| P1-PROP-04 | Receipt destination | One operational warehouse; server resolves the active destination rather than trusting a client-selected warehouse. | Map GoodsReceipt entity/service/API to warehouse_id and Product IDs. |
| P1-PROP-05 | Adjustment reason | Inventory adjustments use a required reason_code, authenticated actor and idempotency/correlation key. | Implement vocabulary, authorization, audit and source deduplication tests. |
| P1-PROP-06 | Order image history | Image references in orders resolve to immutable object/version content; no overwrite/delete during the retention window. Numeric retention period remains TBD under DB-12. | Stable asset reference and historical-access tests. |
| P1-PROP-07 | Inventory reversals | Append-only reversal movements with source linkage; no direct ledger edits/deletes and no duplicate semantic source event. | Implement guarded transitions, uniqueness and concurrency tests. |
| P1-PROP-08 | Recipient editing | Order address is immutable once placed; edits to account address or catalog data do not mutate historical order snapshots. | Align recipient PATCH/API behavior and snapshot tests. |
| P1-PROP-09 | Voucher quota | Order-wide, non-stackable, global quota; atomic usage increment during successful order placement; one-time release on eligible cancellation; no per-account ledger. | MySQL concurrent last-use and repeated-cancel tests. |
| P1-PROP-10 | COD refund | One COD Payment aggregate; v1 allows at most one full refund per order. Partial/multiple refunds and detailed item-level return workflows require a future explicit scope/schema amendment. | State/role checks, replay/idempotency, return/restock and atomic audit tests. |
| P1-PROP-11 | Physical SQL contract | BIGINT identifiers, UTC TIMESTAMP(6), integer VND/BIGINT money, bounded strings and explicit null/default/check/index/FK policies; RESTRICT default for business/history data. | Compare all DDL/JPA mappings to dictionary and verify in MySQL. |

## Owner approval scope

- DB-01, DB-02, DB-06–DB-11 defaults are owner-approved as frozen in [P1-owner-approval-2026-10-23.md](P1-owner-approval-2026-10-23.md).
- DB-03 and DB-05 design proposals are explicitly APPROVED on 2026-10-23; their implementation and behavioral/concurrency tests are not yet accepted as passing.
- DB-12 entity lifecycle/FK defaults are APPROVED. Numeric data, audit and image-retention durations remain TBD; automatic purging must not be implemented until those durations are decided.
- The confirmed business scope stays single-merchant, COD-only, one operational warehouse, manual shipping, authenticated Cart/order placement, Product-ID inventory and integer-VND money.

## DB-03 Inventory contract handoff

The approved inventory/warehouse/receipt details for balance bounds, missing balances, versioning, signed movement/source, semantic deduplication, reversals, lock order, atomicity and ledger reconciliation are consolidated in [P1.4 Inventory Contract](P1.4-inventory-contract.md). This is a normative elaboration of the approved DB-03 decision, not approval to add tables, indexes, movement types or DDL. Runtime acceptance remains pending.

## APPROVED TARGET CONTRACT DETAILS — IMPLEMENTATION ACCEPTANCE REQUIRED

| ID | Approved target contract | Remaining acceptance evidence |
|---|---|---|
| DB-01 | Parent/child Products independently sellable; one hierarchy level; each row owns SKU, required selling price and inventory; no implicit NULL inheritance; children explicit. | Parent/child validation, acyclic graph, API/DTO compatibility and independent-stock tests. |
| DB-02 | Attributes are descriptive, not variant generators. OPTION, TEXT, NUMBER, BOOLEAN; one value per Product/Attribute pair; option must belong to the same Attribute. | Typed-value validation, metadata visibility/order and DTO tests. |
| DB-03 | Approved movement types/source/sign rules, source-derived dedupe, guarded non-negative balance updates, deterministic locks, append-only reversals and atomic source/balance/ledger/audit. | Concurrent receipt/order/adjustment/cancel/return tests and ledger-vs-balance reconciliation on MySQL. |
| DB-05 | Stateless quote; reprice at placement; account-scoped key and canonical SHA-256 request fingerprint; same payload replays; changed payload conflicts; one atomic order write set. | Lost-response replay, same-key concurrency, payload conflict, rollback injection and account isolation tests. |
| DB-06 | Order-wide/non-stackable/global quota; atomic count update; one-time restoration for eligible cancellation; no per-account quota ledger. | Concurrent last-voucher test and cancellation retry tests. |
| DB-07 | Order-time address/product/voucher/image snapshots; stable immutable image content; historical order remains stable after source edits. | Asset immutability/history integration tests; numeric retention duration remains TBD. |
| DB-08 | COD, one Payment aggregate, manual shipping, explicit state/actor matrix; at most one full refund; no partial/multiple refund or detailed item-level return workflow in v1. | State-transition, authorization, duplicate collection/refund, stock reversal and audit atomicity tests. |
| DB-09 | Active-phone uniqueness with reuse after soft delete; physical nullability/defaults/indexes/checks/FKs follow approved dictionary and lifecycle rules. | JPA/service mapping, schema-validation and delete/FK tests. |
| DB-10 | VND-only integer money; HALF-UP order discount rounding; largest-remainder line allocation with stable product_id tie-break; all totals reconcile exactly. | Multi-line/boundary allocation and API/Java/frontend/report reconciliation tests. |
| DB-11 | Flyway seeds required roles/permissions; SUPERADMIN bootstrap uses external secret/config; demo fixture is separate and contains no credentials. | Fresh-install, seed repeatability, external bootstrap and secret scan. |
| DB-12 | Approved soft-delete/immutable-history/FK defaults; RESTRICT except approved disposable dependent working data; no hard deletion of posted Order/Payment/ledger/audit history. | Per-module delete/FK tests; numeric retention periods and anonymization exceptions remain TBD. |
## DEFERRED

| ID | Item | Scope/evidence | Status |
|---|---|---|---|
| DEF-01 | Notification provider/templates/events/retry/retention persistence | No notifications table in target; documents treat it as phase-later/TBD. | DEFERRED |
| DEF-02 | Online gateway and automatic carrier API/tracking events | Outside COD/manual-shipping baseline. | DEFERRED |
| DEF-03 | Structured item-level return/exchange and automatic refund/restock workflow | Owner requires an Order state machine including returns/refund, but current ERD lacks normalized return/refund persistence. State transitions may be specified; full item-level workflow remains blocked unless schema is amended. | PARTIAL — lifecycle direction is in scope; detailed persistence is not representable yet |
| DEF-04 | Dedicated Order timeline endpoint/table | Current baseline uses current state plus audit; separate timeline not approved. | DEFERRED |
| DEF-05 | Guest sessions/cart/checkout/lookup/cart merge | Excluded by A-03 unless owner formally amends scope. | DEFERRED |

## Status counts

- APPROVED scope decisions: A-01 through A-04.
- TECHNICAL_DECIDED: TD-01 through TD-05.
- OWNER-APPROVED CONTRACTS: DB-01 through DB-12 as scoped in the 2026-10-23 owner approval record.
- OWNER-APPROVED DESIGN PROPOSALS: DB-03 and DB-05.
- REMAINING OWNER INPUT: numeric retention durations for audit logs, image assets and personal/business data, plus any legally required anonymization exceptions.
- IMPLEMENTATION ACCEPTANCE OPEN: runtime mappings, business/security/concurrency tests, bootstrap secret audit, exact-SHA CI and frontend compatibility.

DB-04 (guest checkout) remains resolved by A-03; guest Cart/order lookup/cart merge are out of scope. A-04 fixes one operational warehouse in v1; DB-03 covers mechanics within that scope, not warehouse count. Live GoodsReceipt/Inventory paths still need to be remapped from legacy variant IDs to Product IDs.

## DB-12 — Deletion and history retention (OWNER-APPROVED DEFAULTS; DURATION TBD)

- Soft-delete Account; enforce active-phone uniqueness and permit phone reuse only after soft delete.
- Soft-delete/disable Product, Category, Brand, Attribute/Option, Voucher and Warehouse; reject hard delete while referenced.
- Preserve posted Order, OrderItem, OrderAddress, Payment snapshots, InventoryTransaction and AuditLog history; correct ledger history through reversal entries.
- RESTRICT is the default FK action for business/history rows. CASCADE is limited to approved disposable dependent working data such as CartItems. SET NULL requires an explicit optional-reference justification.
- Numeric retention durations and anonymization exceptions remain TBD. Do not implement scheduled deletion/purging of history or image assets until those periods are approved.
- This lifecycle policy does not prevent a Clean Schema Reset on a separately verified disposable development/test database; that reset discards the database's existing test rows and reseeds from the target baseline.
