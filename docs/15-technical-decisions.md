# 15 — Current Technical Decisions

> This is the active decision summary for implementation against the owner-approved ERD v2. Historical implementation/audit reports are not target contracts. For business decisions, see the dated [P1 owner approval](refactor-v2/p1/P1-owner-approval-2026-10-23.md) and [Decision Log](refactor-v2/p1/P1-decision-log.md).

## 1. Architecture and stack

- Preserve the current Java/Spring Boot/Gradle application stack; no framework or database-platform upgrade is implied by the schema refactor.
- Use a modular monolith and package-by-feature. The normal call path is Controller → Service → Repository.
- Each module owns its persistence and business invariants. Cross-module writes call the owning module's service, not its Repository.
- Flyway owns schema changes; ORM schema generation does not replace versioned migrations. Validate mappings against an empty target database.
- Use `Long` for BIGINT identifiers and the repository's approved timestamp types/UTC policy. Composite keys must be represented explicitly.

## 2. Approved persistence and money contract

- The target is the 31-table model in `docs/refactor-v2/target/erd-v2-approved.mmd`; exact physical details are in `docs/refactor-v2/p1/P1-data-dictionary.csv`.
- Target monetary values are whole VND stored as integer BIGINT values. Do not use decimal money or JSON floating-point money. DECIMAL is acceptable for non-monetary descriptive numeric attributes.
- Calculate order-level discount with HALF-UP rounding to a whole VND, then allocate with largest remainder and ascending Product ID tie-break. Line discounts reconcile exactly to the order discount.
- Product, Order, OrderItem, address, voucher, Payment and image facts that must remain historically stable are snapshotted at the appropriate write boundary.

## 3. Account, catalog and RBAC

- Account phone identity is unique among active accounts and can be reused after soft deletion. Account lifecycle and generated active-phone enforcement must agree between DDL, Entity, authentication and service validation.
- Product parent/child records share `PRODUCTS`. v1 allows one parent-child level; children are explicit, independently sellable records. Each row owns SKU, required selling price and inventory; NULL never means implicit inheritance.
- Typed catalog attributes use `OPTION`, `TEXT`, `NUMBER` and `BOOLEAN`. Options must belong to the selected Attribute. Attribute metadata is descriptive and never creates Products automatically.
- P3.3 seeds exactly four canonical `ATTRIBUTE_TYPES` rows in the existing baseline SQL. Typed-value validation uses an exhaustive enum switch: exactly one non-null value compatible with the Attribute type, OPTION ownership checked against that exact Attribute, and NUMBER bounded to `DECIMAL(18,4)`. No Strategy/Factory or variant generator is introduced. Only API-79–82 Attribute/Option management routes are implemented; Product POST/PATCH value persistence remains in the Product-core phase and no separate write route is added.
- Required system roles/permissions are seeded by Flyway. Bootstrap SUPERADMIN credentials come from external secret/configuration, never committed source or demo seed. Protect the last SUPERADMIN invariant and audit privileged changes.

## 4. Cart, checkout, Order and vouchers

- Persisted Cart and Order creation require authentication; Account scope comes from the security principal; guest Cart, checkout and merge are excluded.
- Current Cart is the sole account-owned OPEN row. No OPEN row means empty read/create-on-mutation; more than one OPEN row fails closed with CART_SELECTION_AMBIGUOUS and no mutation/merge. No updated_at selection or one-active-Cart schema constraint is inferred; P3.8 serializes Account-scoped creation/mutations.
- Quote is stateless/advisory: no CHECKOUT_QUOTES, quote_id, stock reservation or Voucher use. Order placement reloads/reprices Product eligibility, price, stock, Voucher eligibility/quota and server-owned shipping inputs.
- POST /orders requires Idempotency-Key; the stored key is Account-namespaced and the normalized semantic request gets a canonical SHA-256 fingerprint. Same committed key/payload replays; changed payload conflicts; another Account cannot discover the result. Details are normative in P1.6.
- P1.6 placement atomically writes Order PENDING, OrderItems and immutable address/Product/Voucher/image snapshots, COD Payment UNPAID, ShippingInfo PENDING, applicable Voucher counter, Cart consumption and audit. It does not deduct stock. P1.7 requires stock deduction at PENDING→CONFIRMED and linked one-time reversal for eligible cancellation, with the Order/Inventory/audit write set atomic.
- v1 vouchers are order-wide, non-stackable and use one global limit. Consume usage atomically with successful order placement and restore at most once on eligible cancellation. No catalog-targeting joins or per-account usage ledger.
- Payment is COD-only with one Payment aggregate per Order. Collect COD only atomically with SHIPPING→COMPLETED after manual delivery verification; v1 allows one whole-order full offline refund paired with COMPLETED→RETURNED. Partial/multiple refunds, automated disbursement and detailed item-level return workflows require an approved scope change.

## 5. Inventory, receiving and audit

- v1 has one operational warehouse; the server selects the active warehouse for stock-affecting commands.
- `INVENTORIES` is keyed by `(warehouse_id, product_id)` and stores `quantity_on_hand` plus a concurrency version. A successful movement updates source state, balance, append-only `INVENTORY_TRANSACTIONS` and required audit in one transaction.
- Approved movements are `OPENING`, `GOODS_RECEIPT`, `ORDER`, `ORDER_CANCEL_REVERSAL`, `RETURN_RESTOCK` and `ADJUSTMENT`. Use source-derived uniqueness, deterministic Product-ID lock order, guarded non-negative updates and linked reversal rows.
- **P3.5 balance implementation:** inventory commands lock Products in ascending Product-ID order through the Product-owned access contract, lock/re-read the composite balance row, and apply the quantity delta atomically in SQL. The guarded update checks non-negative current quantity/version, resulting quantity within signed-INT bounds and version below the signed-INT maximum, then verifies exactly one affected row. Version increments once per successful non-zero movement. A positive first movement inserts a zero/version-zero row before the guarded update; negative movement against a missing row fails. Read paths expose logical quantity/version `0/0` for a missing balance and resolve exactly one ACTIVE operational warehouse on the server.
- **P3.6 receipt posting implementation:** receipt create resolves the sole ACTIVE operational warehouse on the server; create/PATCH never use a client-supplied warehouse ID. CONFIRM locks the receipt before reading its lines, then calls the Inventory-owned command service within the same transaction. Each ledger key is derived from `goods_receipt_item_id` and `GOODS_RECEIPT`; source rows and existing postings are compared before any balance mutation. Mixed/changed duplicate sources fail closed. Receipt status/confirmed actor/time, balance/version, append-only ledger and allowlisted before/after audit with the request correlation ID share one transaction. `OPENING` is a one-time positive movement per warehouse/Product pair with `opening:<warehouse_id>:<product_id>` semantic identity; an identical replay returns the prior movement, while any prior movement prevents a second opening.
- Adjustments require a non-zero delta, actor, reason code and idempotency/correlation evidence. No ledger row may be edited/deleted to correct history.
- Audit fields, actor provenance, correlation propagation, allowlisted before/after JSON, redaction and required event/transaction behavior follow [P1.8 Operations, Audit, Content/Report and Seed Contract](refactor-v2/p1/P1.8-operations-seed-contract.md). Do not serialize whole entities/raw requests or log secrets/unnecessary PII; audit failure rolls back the associated required business write set.

- **P3.0 audit write core:** the target-schema writer persists only `actor_account_id, action, entity_type, entity_id, before_data, after_data, correlation_id`; the database owns `id` and `created_at`. `AuditWriteService` uses `Propagation.MANDATORY`, derives human actors from the authenticated JWT subject, exposes a separate trusted-system entry point for NULL actors, and applies action-specific scalar field allowlists before JSON serialization. `X-Correlation-ID` is the request header; trim and accept only 1–120 printable ASCII characters matching `[A-Za-z0-9._:-]`, otherwise generate a UUID. The request filter scopes and clears the value; non-HTTP command handlers that emit multiple events must open one generated correlation scope for that command.

- **Runtime alignment blocker:** the current Flyway runtime baseline still defines the legacy `audit_logs` shape (`audit_id, target_type, target_id, description`), while the approved clean-reset target defines `id, entity_type, entity_id, before_data, after_data, correlation_id`. P3.0 does not alter the schema or migrate legacy domain call sites. The target writer must not be enabled against the legacy runtime schema; schema alignment and audit-read DTO/query migration must be handled in the owning schema/read phases, without adding fields beyond the approved target DDL.

## 6. Order states, shipping and reporting

- Enforce the normative [P1.7 Order/Payment/Shipping contract](refactor-v2/p1/P1.7-order-payment-contract.md) and its summary in `docs/06-business-rules-state-machines.md`; validate actor, preconditions, state, transaction and errors under lock. Duplicate collection/refund and illegal replays must not repeat side effects.
- Shipping is manual; do not introduce carrier API, automatic tracking integration or a dedicated event/timeline table in v1. Order, Payment and ShippingInfo state changes plus required audit are atomic.
- Report query periods, bucket boundaries, zero-filled status metrics, source tables and deterministic Product ranking follow [P1.8](refactor-v2/p1/P1.8-operations-seed-contract.md). Money and Order/Payment/return semantics remain owned by P1.5/P1.7; use Asia/Ho_Chi_Minh inclusive business dates and adjust a whole-Order return in its original completion period. Current status counts use Order creation date.

## 7. Image history, retention and deletion

- Order image references must resolve to immutable object/version content for the required retention window. Later Product image changes must not rewrite historical order image results.
- Prefer soft-delete/disable for referenced Account/catalog/voucher/warehouse records. Use RESTRICT by default for business/history foreign keys; CASCADE only for explicitly disposable working data.
- Posted Orders, snapshots, Payment facts, inventory ledger and audit history are not cascade-deleted.
- The lifecycle/FK matrix and system-seed manifest are specified in [P1.8](refactor-v2/p1/P1.8-operations-seed-contract.md); numeric audit/image/personal-business retention durations and legal anonymization/deletion exceptions remain TBD. Do not implement scheduled purge until they are approved. Current DDL lacks an explicit CartItems CASCADE; P1.9 must reconcile it, and code must delete child rows explicitly until then.

## 8. Delivery status

Owner-approved behavior and target schema are recorded; application/DTO/frontend alignment and runtime acceptance remain open until verified on the exact candidate SHA. DDL validation does not prove transaction/concurrency, authorization or user-flow behavior. Clean Schema Reset may be run only against a verified disposable development/test database; no reset is authorized against persistent/shared data.
