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

`ProductImageDto(image_id,image_url,alt_text?)`

`ProductVariantDto(variant_id,size,color,sku?,effective_price,sale_status,available_quantity)`

`ProductSummaryDto(product_id,name,category,brand?,base_price,sale_status)`

`ProductDetailDto(product_id,name,description?,category,brand?,size_system,gender?,season?,style?,material_care?,base_price,sale_status,images[],variants[])`

`AdminVariantDto(variant_id,product_id,size_value_id,color_id,sku?,override_price?,sale_status,available_quantity,created_at,updated_at)`

`CatalogMetaDto(categories[],brands[],size_systems[],colors[],genders[],seasons[],styles[])`; last three are derived from managed catalog values.

### cart/checkout/order

`CartItemDto(cart_item_id,variant_id,quantity,product_name,size,color,unit_price,line_total,available_quantity)`

`CartDto(cart_id?,account_id?,items[],subtotal,created_at?,updated_at?)` — for an authenticated account without a persisted cart, return the same fields with null cart ID/timestamps, an empty item list and zero subtotal; GET does not create a cart.

`VoucherDto(voucher_id,code)` — do not add rule fields.

`CheckoutQuoteDto(items[],subtotal,discount,shipping_fee,total,voucher?)`

`RecipientDto(phone,email?,address)`

`OrderItemDto(order_item_id,variant_id,product_name,sku?,size,color,unit_price,quantity,line_total)`

`PaymentPublicDto(payment_status,amount_due,amount_received,amount_refunded)`

`PaymentAdminDto` adds collection/refund actor/time.

`ShippingInfoDto(delivery_mode,carrier_name?)`

`OrderSummaryDto(order_id,order_code,order_status,payment_status,total,created_at,completed_at?,returned_at?)`

`OrderConfirmationDto(order_id,order_code,PENDING,payment,subtotal,discount,shipping_fee,total,recipient,created_at)`

`OrderCustomerDetailDto`: recipient + items + money + payment + shipping + lifecycle timestamps.

`OrderAdminDetailDto`: customer/voucher references, service note, cancel reason, admin payment and `allowed_actions` derived from state + permission.

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

### Product create

Required: category, SizeSystem, name, base price, sale status. Optional fields follow schema. Nested image/variant collections are allowed by API contract. Validate leaf Category, SizeSystem/SizeValue match and variant uniqueness.

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
