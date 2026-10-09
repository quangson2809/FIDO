# 12 — TBD, Deferred Work, Hard Blockers & Explicit Exclusions

This file prevents invented business behavior. It must not be used to stop implementation for ordinary technical choices.

## 1. How to use this file

Classify each unresolved point:

- **HARD BLOCK** if proceeding requires inventing business behavior, public API/security semantics, persistent business meaning/schema, state/money/stock semantics or an external contract.
- **DEFERRED FEATURE** if the source explicitly postpones the feature.
- **TECHNICAL DECISION** if the semantics are already fixed and only implementation naming/organization remains. Technical decisions are recorded in `docs/15-technical-decisions.md` and do not block a phase.

## 2. Current hard/deferred business gaps

### Guest Order lookup — HARD BLOCK for final guest-lookup security only

`POST /api/v1/orders/lookup` is required, but token/OTP/secret, TTL, rate limit, masking and verification channel are not locked. Do not finalize a weak phone-only lookup. This does not block authenticated order APIs.

### Voucher behavior — DEFERRED slice

Only `voucher_id` + `code` are locked. Still unresolved:
- discount type/value;
- effective dates;
- minimum order;
- product/category scope;
- use limits;
- stacking;
- active/inactive lifecycle.

Do not add fields/tables/rules for these. Authenticated Cart and voucher-less Quote may proceed.

### Create Order dedupe — HARD BLOCK for retry guarantee only

API #20 remains baseline, but request-token/dedupe behavior for retry/double-click is physical/application design TBD. Do not add a schema field merely because it is common. Other Order creation/state logic may proceed; do not claim retry-safe create until this is resolved.

### Guest cart — DEFERRED slice

Logical Cart permits nullable account. Guest session key, TTL, persistence and login merge are not locked. Authenticated Cart may proceed.

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

The user resolved API #71 / FR-30 / BRULE-13: include shipping in received sales, subtract the returned order value in its original completion period, count current statuses by order creation date, and use Asia/Ho_Chi_Minh dates. See docs/15 for formulas and boundaries. This is no longer a Phase 7 blocker. Existing guest/voucher/dedupe and other earlier-phase deferred items remain unchanged.

### Voucher V1 override (2026-10-09)

The approved policy recorded in `15-technical-decisions.md` resolves discount,
time window, eligible merchandise minimum, product/category scope, usage limits,
non-stacking, enable/disable and cancellation/return semantics for Voucher V1.
Personal wallets/allocation and variant-specific promotions remain out of scope.
