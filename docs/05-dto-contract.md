# 05 — JWT, JSON, DTO & Request/Response Contract

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

Paginated list:

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

Specific non-paginated collection contracts override the generic paginated-list convention. In the current baseline, API #66 returns `{data: PermissionDto[]}` and API #73 returns `{data: ContentPageDto[]}` with no `meta` object.

Type convention: ID `int64`; quantity integer; money decimal; date `YYYY-MM-DD`; timestamp ISO-8601.

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

`ProductSummaryDto(product_id,name,thumbnail?,category,brand?,base_price,sale_status)`

`ProductDetailDto(product_id,name,description?,category,brand?,size_system,gender?,season?,style?,material_care?,base_price,sale_status,images[],variants[])`

`AdminProductSummaryDto(product_id,name,thumbnail?,category_id,brand_id?,size_system_id,base_price,sale_status,created_at,updated_at)`

`AdminVariantDto(variant_id,product_id,size_value_id,color_id,sku?,override_price?,sale_status,available_quantity,created_at,updated_at)`

`CatalogMetaDto(categories[],brands[],size_systems[],colors[],genders[],seasons[],styles[])`; last three are derived from managed catalog values.

The nullable Product summary `thumbnail` is live presentation data resolved from the ProductImage at `sort_order = 0`. A Product with no image returns `thumbnail = null`. Detail `images[]` remains the complete image collection ordered by `sort_order`.

### cart/checkout/order

`CartItemDto(cart_item_id,variant_id,quantity,product_name,image_url?,thumbnail?,size,color,unit_price,line_total,available_quantity)`

`CartDto(cart_id?,account_id?,items[],subtotal,created_at?,updated_at?)` — for an authenticated account without a persisted cart, return the same fields with null cart ID/timestamps, an empty item list and zero subtotal; GET does not create a cart.

`VoucherDto(voucher_id,code)` — do not add rule fields.

`CheckoutQuoteDto(items[],subtotal,discount,shipping_fee,total,voucher?)`

`RecipientDto(phone,email?,address)`

`OrderItemDto(order_item_id,variant_id,product_name,image_url?,sku?,size,color,unit_price,quantity,line_total)`

`PaymentPublicDto(payment_status,amount_due,amount_received,amount_refunded)`

`PaymentAdminDto` adds collection/refund actor/time.

`ShippingInfoDto(delivery_mode,carrier_name?)`

`OrderSummaryDto(order_id,order_code,order_status,payment_status,image_url?,total,created_at,completed_at?,returned_at?)`

`OrderConfirmationDto(order_id,order_code,PENDING,payment,subtotal,discount,shipping_fee,total,recipient,created_at)`

`OrderCustomerDetailDto`: recipient + items + money + payment + shipping + lifecycle timestamps.

`OrderAdminDetailDto`: customer/voucher references, service note, cancel reason, admin payment and `allowed_actions` derived from state + permission.

Cart image fields are live catalog presentation data resolved from the Product cover at read/recalculation time; Cart does not persist an image snapshot. Order image fields are historical: `OrderItemDto.image_url` comes from `order_items.image_url_snapshot`, and `OrderSummaryDto.image_url` comes from the first OrderItem snapshot by smallest `order_item_id`. Historical Order reads must not query the current Product gallery. Existing null OrderItem snapshots remain null rather than being backfilled from current catalog state.

### inventory/audit/report/content

`SupplierDto`, `GoodsReceiptItemDto`, `GoodsReceiptSummaryDto`, `GoodsReceiptDetailDto`, `InventoryRowDto`, `InventoryTransactionDto`, `AuditLogDto`, `ReportOverviewDto`, `PublicContentPageDto`, `ContentPageDto`, `CustomerSummaryDto`, `CustomerDetailDto` follow the fields in Analyst API Appendix A; do not expose persistence-only secrets.

## 5. High-risk request contracts

### Register

`phone`, `password` required; `email?` optional. The project-owner physical-design decision in `docs/15-technical-decisions.md` resolves the earlier Analyst TBD: phone is the login identifier, phone is unique per Account, and login does not require phone verification. Never accept `role` or `account_id` from public registration.

### Login

`identifier`, `password` -> access token + AccountDto. `identifier` carries the Account phone number according to the approved physical-design decision; do not silently broaden login to email or mixed phone/email lookup.

### Staff account creation

`phone`, `password` are required by the resolved phone-login design; `email?` and `role_ids?` remain optional. Omitting `role_ids` uses the approved ADMIN default; explicit role assignments must still satisfy the staff-role rules in `docs/15-technical-decisions.md`.

### Add/update cart item

`variant_id`, `quantity > 0`; quantity zero is not delete.

### Checkout quote/create Order

Receiver phone/address required, email optional, voucher code optional. Server owns all totals/state/snapshots.

### Product create — Phase 10 breaking contract

Required: category, SizeSystem, name, base price, sale status. Optional Product metadata and nested variants follow schema. Validate leaf Category, SizeSystem/SizeValue match and variant uniqueness.

`POST /api/v1/admin/products` is JSON-only and does **not** accept an image collection or multipart files. The old JSON `images[]` and multipart create representations are intentionally removed. Clients must create Product first and then call the dedicated binary image upload command.

### Product binary image upload

`POST /api/v1/admin/products/{productId}/images` consumes `multipart/form-data` with one or more repeated `images` file parts. The backend validates all files, uploads them through the Product-owned storage gateway and appends the returned direct URLs to `product_images`. Server assigns contiguous `sort_order` values after the current collection. The first image of an image-less Product receives `sort_order = 0` and is the live cover.

### Product PATCH image replacement

`PATCH /api/v1/admin/products/{productId}` may contain `images: ProductImageInput[]`:

- field omitted -> preserve current collection;
- field present -> replace the entire collection;
- `images: []` -> remove all Product images;
- every item requires `image_url` and `sort_order`; `alt_text` is optional/nullable;
- `sort_order` must be unique, non-negative and contiguous `0..n-1`; `0` is the cover.

This URL-based replacement command is a distinct catalog editing use case from binary upload; it is not a compatibility path for Product creation.

Provider credentials are backend-only. Provider-side remote deletion/compensation remains unsupported unless the provider exposes a verified machine-to-machine delete contract.

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
