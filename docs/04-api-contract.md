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

## 2. Target route groups

### Authentication and account

| Method | Route | Access |
|---|---|---|
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| GET, PATCH | `/me` | JWT |
| POST | `/me/addresses` | JWT |
| PATCH, DELETE | `/me/addresses/{addressId}` | JWT |
| GET | `/me/orders` | JWT |
| GET | `/me/orders/{orderId}` | JWT |

Account addresses are mutable account-owned records. An Order's `ORDER_ADDRESSES` row is an immutable order-time snapshot; APIs must not rewrite it after placement. Do not offer an Order-recipient mutation route that changes the snapshot.

### Public catalog and authenticated Cart/checkout

| Method | Route | Access | Contract |
|---|---|---|---|
| GET | `/catalog/products` | Public | Product search/list; supported filters must be explicitly defined against Product fields and approved attribute behavior. |
| GET | `/catalog/products/{productId}` | Public | Product detail and descriptive attribute values. |
| GET | `/catalog/meta` | Public | Product-facing metadata definitions/options, with deterministic ordering. |
| GET | `/cart` | JWT | Resolve the authenticated account's current Cart as the most recently updated Cart, with a deterministic Cart-ID tie-break; monetary fields are server-derived. Do not assume one-active-Cart uniqueness or merge multiple Carts. |
| POST | `/cart/items` | JWT | Request contains `product_id` and positive `quantity`. |
| PATCH | `/cart/items/{cartItemId}` | JWT | Update positive quantity on the caller's own line. |
| DELETE | `/cart/items/{cartItemId}` | JWT | Remove the caller's own line. |
| DELETE | `/cart` | JWT | Clear Cart items; Cart ownership remains with the account. |
| POST | `/checkout/quote` | JWT | Return a stateless/advisory quote; no persistent quote ID, stock reservation or voucher side effect. |
| POST | `/orders` | JWT | Re-read and reprice current state; atomically place the order using account-scoped idempotency. |

A Cart line identifies one Product row. Use `product_id` consistently through Cart, quote, order line, receiving and inventory requests. Product parent/child structure is explicit; metadata never creates Products.

Order creation revalidates Product status, price, stock, voucher quota and server-owned shipping input. Same account-scoped idempotency key plus the same canonical payload replays the committed result; a changed payload returns a typed conflict. The exact transport location of the key must be frozen before implementation.

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

### Orders, COD and after-sales

| Method | Route | Access |
|---|---|---|
| GET | `/admin/orders` | JWT + `ORDER_READ` |
| GET | `/admin/orders/{orderId}` | JWT + `ORDER_READ` |
| PATCH | `/admin/orders/{orderId}` | JWT + `ORDER_EDIT`; only approved non-snapshot fields/commands |
| POST | `/admin/orders/{orderId}/actions` | JWT + action-specific permission |
| POST | `/admin/orders/{orderId}/after-sales` | JWT + `ORDER_AFTER_SALES`; `RETURN` only in v1 |

Order-time Product, address, voucher, money, COD Payment and image facts are immutable historical facts. v1 supports COD, manual shipping and at most one full refund per order; partial/multiple refunds and detailed item-level return/exchange flows are outside the target scope. State, Payment, inventory and audit changes follow the atomic transaction rules in docs/06 and docs/07.

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

Receipt line and inventory requests identify Products, not option combinations. The v1 server resolves the single operational warehouse; callers cannot select an arbitrary warehouse. Adjustments require a non-zero delta and a reason code. A successful command atomically updates source state, Product stock, the ledger and required audit.

### Staff, RBAC, audit, reports, content and customers

- Staff-account routes: `GET/POST /admin/staff-accounts`, `GET/PATCH /admin/staff-accounts/{accountId}`; access requires the approved SUPERADMIN policy.
- Access control: `GET /admin/access-control`; role and permission management routes under `/admin/roles` and `/admin/permissions`; writes use the owning account/RBAC service, audit changes and preserve the last-SUPERADMIN invariant.
- Audit: `GET /admin/audit-logs` with approved actor/action/entity/time filters and pagination. DTO fields must map to the target audit columns; do not expose secrets or sensitive payloads.
- Reporting (all routes require JWT + `REPORT_READ`):
  - `GET /admin/reports/overview?from=...&to=...` returns the overview aggregates defined in the DTO contract.
  - `GET /admin/reports/sales-trend?from=...&to=...&granularity=DAY|WEEK|MONTH` returns completed sales, returned adjustment and net sales per period.
  - `GET /admin/reports/orders-trend?from=...&to=...&granularity=DAY|WEEK|MONTH` returns total Orders and counts for every approved Order status per period.
  - `GET /admin/reports/product-performance?from=...&to=...&limit=...` returns Product-level completed, returned and net units; limit defaults to 10 and is constrained to 1–100.
  - Reporting uses Asia/Ho_Chi_Minh date boundaries and current Order state/approved completion/return accounting rules; currency amounts are integer VND and ranking/tie-break rules must be deterministic.
- Content: public `GET /content-pages/{slug}`; admin list/create/update routes under `/admin/content-pages`. Use target `slug` and status semantics.
- Customers: `GET /admin/customers` and `GET /admin/customers/{customerId}`; customer records derive from authenticated Accounts and their linked Orders, not synthetic guest identities.

## 3. Wire and persistence invariants

- `product_id` is the Product identity on Cart lines, Order lines, goods receipt lines, inventory balances and ledger movements.
- Monetary fields are integer VND. No client-supplied total, unit price, discount, stock balance, workflow state or account scope is authoritative.
- A quote has no durable identifier. Order placement rechecks all relevant inputs in its own transaction.
- Order snapshots must not be rewritten by later catalog, account-address or voucher changes.
- Do not expose CRUD routes for concepts outside the target schema. Retire routes that rely on removed persistence concepts rather than inventing replacement tables.
- Exact request/response fields and mutation semantics must agree with docs/05-dto-contract.md. Any still-open API detail is listed in docs/12-tbd-out-of-scope.md; do not infer it from the old runtime.
