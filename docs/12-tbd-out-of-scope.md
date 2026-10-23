# 12 — TBD, Deferred Work, Hard Blockers & Explicit Exclusions

> **ERD v2 / Clean Schema Reset boundary (2026-10-22):** Several entries below describe the legacy implementation/API, not the 31-table target. Disposable development/test rows and old IDs are not migrated or retained. Use legacy code only to identify runtime/API behavior that must be retained, explicitly deferred or removed. The target includes VOUCHERS but omits voucher product/category joins, usage ledger and checkout_quotes; it also omits payment/refund event tables, returns and inventory reservations. Do not recreate those structures by implication.


This file prevents invented business behavior. It must not be used to stop implementation for ordinary technical choices.

## 1. How to use this file

Classify each unresolved point:

- **HARD BLOCK** if proceeding requires inventing business behavior, public API/security semantics, persistent business meaning/schema, state/money/stock semantics or an external contract.
- **DEFERRED FEATURE** if the source explicitly postpones the feature.
- **TECHNICAL DECISION** if the semantics are already fixed and only implementation naming/organization remains. Technical decisions are recorded in `docs/15-technical-decisions.md` and do not block a phase.

## 2. Current hard/deferred business gaps

### Guest Order lookup — legacy requirement, target disposition

The old TBD register mentioned `POST /api/v1/orders/lookup`, but that route is not part of the current 77-row endpoint map in `docs/04-api-contract.md`. The owner decision dated 2026-10-05 requires login before order placement, and Clean Schema Reset does not preserve old development orders. Therefore guest-order lookup is **not a target capability by default**. Remove it from target requirements unless the owner explicitly amends the API scope; do not add guest identity/session storage to satisfy an obsolete statement.

### Voucher behavior — target compatibility BLOCKED / explicit defer required

The legacy source supports more voucher behavior than the target schema represents. The target has `VOUCHERS` and `ORDER_VOUCHER_SNAPSHOTS`, but no product/category scope joins, usage ledger or persisted checkout quotes. Unresolved runtime/API behavior includes discount formula/value, effective dates, minimum order, eligibility scope, usage limits, stacking, lifecycle, concurrent redemption and cancellation restoration.

Do not reintroduce tables absent from the approved ERD by implication. Before implementing voucher endpoints, explicitly approve the reduced target behavior or revise the ERD through the owner decision process. Voucher-less authenticated Cart/Quote work can proceed if the API contract permits it.

### Create Order dedupe — HARD BLOCK for retry guarantee only

The legacy API #20 remains a compatibility reference, while the target ERD includes a unique `orders.idempotency_key`. The uniqueness constraint alone does not define request semantics. Freeze key origin/scope, payload binding, same-key replay, conflicting-payload response and transaction boundary before claiming retry-safe create. No historical key backfill is needed for Clean Schema Reset.

### Guest cart — legacy behavior not represented in target

Older API rows labelled cart operations as JWT-optional/guest-TBD. The owner decision dated 2026-10-05 resolves the target behavior: require login for persisted Cart and order placement. `docs/04-api-contract.md` now records JWT as required for APIs #14–20. Guest sessions, anonymous accounts, local guest-cart persistence and login-time guest-cart merging are out of target scope unless a later owner decision explicitly changes it.

### Exchange-size automation — DEFERRED slice

The baseline confirms in-store size exchange as a business scenario, but the implementation semantics remain unresolved:
- target Variant selection/movement;
- whether and when the old Variant returns to sellable stock;
- price differences;
- partial-line/partial-order exchange;
- resulting OrderStatus/payment effects.

API #26 accepts the operation name at the contract boundary, but the current implementation returns HTTP 501 for `EXCHANGE_SIZE` rather than inventing stock/payment/state behavior. The source-ready `RETURN` outcome remains implemented without automatic restock or automatic refund.

### Employee permission matrix — DEFERRED assignment policy

The exact mapping of employee roles/groups to business capabilities is not locked. Do not auto-grant operation permissions to ADMIN or other employee roles.

This does **not** prohibit defining technical capability identifiers required by code. The current technical decision uses capability codes such as `CATALOG_READ` / `CATALOG_WRITE`; role assignment remains configuration/business policy.

## 3. Technical points that are NOT blockers

Do not block implementation solely because of:

- Java class/method/repository method names;
- mapper/private-helper structure;
- query implementation choice;
- exception class naming;
- package decomposition inside an approved module;
- technical enum literal names when source semantics are fixed;
- capability/permission code names when authorization semantics are fixed.

Example: Catalog source fixes the distinction between “đang bán”, “ngừng bán” and “hết tồn” but not the literal enum names. `ON_SALE` / `STOPPED` are therefore a technical encoding, not a new business rule.

## 4. Phase later / not a separate baseline resource

- Notification API/table/provider/template/event/retry/retention.
- Detailed Size Guide content/measurement storage.
- Order status timeline table/API.
- Structured/item-level AfterSales case/resource/workflow.
- GoodsReceipt `unit_cost`/cost-price extension.
- Content draft/publish/version lifecycle.
- Report materialized/aggregate tables without performance evidence.

## 5. APIs explicitly invalid for current baseline

Do not implement:
- `POST /api/v1/admin/staff-accounts/{accountId}/disable`;
- `POST /api/v1/admin/vouchers/{voucherId}/disable`;
- shipping carrier tracking/reference endpoint;
- `/api/v1/admin/shipping/options`;
- generic `/api/v1/admin/business-configuration`;
- `POST /api/v1/admin/content-pages/{pageId}/publish`.

## 6. Product scope exclusions

- online payment/payment gateway/bank callback;
- marketplace/multi-vendor;
- multiple warehouses/WMS/transfers;
- Purchase Order/purchase approval;
- automatic carrier tracking API;
- online customer return request/pickup/automatic refund;
- complex loyalty/recommendation AI;
- ERP/WMS/POS/native mobile integration unless separately required.

## 7. Metrics/operations still TBD

Do not invent numeric targets for:
- SLA/response time/load;
- RPO/RTO;
- product/SKU scale;
- retention periods;
- exact supported browser list.


## 8. Phase 7 report decision — resolved 2026-09-28

The user resolved API #71 / FR-30 / BRULE-13: include shipping in received sales, subtract the returned order value in its original completion period, count current statuses by order creation date, and use Asia/Ho_Chi_Minh dates. See docs/15 for formulas and boundaries. This is no longer a Phase 7 blocker. Target voucher and order-retry semantics were owner-approved on 2026-10-23; runtime implementation and acceptance tests remain pending. Guest cart/checkout is out of target scope under the owner decision dated 2026-10-05; the remaining task is documentation/API alignment, not a pending decision about whether guest checkout is required.

### Voucher V1 override (2026-10-09) — legacy source behavior only

> The details in this historical section describe the pre-reset runtime, not the v2 target contract. The 2026-10-23 owner approval supersedes target scope: order-wide non-stackable voucher, no Product/Category targeting or per-account usage ledger, global usage limit, atomic counter update, and at-most-once restoration on eligible cancellation. The target quote is stateless and the target schema has no CHECKOUT_QUOTES table. Use P1-owner-approval-2026-10-23.md as the target authority.

The approved policy recorded in `15-technical-decisions.md` resolves discount,
time window, eligible merchandise minimum, product/category scope, usage limits,
non-stacking, enable/disable and cancellation/return semantics for Voucher V1.
Personal wallets/allocation and variant-specific promotions remain out of scope.


## P1 owner approvals and implementation gates (approved 2026-10-23)

- **DB-03:** movement types/source/sign, semantic deduplication across request keys, opening balance, reversal policy, lock ordering and atomic source/balance/ledger/audit are approved. MySQL concurrency and ledger reconciliation tests remain required.
- **DB-05:** stateless quote, order-time repricing, account-scoped idempotency/fingerprint, same-payload replay, changed-payload conflict, account isolation and atomic order write set are approved. Runtime replay/conflict/rollback tests remain required.
- **DB-12:** delete lifecycle/FK defaults are approved; numeric audit/image/personal-data retention periods and anonymization exceptions remain TBD. Do not schedule purges before those durations are accepted.
- **DB-01/02/06/07/08/09/10/11/API:** proposed defaults are approved; implement Product hierarchy/typed attributes, global voucher quota, immutable snapshots, COD/refund rules, active-phone uniqueness, integer-VND rounding and safe bootstrap as specified in the owner-approval record.

**Gate:** P2 implementation may proceed only with a verified disposable local/development/test database. Recreate schema from the approved 31-table ERD and seed from scratch; do not preserve legacy disposable rows. Never reset production/shared/persistent data. P1 remains PARTIAL until runtime alignment and exact-SHA acceptance tests pass; numeric retention durations remain TBD.
