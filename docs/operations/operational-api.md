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

Owner amendments, 2026-11-27/28: OTP is used only to prove account ownership before changing or recovering a password. Login stays phone + password.

| Method | Route | Request | Access / result |
|---|---|---|---|
| POST | `/email/send-otp` | `{email}` in JSON body only | Public; 202 after SMTP send succeeds |
| POST | `/auth/email/verify-otp` | `{email,otp}` | Public; 204 when the code is valid |
| POST | `/auth/password-reset/confirm` | `{email,otp,password,confirm_password}` | Public; 204 after replacing the password |
| POST | `/me/password` | `{otp,password,confirm_password}` | JWT owner; 204 after replacing their password |

- OTPs have six digits and expire after two minutes. They live only in the existing in-memory storage, bound to account ID and normalized saved email. A successful resend replaces the old code; a failed send leaves the previous code intact.
- Verification alone does not grant authority to change a password. The final password command must include the OTP and checks it again, then consumes it once. No email-verification flag or login OTP is introduced.
- Public email recovery rejects missing/inactive accounts and ambiguous email matches instead of selecting an arbitrary account. Profile change derives the target account from JWT, never a body email.
- Both commands reuse the existing password hashing/validation, advance `auth_version`, and audit the password change in its transaction. Public recovery records a system audit event; authenticated callers retain their actual actor. No password or OTP is audited.
- No database schema change is needed. Existing historical recovery tables/columns are left in place; the old link-based endpoints and UI are replaced by this OTP contract. Restarting the server discards pending codes.

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

Actual delivery uses `MAIL_HOST`, `MAIL_PORT` (STARTTLS, default 587), `MAIL_USERNAME`, and `MAIL_PASSWORD` in the process environment or backend `.env`. Spring Boot configures one JavaMailSender; the authenticated username is the From address. SMTP authentication, mandatory STARTTLS, hostname verification and connection/read/write timeouts are configured. Missing sender identity returns `503 EMAIL_DELIVERY_NOT_CONFIGURED`; transport failure returns `502 EMAIL_DELIVERY_FAILED`. Real provider delivery still requires valid runtime SMTP credentials and is not claimed by mocked transport tests.
