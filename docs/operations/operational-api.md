# Owner-requested operational API extension

Authority: [request and confirmed policies](operational-completion.md), 2026-11-23/24. These additions supersede earlier exclusions only for the listed operations. All routes use `/api/v1`, snake_case, existing safe Vietnamese errors and `{data: ...}` responses. Actor/time are derived on the server. Base contracts continue elsewhere.

## Checkout and catalog

- `POST /checkout/quote` adds `confirmation_token`. It is a stateless SHA-256 acknowledgement of current per-Product quantities/prices/allocated discounts, Voucher identity, shipping and totals; it does not reserve price, quota or stock.
- `POST /orders` additionally requires the acknowledged `confirmation_token`. The server recalculates before any Order write and returns `409 CHECKOUT_RECONFIRMATION_REQUIRED` if it differs or is absent. The client fetches/displays a new quote and requires another explicit confirmation with a new idempotency key. A committed replay still precedes Cart resolution and preserves its original response.
- Cart lines add `purchasable` and nullable `unavailable_reason`. Unavailable/insufficient lines remain readable/removable; they contribute zero to the displayed purchasable subtotal. Quote/order refuse them rather than silently dropping them.
- Product retirement conflicts while positive stock or processing Orders remain. INACTIVE/ARCHIVED stop new sales; they do not erase physical/history responsibilities. Existing retired Product IDs remain usable for stock adjustments and source-linked returns.
- Public catalog/meta/detail, Cart and checkout apply inactive Brand/Category visibility, including inactive Category ancestors. Old Order snapshots and inventory processing are unchanged.
- Authorized `GET /admin/catalog/meta` additionally returns complete `categories` and `brands` arrays, including INACTIVE rows. Category/Brand management uses this view to stop or reactivate sales; it must never use the filtered public metadata to manage inactive rows.
- Price and all selected Attribute Options must match the same eligible family member. Filtered summaries add `matched_product_id`/`matched_sku`; `selling_price` is that matching member's price (lowest matching price, then Product ID). The client opens the matching Product detail.

## Order operations and physical return receipts

`GET /admin/orders/{orderId}/history` requires ORDER_READ or SUPERADMIN. Returns up to 200 recent Order operations with action, actor, timestamp and allowlisted before/after data. Cancellation/failure reasons are bounded to 500 characters; obvious email/phone/credential strings are redacted. No raw request is stored. Full audit search retains the existing access policy.

`GET /admin/orders/{orderId}/return-receipts` requires ORDER_READ or SUPERADMIN. `POST` on the same route requires INVENTORY_WRITE or SUPERADMIN:

```json
{"source_operation_id":"physical-receipt-unique-id","reason":"Inspection result","items":[{"order_item_id":123,"received_quantity":2,"sellable_quantity":1}]}
```

- Source Order must be CANCELLED or RETURNED and have the original deduction. A failed-delivery cancellation performs no automatic stock reversal. Cancellation before dispatch still reverses goods which never left the warehouse.
- Request lines are unique, owned by that Order and limited by original ordered quantity minus previous physical receipts and cancellation reversals. This also blocks duplicate recovery of legacy automatically restored cancellations.
- Server derives condition/disposition: all sellable → SELLABLE/RESTOCK; none → DAMAGED/QUARANTINE; mixed → MIXED/RESTOCK_AND_QUARANTINE. Only sellable quantities append RETURN_RESTOCK movements. Non-sellable goods remain recorded outside sellable stock.
- Order lock serializes physical receipts, including different request keys. Same source operation and canonical payload replay the receipt; changed payload conflicts. Receipt facts, balances, ledger and audit roll back together. No payment/refund/Voucher effect is implied by physical receipt.

## Inventory documents

DAMAGE/LOSS adjustments must decrease stock; FOUND must increase. COUNT_CORRECTION and DATA_CORRECTION can move either way. Existing version/source-deduplication and bounds still apply.

`GET /admin/stocktakes` requires INVENTORY_READ; `POST` requires INVENTORY_WRITE (SUPERADMIN allowed). Lists the 100 newest documents with saved lines. Input:

```json
{"source_operation_id":"stocktake-unique-id","reason":"Count reason","items":[{"product_id":123,"counted_quantity":4,"expected_version":7}]}
```

Creates DRAFT without stock movement and stores the server-observed expected quantity/version. `POST /admin/stocktakes/{id}/actions` with `{"action":"CONFIRM"}` or `CANCEL` is DRAFT-only. Confirmation locks Products in ID order, rejects any intervening movement/version, posts non-zero differences once, and records confirmer/time atomically. A stale draft must be cancelled and counted again. No balancing movement is written for a zero difference.

The count form retains each selected Product's version from when its count was first entered, including across inventory pagination. A refreshed row must not silently replace that version and legitimize an old physical count. Operators can remove and re-enter a count after counting again.

`GET /admin/goods-receipts/{receiptId}/corrections` requires INVENTORY_READ. `POST` requires INVENTORY_WRITE:

```json
{"source_operation_id":"correction-unique-id","expected_correction_id":null,"reason":"Correction reason","items":[{"receipt_item_id":123,"corrected_quantity":3,"corrected_unit_cost":25000}]}
```

- Only CONFIRMED source receipts; original header/lines are immutable. Quantities/costs describe corrected effective facts, not increments. Zero corrected quantity removes an erroneous original line's stock effect; missing/incorrect Product entries are handled by reversing the erroneous line and a separate new receipt for the actual Product.
- Each new correction stores before/after quantities and costs, signed quantity delta and exact VND value delta. Further correction starts from the last correction, not the original. `expected_correction_id` is the last document ID, or null before any correction.
- Changed-payload/source-key and stale-source conflicts are explicit. Insufficient stock/overflow/audit failure rolls back correction, balance and ledger. A cost-only correction writes no zero-quantity ledger entry.
- Structured stocktake/receipt-correction movements cannot be reversed through the manual-adjustment reversal endpoint; use the source workflow.

## Accounts and permissions

- `POST /me/password`: `current_password`, `new_password`; 204 on success. Current password required; 8–128 characters within BCrypt's 72-byte limit. Password change increments `auth_version` and invalidates outstanding recovery links and existing JWTs. Re-login obtains a new version claim.
- `POST /me/email/verification`: 202, authenticated owner, sends only to the saved email. Existing email is not implicitly verified. Changing email clears verification; only one non-deleted account may verify a given normalized email.
- `POST /auth/email/verify`: `{token}`, 204. `POST /auth/password-reset/request`: `{email}`, 202 with no account-existence disclosure. Only ACTIVE accounts with that verified email receive a reset link. `POST /auth/password-reset/confirm`: `{token,new_password}`, 204.
- Recovery capabilities use 256 random bits, URL-safe encoding and SHA-256 storage, single use, purpose/email binding, account-first locks and expiration (verification 24 hours, reset 15 minutes). Issuing a newer link replaces the prior purpose link; per-account issuance cooldown is 60 seconds. Tokens appear only in the email link fragment, which the client removes before submitting via POST. No tokens/passwords/hashes enter audit.
- `PATCH /admin/customers/{customerId}/status`: `{status:"LOCKED"|"ACTIVE",reason}`; CUSTOMER_WRITE or SUPERADMIN. Reason required; audit records actor/time. Targets must be customers and not privileged ADMIN/SUPERADMIN accounts (those continue through protected staff management). Lock/unlock revokes old JWTs; historical Orders stay intact. CUSTOMER_WRITE is seeded for SUPERADMIN only; no employee grant matrix is invented.
- Roles remain flexible. Permission creation/grants reject codes absent from SupportedPermissions, and selection lists expose supported capabilities. Existing supported Permission rows are protected; legacy unused custom rows can be removed through the existing safe deletion flow. Role/staff audit captures exact permission/role ID sets.

## Voucher and content

- Voucher `effective_status` adds ACTIVE, DRAFT, INACTIVE, EXPIRED, SCHEDULED or EXHAUSTED as a derived read value; persisted status does not prove time/quota eligibility.
- After leaving DRAFT, code and commercial terms cannot change (including after quota is released to zero). Allowed existing status transitions remain. New terms require a new code; Order snapshots remain immutable. Audit includes exact commercial field changes.
- Content uses existing create/PATCH APIs and DRAFT/PUBLISHED/ARCHIVED transitions. Admin UI supports new drafts, text preview, publication, withdrawal, archive and restoration to draft. Preview renders text safely; published policy read remains public only while PUBLISHED.

## Reports

All additions require REPORT_READ or SUPERADMIN; no PII is exposed.

- `GET /admin/reports/operations?from=YYYY-MM-DD&to=YYYY-MM-DD`: current statuses of Orders placed in the selected inclusive local-date range, timezone Asia/Ho_Chi_Minh. Average order value is the mean of total_amount for all placed Orders, rounded HALF_UP to whole VND. Cancellation/delivery-failure/return rates use that same placed-order denominator, expressed in integer basis points; empty ranges yield zero.
- `/operations/orders` adds optional status, page/page_size and returns exactly those contributing Order IDs/codes/totals/current statuses for drilldown. Detail links require existing Order-read permission.
- `/operations/slow-moving` is paginated current positive stock with no current COMPLETED/PAID sale in the 10 local calendar days ending today. The overview exposes this separate window explicitly; it is not a historical-stock reconstruction for the selected Order period. Last successful sale and current quantity are shown per Product. Detail links require existing catalog-read permission.

## SMTP configuration and deployment

Actual delivery needs runtime `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT` (STARTTLS, normally 587), `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, `MAIL_FROM`, and HTTPS `APP_PUBLIC_URL`. Supply credentials securely in deployment/environment settings; never in chat or Git. TLS verification and mandatory STARTTLS remain enabled. Without a sender, both known and unknown reset requests receive the same explicit service-unavailable response. Tests replace only the mail delivery adapter; real provider delivery remains a deployment prerequisite.
