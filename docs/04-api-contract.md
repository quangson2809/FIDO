# 04 — Target HTTP API Contract (ERD v2)

## 1. Contract boundary

This file defines the target HTTP surface for the approved ERD v2. It is not a copy of the repository's former route/DTO inventory. Current controllers and the P1 mapping files are implementation evidence only; they do not keep a route in the target contract when its persistence concept is no longer part of the approved model.

Global rules:

- Base path: `/api/v1`. JSON field names use `snake_case`.
- Response envelope: `{ "data": ... }`. Paged lists also return `meta` with `page`, `page_size`, `total` and `total_pages`.
- Public routes are limited to registration/login, public catalog metadata/products and published content.
- `/api/v1/me/**` and `/api/v1/admin/**` require a Bearer access token. The authenticated actor and account scope come from the token, never the request body.
- Persisted Cart, quote and order creation require login. There are no guest sessions, anonymous carts or guest-cart merging.
- Monetary request/response values are whole VND integers. The server calculates prices, discounts, shipping, totals, status transitions and stock effects.
- Use stable typed error codes for validation, ownership, authorization, state conflicts, stock conflicts and idempotency conflicts. Never expose SQL details or secrets.
- Pricing and Voucher arithmetic follows [P1.5 Pricing and Voucher Contract](refactor-v2/p1/P1.5-pricing-voucher-contract.md): whole-VND integer math, HALF_UP for percentage discounts, largest-remainder line allocation and exact Order/Payment reconciliation.

## 2. Target route groups

### Authentication and account

| Method | Route | Access | Target request/response contract |
|---|---|---|---|
| POST | `/auth/register` | Public | `phone, full_name, password (8–128 characters, not trimmed), email?`; normalize phone before uniqueness checks. Create Account as `ACTIVE`, atomically assign the seeded `CUSTOMER` Role, and return `AuthResponseDto(access_token, account)`; client cannot submit role IDs, and no email/OTP verification is required in this phone-login flow. |
| POST | `/auth/login` | Public | `phone, password`; successful `ACTIVE` Account returns `AuthResponseDto(access_token, account)`. Wrong credentials return generic `401 INVALID_CREDENTIALS`; valid credentials for non-ACTIVE Accounts return typed `403` without a token. |
| GET | `/me` | JWT | Returns `MeDto(account, addresses[], roles[], permissions[])`; scope is derived from the authenticated principal. |
| PATCH | `/me` | JWT | Patch `full_name?` and `email?` only. Do not accept `account_id`, `id`, `status`, role/grant fields, timestamps, `password_hash` or `phone` without an approved phone-change/verification flow. |
| POST | `/me/addresses` | JWT | Create a saved address owned by the principal; `account_id` is server-derived. Address field lengths/nullability follow the target Data Dictionary. |
| PATCH | `/me/addresses/{addressId}` | JWT | Patch only the caller's saved address. Omitted fields retain existing values; null is rejected for non-null fields. If `is_default=true`, atomically replace the old default; unsetting/deleting the current default promotes the most recently updated remaining address (tie-break by descending ID). |
| DELETE | `/me/addresses/{addressId}` | JWT | Delete only the caller's saved address; must not mutate historical `ORDER_ADDRESSES` snapshots. |
| GET | `/me/orders` | JWT | Read only Orders belonging to the authenticated account. |
| GET | `/me/orders/{orderId}` | JWT | Read only the authenticated account's Order and immutable order-time snapshots. |

Account contract rules:

- Phone is the login identity and is canonicalized before lookup/uniqueness: accept Vietnam format `0` + 9 digits or `+84` + 9 digits, allow whitespace and `-()` separators, normalize to `+84` + 9 digits, and reject other characters/lengths. Store/compare only canonical values; uniqueness applies to non-soft-deleted Accounts, and reuse is allowed only after soft deletion.
- `full_name` is required and limited to 150 characters. `email` is optional, limited to 254 characters, and is not unique under the target schema.
- `password_hash`, Account status, actor identity, grants and server timestamps are server-owned. New customer registration creates an `ACTIVE` Account and assigns the seeded `CUSTOMER` Role atomically; new staff Accounts start `ACTIVE`; only ACTIVE may authenticate or call protected endpoints. `PENDING_APPROVAL`, `LOCKED` and `SUSPENDED` receive no token and all use `403 ACCOUNT_NOT_ACTIVE` after valid credentials; protected requests re-check current Account status. Never return/log/audit plaintext passwords or password hashes.
- Account status is server-managed: register/staff-create sets `ACTIVE`; only an ACTIVE Account can receive a token. Wrong credentials return generic `401 INVALID_CREDENTIALS`; valid credentials for any non-ACTIVE Account return the same `403 ACCOUNT_NOT_ACTIVE`, without revealing the exact state. Protected requests reject Accounts changed from ACTIVE.
- Saved `ADDRESSES` are mutable Account-owned records. `ORDER_ADDRESSES` is a separate immutable order-time snapshot; editing/deleting a saved address must not rewrite an Order. If an Account has saved addresses, exactly one is default. The first address is default automatically; switching/deleting/unsetting the current default promotes the most recently updated remaining address atomically (tie-break descending ID); deleting the last address leaves none.

### Public catalog and authenticated Cart/checkout

| Method | Route | Access | Contract |
|---|---|---|---|
| GET | `/catalog/products` | Public | Product search/list; supported filters must be explicitly defined against Product fields and approved attribute behavior. |
| GET | `/catalog/products/{productId}` | Public | Product detail and descriptive attribute values. |
| GET | `/catalog/meta` | Public | Product-facing metadata definitions/options, with deterministic ordering. |
| GET | `/cart` | JWT | Read the sole account-owned `OPEN` Cart. If none exists, return `CartDto(id=null, items=[], subtotal=0)` without writing. Multiple OPEN rows return `409 CART_SELECTION_AMBIGUOUS`; do not merge/select arbitrarily. |
| POST | `/cart/items` | JWT | Request `product_id, quantity>0`. Add quantity to an existing same-Product line or insert if absent; create an OPEN Cart atomically if none exists. Product must be ACTIVE/non-deleted. Cart does not reserve stock. |
| PATCH | `/cart/items/{cartItemId}` | JWT | Replace the selected current Cart line quantity with the supplied positive SQL INT exactly; do not increment. |
| DELETE | `/cart/items/{cartItemId}` | JWT | Remove the line only from the sole current OPEN Cart. An absent/foreign/non-current line returns `404 CART_ITEM_NOT_FOUND`; multiple OPEN rows fail closed. |
| DELETE | `/cart` | JWT | Clear all lines of the sole current OPEN Cart but preserve the Cart row/status; if none exists return empty view without creating one. Multiple OPEN rows return `409 CART_SELECTION_AMBIGUOUS`. |
| POST | `/checkout/quote` | JWT | Body: recipient/address fields plus optional `voucher_code`; calculate the current Cart using current server state. Stateless/advisory only; no `quote_id`, persistence, reservation or mutation. |
| POST | `/orders` | JWT | Same recipient/address/Voucher fields as quote plus required `Idempotency-Key` header. Revalidate/reprice current Cart; no `quote_id`, client lines or totals. First commit returns `201 Created`; same-key/same-payload replay preserves the original response and adds `Idempotency-Replayed: true`. |

A Cart line identifies one Product row. Use `product_id` consistently through Cart, quote, order line, receiving and inventory requests. Product parent/child structure is explicit; metadata never creates Products.

The schema has no one-active-Cart unique constraint and no Cart merge. P1.6 specifies fail-closed resolution: zero OPEN rows yields an empty read/create-on-mutation; exactly one OPEN row is current; multiple OPEN rows return `409 CART_SELECTION_AMBIGUOUS` without writes. Do not infer selection from `updated_at`. P3.8 must serialize Account-scoped Cart creation/mutations. See [P1.6](refactor-v2/p1/P1.6-cart-checkout-contract.md).

Order creation revalidates Product status, price, stock, Voucher eligibility/quota and server-owned shipping inputs. `Idempotency-Key` is required on `POST /orders`; derive its stored namespace from authenticated Account and persist the canonical semantic request's SHA-256 fingerprint with the Order. Same key/payload replays a committed Order; changed payload returns `409 IDEMPOTENCY_PAYLOAD_MISMATCH`; concurrent losers roll back then replay/conflict after reading the winner. Exact canonicalization and response semantics are normative in [P1.6](refactor-v2/p1/P1.6-cart-checkout-contract.md).

Money reconciliation is fixed: `subtotal = Σ(unit_price × quantity)`, `discount_amount = Σ(line discounts)`, `line_total = unit_price × quantity − line discount`, and `total_amount = subtotal − discount_amount + shipping_fee`. `PAYMENTS.amount` equals the persisted Order total in VND. See P1.5 for exact rounding/allocation examples.

### Admin catalog

| Method | Route | Access |
|---|---|---|
| GET | `/admin/products` | JWT + `CATALOG_READ` |
| GET | `/admin/products/{productId}` | JWT + `CATALOG_READ` |
| POST | `/admin/products` | JWT + `CATALOG_WRITE` |
| PATCH | `/admin/products/{productId}` | JWT + `CATALOG_WRITE` |
| GET | `/admin/catalog/meta` | JWT + `CATALOG_READ` |
| POST | `/admin/products/{productId}/images` | JWT + `CATALOG_WRITE`; multipart image files |
| DELETE | `/admin/products/{productId}/images/{imageId}` | JWT + `CATALOG_WRITE`; image must belong to Product |
| PATCH | `/admin/products/{productId}/images` | JWT + `CATALOG_WRITE`; reorder image IDs |
| POST, PATCH, DELETE | `/admin/categories`, `/admin/categories/{categoryId}` | JWT + `CATALOG_WRITE` |
| POST, PATCH, DELETE | `/admin/brands`, `/admin/brands/{brandId}` | JWT + `CATALOG_WRITE` |

Product create/update uses Product fields such as `parent_product_id`, `category_id`, `brand_id`, `name`, `slug`, `sku`, `selling_price`, `status`, descriptive attribute values and images according to the target DTO contract. A child is created/edited as a Product resource with its own Product ID, SKU, required selling price and inventory.

The target contract does not contain variant-creation/update routes or separate size-system/color-master routes. Do not add these routes or tables as a compatibility shortcut. Metadata read routes do not define Attribute/Option write APIs; those operations require a separately specified and approved API contract before implementation.

Image management uses the Product ID and the `PRODUCT_IMAGES` collection. Upload validates the entire request and image policy before persistence; every saved image reference must be version-stable/immutable for order history. Removal detaches an image from the current Product gallery but must not delete object/version content still referenced by any Order snapshot. Reorder validates ownership of every image ID and writes a unique, contiguous order atomically; a concurrent reorder must not create duplicate positions. Provider/database partial failures must be handled without losing existing Order image history.

### Admin Voucher management

| Method | Route | Access |
|---|---|---|
| GET | `/admin/vouchers` | JWT + RBAC-defined voucher-read permission |
| GET | `/admin/vouchers/{voucherId}` | JWT + RBAC-defined voucher-read permission |
| POST | `/admin/vouchers` | JWT + RBAC-defined voucher-write permission; creates DRAFT |
| PATCH | `/admin/vouchers/{voucherId}` | JWT + RBAC-defined voucher-write permission; no `usage_count` writes |

Target Voucher fields are `id, code, discount_type, discount_value, minimum_order_value, maximum_discount, starts_at, ends_at, usage_limit, usage_count, status`. FIXED `discount_value` is VND; PERCENT is integer basis points (100 bps=1%). `maximum_discount` is a VND cap. Normalize code by trim+uppercase; no Product/Category scope or per-account usage limit/ledger is supported. Detailed eligibility, `[starts_at, ends_at)` window, global quota and status semantics are in [P1.5](refactor-v2/p1/P1.5-pricing-voucher-contract.md).

An optional voucher code on quote/order is evaluated against pre-discount merchandise subtotal, excluding shipping. Quote only estimates current eligibility; it does not reserve or increment quota. Successful order placement consumes one global use atomically with Order and snapshot creation. P1.7 specifies one-time quota release for eligible cancellation from PENDING, CONFIRMED, PREPARING or DELIVERY_FAILED; refund/return does not release quota by default.
### Orders, COD and after-sales

| Method | Route | Access |
|---|---|---|
| GET | `/admin/orders` | JWT + `ORDER_READ` |
| GET | `/admin/orders/{orderId}` | JWT + `ORDER_READ` |
| POST | `/admin/orders/{orderId}/actions` | JWT + `ORDER_EDIT`; `CONFIRM`, `START_PREPARING`, `DISPATCH`, `MARK_DELIVERY_FAILED`, `RETRY_DELIVERY`, `CANCEL` |
| POST | `/admin/orders/{orderId}/payment-actions` | JWT + `ORDER_PAYMENT`; `COMPLETE_DELIVERY_AND_COLLECT_COD` only |
| POST | `/admin/orders/{orderId}/after-sales` | JWT + `ORDER_AFTER_SALES` + `ORDER_PAYMENT`; `RETURN_AND_REFUND_FULL` only |

The normative actor, precondition, state, side-effect and error matrix is [P1.7 Order/Payment Contract](refactor-v2/p1/P1.7-order-payment-contract.md). A new Order starts `PENDING`, its Payment starts COD/`UNPAID`, and its ShippingInfo starts `PENDING`. **No Inventory deduction is posted at placement**; `PENDING → CONFIRMED` rechecks and deducts stock atomically. Order-state mutation must use explicit action commands, not generic status PATCH. Manual COD collection is atomic with delivery completion; return is limited to one whole-order offline full refund.

`PATCH /api/v1/me/orders/{orderId}/recipient` is legacy-only and is not part of the target v1 API: the placed `ORDER_ADDRESSES` snapshot is immutable. No customer-side cancellation route, partial/multiple refund, item-level return/exchange flow, payment gateway, carrier API or dedicated Order timeline is included. Snapshot reads must use order-time Product, SKU, attribute, image, address, money and Voucher facts, not current catalog/address-book/Voucher values.

### Supplier, receiving and inventory

| Method | Route | Access |
|---|---|---|
| GET | `/admin/suppliers` | JWT + inventory-read permission |
| GET | `/admin/suppliers/{supplierId}` | JWT + inventory-read permission |
| POST, PATCH | `/admin/suppliers`, `/admin/suppliers/{supplierId}` | JWT + inventory-write permission |
| GET | `/admin/goods-receipts` | JWT + inventory-read permission |
| GET | `/admin/goods-receipts/{receiptId}` | JWT + inventory-read permission |
| POST, PATCH | `/admin/goods-receipts`, `/admin/goods-receipts/{receiptId}` | JWT + inventory-write permission |
| POST | `/admin/goods-receipts/{receiptId}/actions` | JWT + inventory-write permission; confirm/cancel commands |
| GET | `/admin/inventory` | JWT + inventory-read permission |
| POST | `/admin/inventory/adjustments` | JWT + inventory-write permission |
| GET | `/admin/inventory/transactions` | JWT + inventory-read permission |

Receipt line and inventory requests identify Products, not option combinations. The v1 server resolves exactly one operational ACTIVE warehouse; callers cannot select an arbitrary warehouse. Missing or ambiguous resolution fails closed.

Receipt lines use `product_id`, positive `quantity_received` and non-negative integer-VND `unit_cost`. Receipt states are DRAFT/CONFIRMED/CANCELLED: only DRAFT is editable; CONFIRM requires at least one valid line and posts one positive GOODS_RECEIPT movement per line; CANCEL is DRAFT-only and has no stock effect. Receipt state, balance/version, ledger and required audit commit atomically. Confirmed receipts and lines are immutable; corrections use a new authorized movement.

Inventory uses balance key `(warehouse_id, product_id)`. A missing row reads as quantity 0/version 0. `version` is read-only and increments once per committed non-zero movement. Only OPENING, GOODS_RECEIPT, ORDER, ORDER_CANCEL_REVERSAL, RETURN_RESTOCK and ADJUSTMENT are accepted. Type/sign/source/actor/reversal, semantic deduplication and lock order are defined in [P1.4 Inventory Contract](refactor-v2/p1/P1.4-inventory-contract.md).

POST `/api/v1/admin/inventory/adjustments` requires non-zero `quantity_delta`, controlled `reason_code` and stable `source_operation_id`; it may accept `expected_version` as an optional precondition. Reuse the source operation ID across transport retries; same ID with a changed canonical command conflicts. Successful stock-changing commands update source state, balance/version, one matching immutable ledger movement and required audit atomically. Client-provided warehouse, actor, final balance, movement type and source fields are not authoritative.

### Staff, RBAC, audit, reports, content and customers

- Staff-account routes: `GET/POST /admin/staff-accounts`, `GET/PATCH /admin/staff-accounts/{accountId}`; all require SUPERADMIN. Create request includes `phone, full_name, email?, password (8–128 characters, not trimmed), role_ids[]`; SUPERADMIN sets the initial password, the server stores only its hash, and the response/log/audit never contain password/hash. New staff Accounts start `ACTIVE`.
- Access control: `GET /admin/access-control`; role detail: `GET /admin/roles/{roleId}`; role mutations use `POST/PATCH/DELETE /admin/roles` and permission mutations use `GET/POST/PATCH/DELETE /admin/permissions`. These routes require SUPERADMIN. Writes are owned by Account/RBAC and must atomically record required audit. The `SUPERADMIN` Role stays ACTIVE with every Permission; creating a Permission auto-grants it to SUPERADMIN. Seed-manifest Permissions return `SYSTEM_PERMISSION_PROTECTED`; custom Permission referenced by any non-SUPERADMIN Role returns `PERMISSION_IN_USE`. If only the SUPERADMIN system grant exists, remove it and delete the custom Permission atomically.
- `GET /admin/roles/{roleId}` returns `RoleDetailDto(role, permissions[])` so administrators can inspect current grants before editing. `PATCH /admin/roles/{roleId}` accepts `name?, description?, status?, permission_ids?`: omitted retains; `description: null` clears it; null for `name`/`status`/`permission_ids` is rejected. `permission_ids` omitted retains grants, `[]` clears, and a non-empty list replaces all grants atomically with audit. Reject duplicate/missing IDs. For the `SUPERADMIN` Role, an explicit list must equal the full current Permission catalogue and its status remains ACTIVE. Creating any Permission adds its grant to SUPERADMIN atomically. `ROLES.code` and `PERMISSIONS.code` are immutable after creation.
- `ROLES.code` (≤80) and `PERMISSIONS.code` (≤120) are required unique technical keys and immutable after creation. Role status is `ACTIVE|INACTIVE`; inactive roles cannot be newly assigned or contribute effective permission grants. `RolePatchRequest.description: null` clears description; omitted means retain. Permission has no status column in the target model; `PermissionPatchRequest.description: null` clears description.
- Assignment/grant writes validate all referenced IDs, prevent duplicate composite-key grants and enforce the last-SUPERADMIN invariant under concurrency. Never delete system roles (`CUSTOMER`, `ADMIN`, `SUPERADMIN`). The `SUPERADMIN` Role stays ACTIVE and must retain every Permission grant; creating a Permission adds its `ROLE_PERMISSIONS` link to SUPERADMIN atomically. Seed-manifest Permissions cannot be deleted (`SYSTEM_PERMISSION_PROTECTED`). A custom Permission cannot be deleted while granted to any non-SUPERADMIN role (`PERMISSION_IN_USE`); if it is only granted to SUPERADMIN, remove that system grant and delete it atomically. Permission has no `status` column.
- Error codes remain stable and the existing global error wrapper is preserved. The Account/RBAC code mapping is documented in `docs/refactor-v2/p1/P1.2-account-address-rbac-contract.md`; it does not claim runtime behavior is already implemented.
- Audit: `GET /admin/audit-logs` with approved actor/action/entity/time filters and pagination; requires `AUDIT_READ`. DTO fields map to existing `AUDIT_LOGS` columns and are redacted before serialization. Actor, correlation, atomicity, append-only and redaction policy is normative in [P1.8](refactor-v2/p1/P1.8-operations-seed-contract.md).
- Reporting (all routes require JWT + `REPORT_READ`); source tables, current-state/date basis, timezone, period boundaries, zero-fill and deterministic product ranking are normative in [P1.8](refactor-v2/p1/P1.8-operations-seed-contract.md). P1.5/P1.7 continue to own money and Order/Payment/return semantics:
  - `GET /admin/reports/overview?from=...&to=...` returns the overview aggregates defined in the DTO contract.
  - `GET /admin/reports/sales-trend?from=...&to=...&granularity=DAY|WEEK|MONTH` returns completed sales, returned adjustment and net sales per period.
  - `GET /admin/reports/orders-trend?from=...&to=...&granularity=DAY|WEEK|MONTH` returns total Orders and counts for every approved Order status per period.
  - `GET /admin/reports/product-performance?from=...&to=...&limit=...` returns Product-level completed, returned and net units; limit defaults to 10 and is constrained to 1–100.
  - Reporting uses Asia/Ho_Chi_Minh date boundaries and current Order state/approved completion/return accounting rules; currency amounts are integer VND and ranking/tie-break rules must be deterministic.
- Content: public `GET /content-pages/{slug}` returns only `PUBLISHED`; missing, `DRAFT` and `ARCHIVED` return the same 404 behavior. Admin reads require `CONTENT_READ`; create/update/status changes require `CONTENT_WRITE`. The `DRAFT/PUBLISHED/ARCHIVED` transition matrix, slug validation, public/admin DTO exposure and atomic audit rules are normative in [P1.8](refactor-v2/p1/P1.8-operations-seed-contract.md). Ordinary removal archives a page; no hard-delete/purge route is introduced.
- Customers: `GET /admin/customers` and `GET /admin/customers/{customerId}`; customer records derive from authenticated Accounts and their linked Orders, not synthetic guest identities.

## 3. Wire and persistence invariants

- `product_id` is the Product identity on Cart lines, Order lines, goods receipt lines, inventory balances and ledger movements.
- Monetary fields are integer VND. No client-supplied total, unit price, discount, stock balance, workflow state or account scope is authoritative.
- A quote has no durable identifier. Order placement rechecks all relevant inputs in its own transaction.
- Order snapshots must not be rewritten by later catalog, account-address or voucher changes.
- Do not expose CRUD routes for concepts outside the target schema. Retire routes that rely on removed persistence concepts rather than inventing replacement tables.
- Exact request/response fields and mutation semantics must agree with docs/05-dto-contract.md. Any still-open API detail is listed in docs/12-tbd-out-of-scope.md; do not infer it from the old runtime.


## P1.3 target Product / metadata conformance

The target Product model is row-based, not variant-based. Every Product has a generated Product ID, unique required SKU, required whole-VND selling price, row-owned nullable category/brand references and explicit nullable descriptive fields. Parent-child depth is one; no row implicitly supplies another row's values. See [P1.3 Catalog Metadata Contract](refactor-v2/p1/P1.3-catalog-metadata-contract.md) for hierarchy, validation, filters, image ordering and breaking changes.

Attribute filter query parameters:
- **attribute_filters[ATTRIBUTE_CODE]=value** applies typed equality for OPTION (using an option value belonging to that Attribute), TEXT or BOOLEAN.
- **attribute_min[ATTRIBUTE_CODE]** and **attribute_max[ATTRIBUTE_CODE]** apply only to NUMBER attributes.
- Unknown codes, wrong types/operators and conflicting bounds fail validation; different Attribute predicates combine with AND. is_variant_defining never changes filtering into Product generation.

Image gallery writes are Product-scoped and atomic. Positions are contiguous from zero; position zero is the single primary image whenever the gallery is non-empty. Order-time image snapshots refer to stable immutable object/version content; numeric retention and legal deletion exceptions remain P1.8 decisions.

Admin Attribute/Option write routes use CATALOG_WRITE: POST/PATCH /admin/catalog/attributes and /admin/catalog/attributes/{attributeId}, plus POST/PATCH /admin/catalog/attributes/{attributeId}/options and /admin/catalog/attributes/{attributeId}/options/{optionId}. Attribute type kinds are controlled lookup data; Attribute/Option DELETE routes are intentionally undefined until P1.8 resolves lifecycle.
