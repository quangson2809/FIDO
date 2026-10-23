# P1 — Decision Log

**Status: PARTIAL.** The logical ERD is owner-confirmed; physical schema and material business/API decisions remain open. Recording an option here does not approve it.

## APPROVED

| ID | Decision | Evidence/source | Status | Acceptance evidence |
|---|---|---|---|---|
| A-01 | Target logical schema is the owner-confirmed ERD v2 with exactly 31 tables. Schema additions need explicit owner amendment. | docs/refactor/phase-1-erd-v2-approved.mmd; docs/refactor/phase-1-erd-v2-contract.md | APPROVED | P2 checks exact table/key/relationship metadata. |
| A-02 | Clean Schema Reset is permitted only on explicitly disposable development/test databases; old development rows need not be migrated. This does not authorize destructive work on production/shared environments. | docs/refactor/phase-1-owner-decision-questionnaire.md, owner decision 2026-10-22 | APPROVED | P2 fresh isolated MySQL install and target-DB identity verification. |
| A-03 | Persisted Cart and order placement require authentication. Guest identity, guest Cart/checkout, guest order lookup and cart merge are out of target scope. | docs/15-technical-decisions.md; docs/04-api-contract.md; frontend/CONTRACT_ALIGNMENT.md, owner decision 2026-10-05 | APPROVED | P2 security tests reject anonymous access to API #14–20. |
| A-04 | Business baseline is single-merchant, COD-only, one operational warehouse in v1 and manual shipping; no gateway or automatic carrier integration. | docs/00-source-of-truth.md; docs/03-data-model.md; docs/12-tbd-out-of-scope.md | APPROVED | P2 validates scope boundaries. This does not define stock meaning or warehouse persistence. |

## TECHNICAL_DECIDED

| ID | Decision | Evidence | Status |
|---|---|---|---|
| TD-01 | Preserve Modular Monolith + Package by Feature. Cross-module writes go through the owner module service, not another module's Repository. | backend/ARCHITECTURE.md; docs/01-architecture-package-structure.md; docs/02-module-ownership.md | TECHNICAL_DECIDED |
| TD-02 | Flyway is the schema authority; Hibernate validates mappings and does not replace versioned migrations. | docs/15-technical-decisions.md; backend/AGENTS.md | TECHNICAL_DECIDED |
| TD-03 | Use Java Long for BIGINT IDs and BigDecimal for money. UTC TIMESTAMP(6) is the recorded technical convention, but not approval of all physical columns. | docs/15-technical-decisions.md; docs/05-dto-contract.md | TECHNICAL_DECIDED |
| TD-04 | Represent ACCOUNT_ROLES, ROLE_PERMISSIONS, PRODUCT_ATTRIBUTE_VALUES and INVENTORIES composite keys explicitly. Order-owned one-to-one rows use order_id as PK/FK. | Owner ERD and existing key-mapping convention | TECHNICAL_DECIDED |
| TD-05 | A self-referencing FK validates reference existence but cannot prevent longer hierarchy cycles. The owner service must protect acyclic changes with concurrency-aware validation. | Owner ERD; docs/06-business-rules-state-machines.md | TECHNICAL_DECIDED |

## PROPOSED — NOT APPROVED

| ID | Topic | Recommendation for owner review | Impact | Status |
|---|---|---|---|---|
| P1-PROP-01 | Phone uniqueness | Consider required UNIQUE(phone) to keep the current phone login unambiguous. The ERD does not mark phone UK, and D1 is not approved. | Account DDL, registration/login and duplicate behavior. | PROPOSED; DB-09 |
| P1-PROP-02 | Product sale unit | Consider root Product as a grouping page and direct children as sellable/stocked/cartable units. Inherit only fields explicitly marked in ERD. | Product ID and Catalog/Cart/Order/receipt/Inventory contracts. | PROPOSED; DB-01 |
| P1-PROP-03 | Variant identity | Add a normalized variant signature with a unique scope per parent, or approve another concurrency-safe guard. SKU uniqueness alone is insufficient. | Schema, Product DTO/service and concurrent creation. | PROPOSED; DB-01/02 |
| P1-PROP-04 | Receipt destination | Add GOODS_RECEIPTS.warehouse_id or approve an explicit single-warehouse service assignment policy. | Receipt API and inventory transaction. | PROPOSED; DB-03 |
| P1-PROP-05 | Adjustment reason | Add searchable reason to INVENTORY_TRANSACTIONS or approve another persisted/auditable contract. | Adjustment API, ledger and audit queries. | PROPOSED; DB-03 |
| P1-PROP-06 | Order image history | Add ORDER_ITEMS.image_url_snapshot or explicitly accept no historical image guarantee. | Order DTO, storefront/admin history and asset retention. | PROPOSED; DB-07 |
| P1-PROP-07 | Inventory reversals | Define movement type/source/sign/uniqueness for cancel, restock and return; do not reuse ambiguous movement types. | Stock accounting, Order lifecycle and reports. | PROPOSED; DB-03/08 |
| P1-PROP-08 | Recipient editing | Resolve immutable placement snapshot versus editable delivery details and duplicated ShippingInfo receiver fields. | Order recipient PATCH, shipping and audit. | PROPOSED; DB-07/08 |
| P1-PROP-09 | Voucher capability | Approve a reduced schema-representable voucher policy, defer redemption, or amend ERD for scope/usage persistence. | Voucher CRUD/quote/order and concurrency. | PROPOSED; DB-06 |
| P1-PROP-10 | COD refund | Approve full-refund-only semantics, add refund amount/actor/time persistence, or defer refunds. | Payment API/DTO/report/audit. | PROPOSED; DB-08 |
| P1-PROP-11 | Physical SQL contract | Approve every type length, nullability, default, decimal/timestamp precision, status, check, index and FK action. | DDL/JPA/API validation. | PROPOSED; DB-09 |

## OPEN_BLOCKED — OWNER DECISION REQUIRED

| ID | Unresolved question | Recommended direction (not approval) | Consequence if wrong | Required tests |
|---|---|---|---|---|
| DB-01 | Product parent/child | Decide root SKU/sellability/stock, child depth, inherited fields, parent stopped/deleted behavior, category/brand and public ID. Recommendation: root grouping-only, direct child sellable, inherit only name/slug/description/selling_price. | Wrong Product identity breaks Catalog, Cart, Order, receipt and Inventory. | Parent/child, cycle, sellability, API-ID compatibility. |
| DB-02 | Dynamic attributes | Decide data_type domain, exactly-one typed-value rule, option ownership, requiredness/inheritance, variant-defining matrix and duplicate-combination strategy. OPTION/TEXT/NUMBER/BOOLEAN is only a candidate domain. | A plain option FK does not prove attribute ownership; service-only duplicate checking races. | Type matrix, wrong option, required attributes and concurrent duplicate. |
| DB-03 | Inventory/receipt/ledger mechanics | Decide quantity_on_hand meaning, when order stock is deducted, how receipts/adjustments bind to the already-approved single operational warehouse, movement sources/signs, reversals/reasons and concurrency. A-04 already fixes the warehouse count to one; do not reopen that decision. | Stock drift/negative stock, ambiguous receipt destination and unsearchable adjustment reason. | Concurrent receive/order/adjust/cancel plus ledger consistency. |
| DB-05 | Quote/idempotency | Decide key origin/location/scope, payload binding, replay/conflict behavior, retention, mandatory behavior and quote lifecycle. Recommendation: Idempotency-Key UUID, same-payload replay, changed-payload conflict, preview-only quote with order-time recalculation. | Unique key alone does not bind payload/replay; target has no CHECKOUT_QUOTES table. | Lost-response retry, concurrent retry, conflicting payload, account isolation and repricing. |
| DB-06 | Voucher | Decide formula/rounding/date/min/max/scope/stacking/global or per-account caps, consumption point and cancel/return restoration. | Target lacks product/category scope joins and usage ledger while prior Voucher behavior is richer. | Eligibility matrix, concurrent final-use and cancellation retry. |
| DB-07 | Order snapshots | Decide line/image/address/voucher snapshot completeness, discount allocation, recipient edit and ShippingInfo authority. | Current DTO expects image history absent from target; recipient edit through PREPARING conflicts with immutable snapshot interpretation. | Catalog/address mutations, discount reconciliation and historical DTO. |
| DB-08 | Payment/shipping | Decide COD states, refund amount/actor/time, separation of Order and Payment states, shipping states/timestamps/carrier and recipient source. | Target removes refund attribution and delivery_mode; state literals remain unapproved. | Duplicate collection/refund, state/security and shipping transitions. |
| DB-09 | Physical/account/audit lifecycle | Decide phone uniqueness, lengths/null/defaults/status domains/indexes/FK actions, Account lifecycle, Product status+deleted_at and audit actor/JSON policy. | Auth, history and privacy regressions; P0 H2 status checks failed. | MySQL metadata diff, authentication, soft delete, audit redaction. |
| DB-10 | Money/currency/rounding | Explicitly approve currency, decimal precision/scale, rounding mode and point, order-total calculation, shipping treatment, and allocation/reconciliation of order-level discounts to OrderItems. The draft's VND and DECIMAL(18,2) choices are proposals, not approval. | Amounts can diverge between quote, order, line totals, voucher snapshots, refunds and reports. | Multi-line rounding, boundary values, negative/maximum discounts, order-to-line reconciliation and report totals. |
| DB-11 | System seed/bootstrap | Approve baseline system roles/permissions, initial SUPERADMIN bootstrap boundary, deterministic repeatable system seed, separation from demo fixtures and external credential handling. Never hardcode credentials. | Unbootstrappable environment, unintended privileges or demo identities/secrets entering a shared environment. | Fresh-install seed completeness/idempotency, role grants, no credential in source/fixtures and last-SUPERADMIN protection. |

## DEFERRED

| ID | Item | Scope/evidence | Status |
|---|---|---|---|
| DEF-01 | Notification provider/templates/events/retry/retention persistence | No notifications table in target; documents treat it as phase-later/TBD. | DEFERRED |
| DEF-02 | Online gateway and automatic carrier API/tracking events | Outside COD/manual-shipping baseline. | DEFERRED |
| DEF-03 | Structured item-level return/exchange and automatic refund/restock workflow | No return tables; Order state alone is not a return record. | DEFERRED |
| DEF-04 | Dedicated Order timeline endpoint/table | Current baseline uses current state plus audit; separate timeline not approved. | DEFERRED |
| DEF-05 | Guest sessions/cart/checkout/lookup/cart merge | Excluded by A-03 unless owner formally amends scope. | DEFERRED |

## Status counts

- APPROVED: 4
- TECHNICAL_DECIDED: 5
- PROPOSED: 11
- OPEN_BLOCKED: 10 (DB-01, DB-02, DB-03, DB-05, DB-06, DB-07, DB-08, DB-09, DB-10, DB-11)
- DEFERRED: 5

DB-04 (guest checkout) is resolved by A-03 and is not an active blocker. A later explicit owner amendment may reopen that scope.
