# 05 — JWT, JSON, DTO & Request/Response Contract

> **ERD v2 compatibility boundary (2026-10-22):** This file describes the existing API/DTO contract. The owner-confirmed target schema changes persistence identity and omits some baseline fields, but does not automatically authorize DTO or endpoint changes. Document and test every snapshot-field/ID compatibility decision before changing response shapes.


## 1. JWT minimum

- Public: `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/catalog/**`, `/api/v1/content-pages/**`.
- Authenticated: `/api/v1/me/**`, `/api/v1/admin/**` with `Authorization: Bearer <access_token>`.
- Minimum token claims: `sub = account_id`, `iat`, `exp`.
- Business actor for authenticated commands is server-derived from `JWT.sub`.
- Do not add a refresh endpoint: baseline only locks access-token login.

## 2. API envelopes

```json
{ "data": {} }
```

List:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 0,
    "total_pages": 0
  }
}
```

Pagination defaults: page 1, page_size 20, maximum 100.

Type convention: ID `int64`; quantity integer; money follows DB-10 as integer VND (whole VND units); date `YYYY-MM-DD`; timestamp ISO-8601. This is an owner decision, but physical SQL/JPA and every dependent DTO still require reconciliation with decimal-labelled ERD fields before freeze.

PATCH: omitted field means unchanged. `null` may clear a field only where the field is nullable and the specific API permits it.

## 3. Server-derived fields

Never trust/accept these from clients unless a source explicitly makes them configurable input:

- generated IDs/codes;
- password hash;
- actor account ID;
- timestamps;
- workflow state transitions;
- cart subtotal;
- checkout/order subtotal, discount, shipping fee and total;
- effective price;
- availability.

## 4. Core DTO inventory

### account/RBAC

`PaginationMeta(page,page_size,total,total_pages)`

`AccountDto(account_id,phone?,email?,created_at,updated_at)`

`AddressDto(address_id,address_text,created_at)`

`RoleDto(role_id,code,name,description?)`

`PermissionDto(permission_id,code,name)`

`RoleDetailDto(role_id,code,name,description?,permissions[])`

`MeDto(account,addresses[],roles[],permissions[])`

`StaffAccountSummaryDto(account,roles[])`

`StaffAccountDetailDto(account,roles[],permissions[])`

`AccessControlDto(roles[],permissions[])`

### product/catalog

`CategoryDto(category_id,parent_category_id?,name)`

`BrandDto(brand_id,name)`

`SizeValueDto(size_value_id,size_system_id,code,display_name,sort_order)`

`SizeSystemDto(size_system_id,code,name,size_values[])`

`ColorDto(color_id,code,name)`

`ProductImageDto(image_id,image_url,alt_text?,sort_order)`

`ProductImageInput(image_url,alt_text?,sort_order)` — used by Product PATCH image replacement only; `sort_order` is required.

`ProductVariantDto(variant_id,size,color,sku?,effective_price,sale_status,available_quantity)`

`ProductSummaryDto(product_id,name,thumbnail?,category,brand?,base_price,sale_status,material_care?,sizes[])`

`ProductDetailDto(product_id,name,description?,category,brand?,size_system,gender?,season?,style?,material_care?,base_price,sale_status,images[],variants[])`

`AdminProductSummaryDto(product_id,name,thumbnail?,category_id,brand_id?,size_system_id,base_price,sale_status,created_at,updated_at)`

API #11 addendum (2026-10-10): `material_care` is the managed Product field verbatim,
including care instructions; it is not a separate extracted material name. `sizes` contains
unique SizeValueDto values from ON_SALE variants, ordered by `sort_order`, then `size_value_id`.
It covers all selling variants of each returned Product, independently of filter matches and stock.
The page query already restricts Products to ON_SALE with an ON_SALE variant. Empty lists remain
arrays. Existing `base_price` and detail effective-price semantics remain unchanged.

`AdminVariantDto(variant_id,product_id,size_value_id,color_id,sku?,override_price?,sale_status,available_quantity,created_at,updated_at)`

`CatalogMetaDto(categories[],brands[],size_systems[],colors[],genders[],seasons[],styles[])`; last three are derived from managed catalog values.

The nullable Product summary `thumbnail` is live presentation data resolved from the ProductImage at `sort_order = 0`. A Product with no image returns `thumbnail = null`. Detail `images[]` remains the complete image collection ordered by `sort_order`.

### cart/checkout/order

`CartItemDto(cart_item_id,variant_id,quantity,product_name,image_url?,size,color,unit_price,line_total,available_quantity)`

> **ERD v2 compatibility gap:** `variant_id` and the cart's nullable `image_url` belong to the current/legacy API contract. Target CartItems point to `product_id` and do not persist variant identity; DB-01 must approve the public-ID adaptation before the target contract is frozen. Cart images are live presentation data resolved from the current Product cover, not a Cart snapshot.

`CartDto(cart_id?,account_id?,items[],subtotal,created_at?,updated_at?)` — for an authenticated account without a persisted cart, return the same fields with null cart ID/timestamps, an empty item list and zero subtotal; GET does not create a cart.

`VoucherDto(voucher_id,code)` — do not add rule fields.

`CheckoutQuoteDto(items[],subtotal,discount,shipping_fee,total,voucher?)` — proposed as a non-persistent, advisory calculation; order placement must recalculate all values from current server-side state. No durable quote ID/reservation is implied by the target ERD.

`RecipientDto(phone,email?,address)`

`OrderItemDto(order_item_id,variant_id,product_name,image_url?,sku?,size,color,unit_price,quantity,line_total)` — `image_url?` is part of the legacy snapshot contract; the target storage gap is tracked under DB-07 below.

`PaymentPublicDto(payment_status,amount_due,amount_received,amount_refunded)`

`PaymentAdminDto` adds collection/refund actor/time.

`ShippingInfoDto(delivery_mode,carrier_name?)`

`OrderSummaryDto(order_id,order_code,order_status,payment_status,image_url?,total,created_at,completed_at?,returned_at?)`

`OrderConfirmationDto(order_id,order_code,PENDING,payment,subtotal,discount,shipping_fee,total,recipient,created_at)`

`OrderCustomerDetailDto`: recipient + items + money + payment + shipping + lifecycle timestamps.

`OrderAdminDetailDto`: customer/voucher references, service note, cancel reason, admin payment and `allowed_actions` derived from state + permission.

Order image fields are historical in the current/legacy contract: `OrderItemDto.image_url` comes from `order_items.image_url_snapshot`, and `OrderSummaryDto.image_url` comes from the first OrderItem snapshot by smallest `order_item_id`. Historical Order reads must not query the current Product gallery; existing null snapshots remain null rather than being backfilled from current catalog state.

> **ERD v2 compatibility gap (DB-07):** the owner-confirmed target ERD does not contain `ORDER_ITEMS.image_url_snapshot`. This is a deliberate contract blocker, not permission to add the column silently. The owner must either approve an ERD amendment or explicitly accept that Order history has no persisted image guarantee. Until then, preserve the existing source contract as evidence and do not claim it is implementable against target schema.
### inventory/audit/report/content

`SupplierDto`, `GoodsReceiptItemDto`, `GoodsReceiptSummaryDto`, `GoodsReceiptDetailDto`, `InventoryRowDto`, `InventoryTransactionDto`, `AuditLogDto`, `ReportOverviewDto`, `PublicContentPageDto`, `ContentPageDto`, `CustomerSummaryDto`, `CustomerDetailDto` follow the fields in Analyst API Appendix A; do not expose persistence-only secrets.

## 5. High-risk request contracts

### Register

`phone?`, `email?`, `password` required. Login identifier/uniqueness/verification policy is still physical-design TBD. Never accept `role` or `account_id` from public registration.

### Login

`identifier`, `password` -> access token + AccountDto. Do not infer whether identifier is phone/email/both until physical design/repo configuration locks it.

### Add/update cart item

`variant_id`, `quantity > 0`; quantity zero is not delete.

### Checkout quote/create Order

Receiver phone/address required, email optional, voucher code optional. Server owns all totals/state/snapshots.

### Product create — Phase 10 breaking contract

**Legacy/current source contract (not yet the ERD v2 target contract):** required fields are category, SizeSystem, name, base price and sale status. Optional Product metadata and nested variants follow the source request DTO. Validate the source-model leaf Category and SizeSystem/SizeValue relationship before the target mapping is changed.

> **ERD v2 compatibility gap (DB-01/02):** the target has no SizeSystem, SizeValue, Color or ProductVariant table. The target API must map the current concepts to parent/child Products and typed attributes, or obtain an explicit owner-approved contract amendment. Do not add the legacy tables back implicitly.

`POST /api/v1/admin/products` is JSON-only and does **not** accept an image collection or multipart files. The old JSON `images[]` and multipart create representations are intentionally removed. Create Product first, then use the dedicated binary image-upload command.

### Product binary image upload

`POST /api/v1/admin/products/{productId}/images` consumes `multipart/form-data` with one or more repeated `images` file parts. The backend validates all files, uploads them through the Product-owned storage gateway and persists provider-returned direct URLs. Files are appended to the current collection; the first image of an image-less Product gets `sort_order = 0`.

### Product PATCH image replacement

`PATCH /api/v1/admin/products/{productId}` may include an authoritative `images: ProductImageInput[]` collection:

- field omitted -> preserve current collection;
- field present -> replace the entire collection;
- `images: []` -> remove all Product images;
- each item requires `image_url` and `sort_order`; `alt_text` is optional/nullable;
- `sort_order` must be unique, non-negative and contiguous `0..n-1`; `0` is the cover.

This URL-based replacement is distinct from binary upload and is not a compatibility path for Product creation. Provider credentials remain backend-only; provider-side remote deletion/compensation is unsupported unless the provider exposes a verified contract.

### Inventory adjustment

`variant_id`, non-zero `quantity_delta`, non-empty `reason`; server derives adjustment direction and actor.

## 6. Error contract warning

Analyst Docs require understandable business errors with no technical leakage, but do not lock a specific JSON error envelope/status-code matrix. Implement centralized exception handling according to the existing repository contract; do not invent a public error schema and declare it baseline without an explicit decision.

## 7. Phase 7 Appendix A details

Transcribed field contracts from the current consolidated API (checked 2026-09-27):

| API | DTO | Fields |
|---|---|---|
| #70 | AuditLogDto | audit_id, actor_account_id, action, target_type, target_id (string), description?, created_at |
| #72 | PublicContentPageDto | page_code, title, content, updated_at |
| #73–75 | ContentPageDto | page_id, page_code, title, content, updated_by_account_id, updated_at |
| #76 | CustomerSummaryDto | account_id, phone?, email?, order_count, last_order_at? |
| #77 | CustomerDetailDto | account: AccountDto, addresses: AddressDto[], orders: OrderSummaryDto[] |

#70 filters: actor_account_id, action, target_type, target_id, from, to, page, page_size. #76 filters: q, page, page_size. Both return data plus PaginationMeta.

#73 specifically returns the full small content-page list as `{data: ContentPageDto[]}` without paging parameters. #74 requires page_code/title/content. #75 accepts only optional title/content, neither nullable; page_code stays stable. Public content never includes the internal page ID or actor ID.

#71 requires from/to dates and returns ReportOverviewDto: from, to, completed_sales, returned_adjustment, net_sales and orders_by_status. The user-approved formulas, Vietnam timezone and completion/creation date bases are documented in docs/15 (2026-09-28). orders_by_status maps all eight baseline status codes to integer counts.
