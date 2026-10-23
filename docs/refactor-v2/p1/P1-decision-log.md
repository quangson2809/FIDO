# P1 — Decision Log

**Status: PARTIAL.** The logical ERD is owner-confirmed. Owner choices recorded on 2026-10-23 resolve the direction for DB-01, DB-02 and DB-06 through DB-11. Detailed DB-03/DB-05 proposals are in docs/refactor-v2/p1/P1-design-proposals-DB-03-DB-05.md; they remain unapproved until explicit owner acceptance. Contract synchronization and reviewer evidence remain required before P1 can PASS.

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
| TD-03 | Use Java Long for BIGINT IDs. UTC TIMESTAMP(6) is the recorded technical convention. Money mapping must follow DB-10 integer VND; BigDecimal is not the default money contract. Physical SQL/JPA mapping remains unfrozen until all monetary columns are reconciled. | docs/15-technical-decisions.md; DB-10 owner decision | TECHNICAL_DECIDED — money mapping superseded by DB-10 |
| TD-04 | Represent ACCOUNT_ROLES, ROLE_PERMISSIONS, PRODUCT_ATTRIBUTE_VALUES and INVENTORIES composite keys explicitly. Order-owned one-to-one rows use order_id as PK/FK. | Owner ERD and existing key-mapping convention | TECHNICAL_DECIDED |
| TD-05 | A self-referencing FK validates reference existence but cannot prevent longer hierarchy cycles. The owner service must protect acyclic changes with concurrency-aware validation. | Owner ERD; docs/06-business-rules-state-machines.md | TECHNICAL_DECIDED |

## PROPOSED — NOT APPROVED

| ID | Topic | Recommendation for owner review | Impact | Status |
|---|---|---|---|---|
| P1-PROP-01 | Phone uniqueness | Use active-account-only phone uniqueness and allow reuse after soft delete. A global UNIQUE(phone) is incompatible. Select and verify a MySQL 8.4-compatible physical strategy before migration. | Account DDL, registration/login and duplicate behavior. | PROPOSED; DB-09 |
| P1-PROP-02 | Product sale unit | Consider root Product as a grouping page and direct children as sellable/stocked/cartable units. Inherit only fields explicitly marked in ERD. | Product ID and Catalog/Cart/Order/receipt/Inventory contracts. | PROPOSED; DB-01 |
| P1-PROP-03 | Variant identity | Add a normalized variant signature with a unique scope per parent, or approve another concurrency-safe guard. SKU uniqueness alone is insufficient. | Schema, Product DTO/service and concurrent creation. | PROPOSED; DB-01/02 |
| P1-PROP-04 | Receipt destination | Add GOODS_RECEIPTS.warehouse_id or approve an explicit single-warehouse service assignment policy. | Receipt API and inventory transaction. | PROPOSED; DB-03 |
| P1-PROP-05 | Adjustment reason | Add searchable reason to INVENTORY_TRANSACTIONS or approve another persisted/auditable contract. | Adjustment API, ledger and audit queries. | PROPOSED; DB-03 |
| P1-PROP-06 | Order image history | Preserve immutable historical image without silently adding a column: prove an existing-schema-compatible immutable asset/version retention mechanism, or formally amend the ERD; otherwise explicitly narrow the guarantee. | Order DTO, storefront/admin history and asset retention. | PROPOSED; DB-07 |
| P1-PROP-07 | Inventory reversals | Define movement type/source/sign/uniqueness for cancel, restock and return; do not reuse ambiguous movement types. | Stock accounting, Order lifecycle and reports. | PROPOSED; DB-03/08 |
| P1-PROP-08 | Recipient editing | Resolve immutable placement snapshot versus editable delivery details and duplicated ShippingInfo receiver fields. | Order recipient PATCH, shipping and audit. | PROPOSED; DB-07/08 |
| P1-PROP-09 | Voucher capability | Keep order-wide, non-stackable vouchers without product/category conditions. Do not promise redemption caps/per-account limits unless existing schema can persist and atomically enforce them; otherwise explicitly defer those capabilities or formally amend ERD. | Voucher CRUD/quote/order and concurrency. | PROPOSED; DB-06 |
| P1-PROP-10 | COD refund | Reconcile COD return/refund state transitions and required refund amount/actor/time facts with existing schema; defer any workflow the 31-table ERD cannot represent unless owner formally amends it. | Payment API/DTO/report/audit. | PROPOSED; DB-08 |
| P1-PROP-11 | Physical SQL contract | Approve every type length, nullability, default, decimal/timestamp precision, status, check, index and FK action. | DDL/JPA/API validation. | PROPOSED; DB-09 |

## OWNER DECISIONS RECORDED — CONTRACT SYNCHRONIZATION REQUIRED

The owner choices received on 2026-10-23 are recorded in the DB-01, DB-02, DB-06, DB-07, DB-08, DB-09, DB-10 and DB-11 rows below. These are decision inputs, not proof that all dependent API/schema documents have already been reconciled. In particular, DB-07 requires an immutable image-history solution that does not silently add a column to the owner-confirmed 31-table ERD; DB-09 requires active-only phone uniqueness; DB-10 supersedes the DECIMAL(18,2) draft with integer VND.

## OWNER DESIGN REQUESTS — PROPOSAL REQUIRED

DB-03 and DB-05 are not unresolved because the owner has failed to choose an option: the selected option explicitly requests a design proposal. Proposal exists at docs/refactor-v2/p1/P1-design-proposals-DB-03-DB-05.md. Explicit owner acceptance/revision is still required before claiming contract freeze.

## CONTRACT RECONCILIATION / ACCEPTANCE REQUIRED — OWNER DIRECTIONS ALREADY RECORDED

| ID | Unresolved question | Recommended direction (not approval) | Consequence if wrong | Required tests |
|---|---|---|---|---|
| DB-01 | Product parent/child | OWNER DECISION RECORDED: both parent and child Products are sellable; each record has its own SKU, price and inventory. Child creation is explicit; parent/child identity and API behavior must honor this. | Parent and child must not accidentally share SKU, price or stock; legacy Variant IDs still need API compatibility mapping. | Parent and child sellability, independent SKU/price/stock, parent/child cycle, API-ID compatibility. |
| DB-02 | Dynamic attributes | OWNER DECISION RECORDED: dynamic attributes are descriptive only and do not generate variants. Child Products are created explicitly. Typed value validation and attribute/option ownership still need to be specified in the contract. | Do not derive SKU/Product rows or uniqueness from attribute combinations. | Type matrix, wrong option ownership, requiredness where configured, explicit child creation. |
| DB-03 | Inventory/receipt/ledger mechanics | Proposal required per owner choice D; see P1-design-proposals-DB-03-DB-05.md. A-04 fixes one operational warehouse; do not reopen warehouse count. | Proposal is not accepted; movement reasons/reversals must fit the approved schema. | Concurrent receive/order/adjust/cancel plus ledger consistency. |
| DB-05 | Quote/idempotency | Proposal required per owner choice D; see P1-design-proposals-DB-03-DB-05.md. Proposal recommends advisory quote and order-time recalculation. | Proposal is not accepted; target has no CHECKOUT_QUOTES table or explicit request-fingerprint field. | Lost-response retry, concurrent retry, conflicting payload, account isolation and repricing. |
| DB-06 | Voucher | OWNER DECISION RECORDED: simple order-wide voucher only; non-stackable; no product/category conditions. Remaining contract must define formula, time/usage limits, consumption point and cancellation behavior without silently adding target tables. | Target has no product/category scope joins or usage ledger; usage limits must not be claimed unless representable and approved. | Eligibility matrix, concurrent use where limits exist, cancellation retry and total reconciliation. |
| DB-07 | Order snapshots | OWNER DECISION RECORDED: complete order snapshots with an immutable image-retention policy. The exact image snapshot field/storage/retention contract must be aligned with the 31-table ERD; do not add a column without an explicit ERD amendment. | Historical order view must not change when the live Product/image changes; current ERD has no ORDER_ITEMS.image_url_snapshot. | Catalog/image/address mutations, historical DTO and snapshot completeness. |
| DB-08 | Payment/shipping | OWNER DECISION RECORDED: COD with an Order state machine, including allowed transitions, cancellation, returns and refund. Detailed states and refund persistence/attribution must be proposed and reconciled with the target ERD; structured return workflow remains out of scope unless approved. | Order state alone may not represent return details or refund amount/actor/time. | State-transition matrix, duplicate refund/collection, authorization and stock effects. |
| DB-09 | Physical/account/audit lifecycle | OWNER DECISION RECORDED: phone may be reused after an account is soft-deleted; phone is unique among active accounts. Physical uniqueness strategy, soft-delete semantics, lengths/null/defaults/status/index/FK actions and audit policy must be consistent with that rule. | A conventional global UNIQUE(phone) would incorrectly block reuse after soft delete. | MySQL metadata diff, active duplicate rejection, deleted-phone reuse, auth and audit redaction. |
| DB-10 | Money/currency/rounding | OWNER DECISION RECORDED: VND only; store money as integers. Freeze rounding and order-level discount allocation so totals reconcile exactly across quote/order/items/voucher/refund/report. | Existing draft DECIMAL(18,2) is incompatible with this decision unless explicitly redesigned; do not retain it by inertia. | Multi-line rounding, boundary values, discount allocation, integer VND totals and reconciliation. |
| DB-11 | System seed/bootstrap | OWNER DECISION RECORDED: seed roles/permissions through Flyway; bootstrap SUPERADMIN separately via external secret configuration; keep demo fixtures separate. No credentials may be hardcoded or committed. | Missing initial admin, privilege drift or secret/demo-account leakage. | Fresh-install seed completeness/idempotency, role grants, no credentials in source and last-SUPERADMIN protection. |

## DEFERRED

| ID | Item | Scope/evidence | Status |
|---|---|---|---|
| DEF-01 | Notification provider/templates/events/retry/retention persistence | No notifications table in target; documents treat it as phase-later/TBD. | DEFERRED |
| DEF-02 | Online gateway and automatic carrier API/tracking events | Outside COD/manual-shipping baseline. | DEFERRED |
| DEF-03 | Structured item-level return/exchange and automatic refund/restock workflow | Owner requires an Order state machine including returns/refund, but current ERD lacks normalized return/refund persistence. State transitions may be specified; full item-level workflow remains blocked unless schema is amended. | PARTIAL — lifecycle direction is in scope; detailed persistence is not representable yet |
| DEF-04 | Dedicated Order timeline endpoint/table | Current baseline uses current state plus audit; separate timeline not approved. | DEFERRED |
| DEF-05 | Guest sessions/cart/checkout/lookup/cart merge | Excluded by A-03 unless owner formally amends scope. | DEFERRED |

## Status counts

- APPROVED: 4
- TECHNICAL_DECIDED: 5
- PROPOSED: 11 (technical/schema recommendations; not owner-approved)
- OWNER DECISIONS RECORDED: DB-01, DB-02, DB-06, DB-07, DB-08, DB-09, DB-10, DB-11 (contract synchronization and schema-fit acceptance still required)
- OWNER DESIGN REQUESTS: DB-03, DB-05 (proposal exists; explicit acceptance still required)
- PROPOSAL_REVIEW_REQUIRED: 2 (DB-03, DB-05; proposal documented, explicit owner acceptance pending)
- DEFERRED: 5

DB-04 (guest checkout) is resolved by A-03 and is not an active blocker. A-04 also fixes one operational warehouse in v1. DB-03 concerns the mechanics within that approved scope, not warehouse count. A later explicit owner amendment may reopen resolved scope.
