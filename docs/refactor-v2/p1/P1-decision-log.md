# P1 — Decision Log

> **Reconciliation note — 2026-10-23:** The approved target currently includes ORDERS.request_fingerprint, ORDER_ITEMS.image_url_snapshot, VOUCHERS.usage_count, GOODS_RECEIPTS.warehouse_id, PAYMENTS refund metadata, and integer-VND monetary columns. The target fields exist; presence does not approve DB-03/05/06/07/08 transaction, quota, retention or refund semantics. DB-03 and DB-05 remain unapproved owner-requested design proposals; DB-12 has no owner-approved deletion/FK/retention matrix. Do not authorize P2 reset from schema-only evidence.

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
| P1-PROP-01 | Phone uniqueness | Target DDL uses generated nullable phone_active_key with a unique index, alongside deleted_at, to represent active-only uniqueness. MySQL 8.4 suite on SHA dbd7cb6 passed active duplicate rejection and phone reuse after soft delete; current Account Entity still maps global unique phone. Current Account Entity still uses global unique phone. | Account DDL, registration/login and duplicate behavior. | SCHEMA AND DB TEST PASS; APP MAPPING BLOCKED |
| P1-PROP-02 | Product hierarchy/inheritance | DB-01 confirms parent and child Products are independently sellable with their own SKU, price and inventory. Hierarchy depth and field inheritance rules for name, slug, description, selling_price, category_id and brand_id remain unresolved; null does not imply inheritance. | Product and Catalog/Cart/Order/receipt/Inventory contracts. | DIRECTION CONFIRMED; DETAILS BLOCKED |
| P1-PROP-03 | Variant identity | Add a normalized variant signature with a unique scope per parent, or approve another concurrency-safe guard. SKU uniqueness alone is insufficient. | Schema, Product DTO/service and concurrent creation. | PROPOSED; DB-01/02 |
| P1-PROP-04 | Receipt destination | GOODS_RECEIPTS.warehouse_id and its FK to WAREHOUSES are represented in ERD and draft SQL. With one operational warehouse in v1, the service resolves the active destination instead of trusting arbitrary client warehouse IDs. Target DDL and ordering are verified on MySQL 8.4; live GoodsReceipt Entity/service/API mapping remains unimplemented. | Receipt API, Entity and inventory transaction. | SCHEMA ALIGNED; RUNTIME PENDING |
| P1-PROP-05 | Adjustment reason | INVENTORY_TRANSACTIONS.reason_code is now represented in the target ERD/DDL. Vocabulary, requiredness, source-event uniqueness and audit semantics still belong to the unapproved DB-03 proposal. | Adjustment API, ledger and audit queries. | PROPOSED; DB-03 NOT APPROVED |
| P1-PROP-06 | Order image history | ORDER_ITEMS.image_url_snapshot is present in the target ERD/DDL. A stored URL alone does not prove immutable content: stable object versioning, deletion/overwrite behavior and historical access must be defined and tested. | Order DTO, storefront/admin history and asset retention. | FIELD ALIGNED; RETENTION BLOCKED |
| P1-PROP-07 | Inventory reversals | Define movement type/source/sign/uniqueness for cancel, restock and return; do not reuse ambiguous movement types. | Stock accounting, Order lifecycle and reports. | PROPOSED; DB-03/08 |
| P1-PROP-08 | Recipient editing | Resolve immutable placement snapshot versus editable delivery details and duplicated ShippingInfo receiver fields. | Order recipient PATCH, shipping and audit. | PROPOSED; DB-07/08 |
| P1-PROP-09 | Voucher capability | Target VOUCHERS has usage_limit and usage_count plus a bound check; no separate redemption ledger or Product/Category scope joins exist in the target. Atomic increment, global/per-account scope and cancellation/return restoration remain unresolved. | Voucher CRUD/quote/order and concurrency. | SCHEMA REPRESENTED; BEHAVIOR PROPOSED |
| P1-PROP-10 | COD refund | Target Payment has integer refund_amount, refunded_by_account_id, refunded_at and refund_reason. Column presence does not define full/partial refund, idempotency, allowed actors/transitions, return/restock or audit transaction. | Payment API/DTO/report/audit. | FIELDS REPRESENTED; BEHAVIOR BLOCKED |
| P1-PROP-11 | Physical SQL contract | Approve every type length, nullability, default, decimal/timestamp precision, status, check, index and FK action. | DDL/JPA/API validation. | PROPOSED; DB-09 |

## OWNER DECISIONS RECORDED — CONTRACT SYNCHRONIZATION REQUIRED

The owner choices received on 2026-10-23 are recorded in the DB-01, DB-02, DB-06, DB-07, DB-08, DB-09, DB-10 and DB-11 rows below. These are decision inputs, not proof that all dependent API/schema documents have already been reconciled. In particular, DB-07's image_url_snapshot field now exists in the draft but asset retention remains open; DB-09 has a candidate generated-key strategy pending reuse-test evidence; DB-10 target ERD/SQL uses integer VND but legacy implementation still uses decimal monetary types.

## OWNER DESIGN REQUESTS — PROPOSAL REQUIRED

DB-03 and DB-05 are not unresolved because the owner has failed to choose an option: the selected option explicitly requests a design proposal. Proposal exists at docs/refactor-v2/p1/P1-design-proposals-DB-03-DB-05.md. Explicit owner acceptance/revision is still required before claiming contract freeze.

## CONTRACT RECONCILIATION / ACCEPTANCE REQUIRED — OWNER DIRECTIONS ALREADY RECORDED

| ID | Unresolved question | Recommended direction (not approval) | Consequence if wrong | Required tests |
|---|---|---|---|---|
| DB-01 | Product parent/child | OWNER DECISION RECORDED: both parent and child Products are sellable; each record has its own SKU, price and inventory. Child creation is explicit; parent/child identity and API behavior must honor this. | Parent and child must not accidentally share SKU, price or stock; legacy Variant IDs still need API compatibility mapping. | Parent and child sellability, independent SKU/price/stock, parent/child cycle, API-ID compatibility. |
| DB-02 | Dynamic attributes | OWNER DECISION RECORDED: dynamic attributes are descriptive only and do not generate variants. Child Products are created explicitly. Typed value validation and attribute/option ownership still need to be specified in the contract. | Do not derive SKU/Product rows or uniqueness from attribute combinations. | Type matrix, wrong option ownership, requiredness where configured, explicit child creation. |
| DB-03 | Inventory/receipt/ledger mechanics | Proposal required per owner choice D; see P1-design-proposals-DB-03-DB-05.md. A-04 fixes one operational warehouse; do not reopen warehouse count. | Proposal is not accepted; movement reasons/reversals must fit the approved schema. | Concurrent receive/order/adjust/cancel plus ledger consistency. |
| DB-05 | Quote/idempotency | Proposal required per owner choice D; target Order draft contains globally unique idempotency_key and request_fingerprint CHAR(64), and target ERD has no CHECKOUT_QUOTES table. | Proposal is not accepted; key scope/canonical fingerprint/replay/conflict/retention are not implemented in the current legacy Order/API/FE flow. | Lost-response retry, concurrent retry, changed-payload conflict, account isolation and repricing. |
| DB-06 | Voucher | OWNER DECISION RECORDED: order-wide, non-stackable, no Product/Category conditions. Target has usage_count and usage_limit, but their increment, per-account/global scope and cancellation/return restoration remain open. | Draft counter exists; atomic redemption and usage-limit semantics are not yet approved or verified. | Eligibility, concurrent last-use, cancellation retry and total reconciliation. |
| DB-07 | Order snapshots | OWNER DECISION RECORDED: complete order-time data snapshots and immutable image-retention policy. Target draft now includes ORDER_ITEMS.image_url_snapshot and separate ORDER_ADDRESSES. | Retained immutable image object/version, address/history immutability and historical access are not yet evidenced by application code or integration tests. | Catalog/image/address mutations, historical DTO and snapshot completeness. |
| DB-08 | Payment/shipping | OWNER DECISION RECORDED: COD with Order lifecycle, cancellation, returns and refund. Target draft includes refund amount, actor, time and reason columns. | Partial/full refund, retry/idempotency, allowed transitions, role authorization, return/restock and audit atomicity remain to be designed and tested; current code supports only full refund after RETURNED. | State-transition matrix, duplicate refund/collection, authorization and stock effects. |
| DB-09 | Physical/account/audit lifecycle | OWNER DECISION RECORDED: phone may be reused after an account is soft-deleted; phone is unique among active accounts. Physical uniqueness strategy, soft-delete semantics, lengths/null/defaults/status/index/FK actions and audit policy must be consistent with that rule. | A conventional global UNIQUE(phone) would incorrectly block reuse after soft delete. | MySQL run 39904931447 passed active duplicate rejection and deleted-phone reuse; auth flow and audit redaction remain unverified. |
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

DB-04 (guest checkout) is resolved by A-03 and is not an active blocker. A-04 also fixes one operational warehouse in v1. DB-03 concerns the mechanics within that approved scope, not warehouse count. A later explicit owner amendment may reopen resolved scope. Current code evidence shows the live GoodsReceipt/Inventory paths still key items by variant_id; the target schema keys inventory by warehouse_id/product_id and requires a service/API remap.


## DB-12 — Entity deletion and history retention (NOT APPROVED)

No explicit owner-approved per-entity delete lifecycle matrix has been evidenced. This decision must remain open until Product, Account, Voucher, Warehouse, Inventory, InventoryTransaction, Order, OrderItem, OrderAddress snapshot, Payment and AuditLog each specify: soft delete versus hard delete; whether deletion is forbidden; FK RESTRICT/CASCADE/SET NULL behavior; historical retention; and the effect on unique-key reuse. The current target draft uses soft-delete timestamps for Account and Product and restrictive FKs by default, and treats ledger/audit/order snapshots as historical. Those draft choices are not equivalent to an owner-approved DB-12 policy.
