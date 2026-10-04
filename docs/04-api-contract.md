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

The two Product-image commands below are project-owner refinements added after the consolidated 77-endpoint Analyst baseline. They preserve the global `/api/v1/admin` prefix and `CATALOG_WRITE` authorization convention; they are not renumbered into the historical 77-endpoint table.

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

### API #29 — Product creation with images

The project owner approved a backward-compatible physical transport refinement on 2026-10-03:

- `application/json` remains supported exactly as the consolidated contract defines, including optional `images[{image_url,alt_text?}]`.
- The same URL may also consume `multipart/form-data` for the admin UI. The `product` part carries the JSON metadata/variants and the optional repeated `images` part carries local image files.
- Multipart image files are uploaded by the backend to the configured image-storage provider; provider credentials never leave the backend. The resulting **full direct URL** is persisted in `product_images.image_url`.
- `product_images.sort_order` is a technical gallery-order field. Product creation assigns `0..n-1` from the request/upload sequence; the create payload does not accept client-supplied sort positions.
- File upload occurs outside the database transaction; the database product/image/variant write starts only after all requested uploads succeed.
- Provider-side delete/compensation is not claimed unless a supported provider delete contract is available. A failed database write after successful remote upload can therefore leave a remote orphan and must remain an explicit integration limitation rather than a hidden transaction guarantee.

### Product image read semantics — project-owner refinement 2026-10-04

- `ProductDetailDto`/`AdminProductDetailDto` return the full `images[]` collection in ascending `sort_order`.
- Public/admin product summaries, cart items and order items expose nullable `image_url` for presentation.
- The representative/cover presentation image is the ProductImage at `sort_order = 0`. A Product with no images has no representative image and resolves presentation `image_url` to `null` where nullable.
- Product image ordering is catalog presentation state; historical OrderItem snapshots remain authoritative and are not rewritten by later catalog edits.

### Product image remove command — project-owner refinement 2026-10-04

`DELETE /api/v1/admin/products/{productId}/images/{imageId}`

- Requires catalog write authorization.
- `imageId` must belong to `productId`; missing or foreign image identity is treated as not found for that Product.
- Remove the `product_images` row from the catalog only. Do **not** invoke provider-side remote delete in this command.
- Remaining image positions are compacted to contiguous `0..n-1` in the same transaction. Removing the cover therefore promotes the next image to `sort_order = 0`.
- The current requirement does not define a minimum image count; removing the last image is valid and leaves the Product with zero images.
- Success returns HTTP `204 No Content`.

### Product image reorder command — project-owner refinement 2026-10-04

`PATCH /api/v1/admin/products/{productId}/images`

Request:

```json
{
  "images": [
    {"image_id": 13, "sort_order": 0},
    {"image_id": 11, "sort_order": 1}
  ]
}
```

- Requires catalog write authorization.
- The request may include all or a subset of the Product's current images. Unspecified images retain their current `sort_order`; after requested changes are applied, the complete resulting order must still be unique and contiguous `0..n-1`.
- An image that does not belong to the Product is not found; duplicate image entries, duplicate resulting positions or gaps are conflicts.
- Reorder is one database transaction. The implementation must preserve `UNIQUE(product_id, sort_order)` while changing positions and must not expose an intermediate duplicate ordering such as `0,0,2`.
- The response uses the existing object envelope with the updated `AdminProductDetailDto`; its `images[]` sequence reflects the persisted order.

### API #54 — GoodsReceipt actions

`CONFIRM | CANCEL`; CONFIRM increments stock and creates InventoryTransaction exactly once.

## 4. Permission CRUD added in current consolidated contract

The latest API document includes #66–69:

- GET `/api/v1/admin/permissions` -> `PermissionDto[]`
- POST `/api/v1/admin/permissions` body: `code`, `name`
- PATCH `/api/v1/admin/permissions/{permissionId}`: optional `code`, `name`; omitted fields unchanged
- DELETE `/api/v1/admin/permissions/{permissionId}`: only when no Role references the Permission

Do not use the older 73-endpoint numbering as current baseline.
