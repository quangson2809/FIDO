# 04 — API Contract Baseline (77 Endpoints)

## 1. Global contract

- Current consolidated Analyst API baseline: **77 endpoints**.
- URL version prefix: `/api/v1`.
- JSON field naming: `snake_case`.
- Public: auth register/login, catalog public, content public.
- `/api/v1/me/**` and `/api/v1/admin/**`: Bearer JWT.
- Cart/checkout/order support guest intent, but guest session identity/security is still TBD; do not invent it.
- List/search/filter are deliberately consolidated through query parameters; do not split them into extra endpoints.
- State-changing commands are deliberately separate from ordinary PATCH where transaction/state-machine semantics matter.

## 2. Baseline endpoint map

| # | Method | URL | Owner module | Access |
|---:|---|---|---|---|
| 1 | `POST` | `/api/v1/auth/register` | `account` | Public |
| 2 | `POST` | `/api/v1/auth/login` | `account` | Public |
| 3 | `GET` | `/api/v1/me` | `account` | JWT |
| 4 | `PATCH` | `/api/v1/me` | `account` | JWT |
| 5 | `POST` | `/api/v1/me/addresses` | `account` | JWT |
| 6 | `PATCH` | `/api/v1/me/addresses/{addressId}` | `account` | JWT |
| 7 | `DELETE` | `/api/v1/me/addresses/{addressId}` | `account` | JWT |
| 8 | `GET` | `/api/v1/me/orders` | `account/order` | JWT |
| 9 | `GET` | `/api/v1/me/orders/{orderId}` | `account/order` | JWT |
| 10 | `PATCH` | `/api/v1/me/orders/{orderId}/recipient` | `order` | JWT |
| 11 | `GET` | `/api/v1/catalog/products` | `product` | Public |
| 12 | `GET` | `/api/v1/catalog/products/{productId}` | `product` | Public |
| 13 | `GET` | `/api/v1/catalog/meta` | `product` | Public |
| 14 | `GET` | `/api/v1/cart` | `cart` | JWT optional / guest TBD |
| 15 | `POST` | `/api/v1/cart/items` | `cart` | JWT optional / guest TBD |
| 16 | `PATCH` | `/api/v1/cart/items/{cartItemId}` | `cart` | JWT optional / guest TBD |
| 17 | `DELETE` | `/api/v1/cart/items/{cartItemId}` | `cart` | JWT optional / guest TBD |
| 18 | `DELETE` | `/api/v1/cart` | `cart` | JWT optional / guest TBD |
| 19 | `POST` | `/api/v1/checkout/quote` | `order` | JWT optional; voucher requires JWT |
| 20 | `POST` | `/api/v1/orders` | `order` | JWT optional / guest TBD |
| 21 | `GET` | `/api/v1/admin/orders` | `order` | JWT + permission |
| 22 | `GET` | `/api/v1/admin/orders/{orderId}` | `order` | JWT + permission |
| 23 | `PATCH` | `/api/v1/admin/orders/{orderId}` | `order` | JWT + permission |
| 24 | `POST` | `/api/v1/admin/orders/{orderId}/actions` | `order` | JWT + permission |
| 25 | `POST` | `/api/v1/admin/orders/{orderId}/payment-actions` | `order` | JWT + permission |
| 26 | `POST` | `/api/v1/admin/orders/{orderId}/after-sales` | `order` | JWT + permission |
| 27 | `GET` | `/api/v1/admin/products` | `product` | JWT + permission |
| 28 | `GET` | `/api/v1/admin/products/{productId}` | `product` | JWT + permission |
| 29 | `POST` | `/api/v1/admin/products` | `product` | JWT + permission |
| 30 | `PATCH` | `/api/v1/admin/products/{productId}` | `product` | JWT + permission |
| 31 | `POST` | `/api/v1/admin/products/{productId}/variants` | `product` | JWT + permission |
| 32 | `PATCH` | `/api/v1/admin/products/{productId}/variants/{variantId}` | `product` | JWT + permission |
| 33 | `GET` | `/api/v1/admin/catalog/meta` | `product` | JWT + permission |
| 34 | `POST` | `/api/v1/admin/categories` | `product` | JWT + permission |
| 35 | `PATCH` | `/api/v1/admin/categories/{categoryId}` | `product` | JWT + permission |
| 36 | `DELETE` | `/api/v1/admin/categories/{categoryId}` | `product` | JWT + permission |
| 37 | `POST` | `/api/v1/admin/brands` | `product` | JWT + permission |
| 38 | `PATCH` | `/api/v1/admin/brands/{brandId}` | `product` | JWT + permission |
| 39 | `DELETE` | `/api/v1/admin/brands/{brandId}` | `product` | JWT + permission |
| 40 | `POST` | `/api/v1/admin/size-systems` | `product` | JWT + permission |
| 41 | `PATCH` | `/api/v1/admin/size-systems/{sizeSystemId}` | `product` | JWT + permission |
| 42 | `DELETE` | `/api/v1/admin/size-systems/{sizeSystemId}` | `product` | JWT + permission |
| 43 | `POST` | `/api/v1/admin/colors` | `product` | JWT + permission |
| 44 | `PATCH` | `/api/v1/admin/colors/{colorId}` | `product` | JWT + permission |
| 45 | `DELETE` | `/api/v1/admin/colors/{colorId}` | `product` | JWT + permission |
| 46 | `GET` | `/api/v1/admin/suppliers` | `inventory` | JWT + permission |
| 47 | `GET` | `/api/v1/admin/suppliers/{supplierId}` | `inventory` | JWT + permission |
| 48 | `POST` | `/api/v1/admin/suppliers` | `inventory` | JWT + permission |
| 49 | `PATCH` | `/api/v1/admin/suppliers/{supplierId}` | `inventory` | JWT + permission |
| 50 | `GET` | `/api/v1/admin/goods-receipts` | `inventory` | JWT + permission |
| 51 | `GET` | `/api/v1/admin/goods-receipts/{receiptId}` | `inventory` | JWT + permission |
| 52 | `POST` | `/api/v1/admin/goods-receipts` | `inventory` | JWT + permission |
| 53 | `PATCH` | `/api/v1/admin/goods-receipts/{receiptId}` | `inventory` | JWT + permission |
| 54 | `POST` | `/api/v1/admin/goods-receipts/{receiptId}/actions` | `inventory` | JWT + permission |
| 55 | `GET` | `/api/v1/admin/inventory` | `inventory` | JWT + permission |
| 56 | `POST` | `/api/v1/admin/inventory/adjustments` | `inventory` | JWT + permission |
| 57 | `GET` | `/api/v1/admin/inventory/transactions` | `inventory` | JWT + permission |
| 58 | `GET` | `/api/v1/admin/staff-accounts` | `account` | JWT / Admin |
| 59 | `GET` | `/api/v1/admin/staff-accounts/{accountId}` | `account` | JWT / Admin |
| 60 | `POST` | `/api/v1/admin/staff-accounts` | `account` | JWT / Admin |
| 61 | `PATCH` | `/api/v1/admin/staff-accounts/{accountId}` | `account` | JWT / Admin |
| 62 | `GET` | `/api/v1/admin/access-control` | `account` | JWT / Admin |
| 63 | `POST` | `/api/v1/admin/roles` | `account` | JWT / Admin |
| 64 | `PATCH` | `/api/v1/admin/roles/{roleId}` | `account` | JWT / Admin |
| 65 | `DELETE` | `/api/v1/admin/roles/{roleId}` | `account` | JWT / Admin |
| 66 | `GET` | `/api/v1/admin/permissions` | `account` | JWT / Admin |
| 67 | `POST` | `/api/v1/admin/permissions` | `account` | JWT / Admin |
| 68 | `PATCH` | `/api/v1/admin/permissions/{permissionId}` | `account` | JWT / Admin |
| 69 | `DELETE` | `/api/v1/admin/permissions/{permissionId}` | `account` | JWT / Admin |
| 70 | `GET` | `/api/v1/admin/audit-logs` | `audit` | JWT + permission |
| 71 | `GET` | `/api/v1/admin/reports/overview` | `report` | JWT / Admin |
| 72 | `GET` | `/api/v1/content-pages/{pageCode}` | `content` | Public |
| 73 | `GET` | `/api/v1/admin/content-pages` | `content` | JWT + permission |
| 74 | `POST` | `/api/v1/admin/content-pages` | `content` | JWT + permission |
| 75 | `PATCH` | `/api/v1/admin/content-pages/{pageId}` | `content` | JWT + permission |
| 76 | `GET` | `/api/v1/admin/customers` | `account` | JWT + permission |
| 77 | `GET` | `/api/v1/admin/customers/{customerId}` | `account` | JWT + permission |

## 3. Important command semantics

### API #19 — Checkout quote

- Input: receiver phone/address, optional email, optional voucher code.
- Server revalidates cart, effective price and availability.
- Returns quote only; **must not create Order or deduct stock**.
- Voucher business rules are still yellow/TBD.

### API #20 — Create Order

- Client does not provide totals or workflow state.
- Server creates exactly one logical `PENDING` Order with OrderItem/receiver/money snapshots and Payment `UNPAID`.
- PENDING does not deduct stock.
- Retry/double-click dedupe implementation remains a physical/application design blocker; do not pretend it is solved without a locked mechanism.

### API #24 — Order actions

Documented actions include:

`CONFIRM | PREPARE | SHIP | DELIVERY_FAILED | RETRY_DELIVERY | CANCEL | COMPLETE | DELIVERY_RETURN_IN`

All actions must validate current state, permissions, side effects and idempotency in Service.

### API #25 — Payment actions

`COLLECT_COD | REFUND`. Payment status is separate from Order status; repeated requests must not double-count receipt/refund.

### API #26 — After-sales command

Operations: `RETURN | EXCHANGE_SIZE`. This is a command over Order/Payment/Inventory/Audit; do not create an `after_sales_cases` resource/table in baseline.

### API #54 — GoodsReceipt actions

`CONFIRM | CANCEL`; CONFIRM increments stock and creates InventoryTransaction exactly once.

## 4. Permission CRUD added in current consolidated contract

The latest API document includes #66–69:

- GET `/api/v1/admin/permissions` -> `PermissionDto[]`
- POST `/api/v1/admin/permissions` body: `code`, `name`
- PATCH `/api/v1/admin/permissions/{permissionId}`: optional `code`, `name`; omitted fields unchanged
- DELETE `/api/v1/admin/permissions/{permissionId}`: only when no Role references the Permission

Do not use the older 73-endpoint numbering as current baseline.
