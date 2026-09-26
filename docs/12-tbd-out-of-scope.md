# 12 — TBD, Yellow Warnings, Phase-Later & Explicit Exclusions

This file is a **do-not-invent list**.

## 1. Yellow: business need exists but implementation is not fully locked

### Guest Order lookup

`POST /api/v1/orders/lookup` need exists, but token/OTP/secret, TTL, rate limit and verification channel are TBD. Do not finalize request/response/security behavior.

### Voucher behavior

Voucher table currently locks only `voucher_id` + `code`. Still TBD:

- discount type/value;
- effective dates;
- minimum order;
- product/category scope;
- use limits;
- stacking;
- active/inactive lifecycle.

Do not add `is_enabled`, date fields, usage tables or eligibility logic without refinement.

### Create Order dedupe

API #20 is baseline, but idempotency request-token/dedupe mechanism is application/physical-design TBD. Do not add a schema field merely because it is a common pattern.

### Guest cart

Cart allows nullable account logically, but guest session key, TTL, persistence and login merge behavior are TBD.

### Login identity

Phone/email/both as primary login identifier, uniqueness/verification and password-policy details are not fully locked.

## 2. Phase later / not a separate baseline resource

- Notification API/table/provider/template/event/retry/retention.
- Detailed Size Guide content/measurement storage.
- Order status timeline table/API.
- Structured/item-level AfterSales case/resource/workflow.
- GoodsReceipt `unit_cost`/cost-price extension.
- Content draft/publish/version lifecycle.
- Report materialized/aggregate tables without performance evidence.

## 3. APIs explicitly invalid for current baseline

Do not implement:

- `POST /api/v1/admin/staff-accounts/{accountId}/disable`;
- `POST /api/v1/admin/vouchers/{voucherId}/disable`;
- shipping carrier tracking/reference endpoint;
- `/api/v1/admin/shipping/options`;
- generic `/api/v1/admin/business-configuration` system settings;
- `POST /api/v1/admin/content-pages/{pageId}/publish`.

## 4. Product scope exclusions

- online payment/payment gateway/bank callback;
- marketplace/multi-vendor;
- multiple warehouses/WMS/warehouse transfers;
- Purchase Order/purchase approval;
- automatic carrier tracking API;
- online customer return request/pickup/automatic refund;
- complex loyalty/recommendation AI;
- ERP/WMS/POS/native mobile integration unless separately required.

## 5. Metrics/operations still TBD

Do not invent numerical requirements for:

- SLA/response time/load;
- RPO/RTO;
- product/SKU scale;
- business retention periods;
- exact supported browser list.

Use TBD markers and wait for explicit decision/testing evidence.
