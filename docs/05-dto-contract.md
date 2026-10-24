# 05 — Target JSON, DTO and Request/Response Contract

## 1. General rules

- JSON properties use `snake_case`; controller DTOs are explicit and are not serialized JPA entities.
- The standard response is `{ "data": ... }`. Paged lists also include `meta: { page, page_size, total, total_pages }`.
- Authenticated actor/account scope comes from the access token. Never accept `account_id`, actor IDs, prices, totals, stock values or workflow state as authoritative client input.
- All monetary values are whole VND integers from request through response. Do not emit JSON floating-point money.
- A nullable field may be cleared only when the specific request contract explicitly allows it. Omitted and explicit null are not interchangeable by default.

## 2. Account, Address and RBAC DTOs

### Response DTOs

- `AccountDto`: `id, full_name, phone, email, status`. Never expose `password_hash`, credential material, JWTs or secret configuration.
- `AuthResponseDto`: `access_token, account: AccountDto`; returned after successful registration/login only when Account status is `ACTIVE`. Registration creates `ACTIVE` and returns this DTO without phone/email verification.
- `AddressDto`: `id, recipient_name, recipient_phone, province, district, ward, address_line, is_default`. It describes a saved Address, not the immutable `ORDER_ADDRESSES` snapshot.
- `RoleDto`: `id, code, name, description, status`; status values are `ACTIVE|INACTIVE`.
- `PermissionDto`: `id, code, name, description`; the target Permission entity has no status field.
- `RolePermissionDto`: `role_id, permission_id`; both IDs identify an existing grant relation, not a caller-supplied actor identity.
- `MeDto`: `account, addresses[], roles[], permissions[]`. Roles/permissions are effective grants resolved for the authenticated principal; never use this payload as the source for authorizing a mutation.
- `AccessControlDto`: `roles[], permissions[]`, matching the current target API mapping; it currently describes the role and permission catalogues but does not describe the `ROLE_PERMISSIONS` links for each role.
- `RoleDetailDto`: `role, permissions[]`; returned from `GET /admin/roles/{roleId}` and relevant role create/patch operations. This read route allows the client to inspect current grants before editing.
- `StaffAccountSummaryDto`: `account, roles[]`; `StaffAccountDetailDto`: `account, roles[], permissions[]`. Neither DTO contains password/hash, bootstrap secret or credential issuance data.
- `MutationResultDto` for a successful delete: `id, deleted`; errors preserve the existing global error envelope.

### Request DTOs

- `RegisterRequest`: required fields are `phone` (max 20), `full_name` (max 150), and `password` (8–128 characters, do not trim); `email` optional (max 254). Normalize Vietnamese phone input before lookup/uniqueness: accept `0` + 9 digits or `+84` + 9 digits, allowing whitespace and `-()` separators; canonical stored form is `+84` + 9 digits. Registration creates `ACTIVE` and returns `AuthResponseDto`; never accept `id`, `status`, `account_id`, `role_ids` or `password_hash`.
- `LoginRequest`: `phone, password`. Phone is the login identifier; canonicalize it by the same rule as registration before account lookup. Wrong credentials return generic `INVALID_CREDENTIALS`; correct credentials for non-ACTIVE Accounts return 403 without a token.
- `ProfilePatchRequest`: target profile fields are `full_name?` and `email?`; `phone`, `status`, `id`, `role_ids`, timestamps and password/hash are excluded. Omitted fields retain the current value; explicit `null` is rejected for both fields because this endpoint does not explicitly allow clearing them. This follows the general DTO rule in §1; non-null `full_name` is required by the target schema.
- `AddressCreateRequest`: `recipient_name, recipient_phone, province, district, ward, address_line, is_default?`. Required strings must be nonblank and fit bounds: recipient name 150, phone 20, province/district/ward 120 each, address line 500. `account_id`, IDs and timestamps are server/database-owned. If this is the first saved address, it becomes default automatically; explicit `true` switches default atomically.
- `AddressPatchRequest`: partial form of `AddressCreateRequest`, excluding `account_id`, ID and timestamps. Omitted fields mean no requested change; explicit null is rejected for target non-null fields. At most one default is allowed; where at least one saved address remains, exactly one is default. Switch/unset/delete operations promote the most recently updated remaining address atomically; tie-break by descending ID.
- `RoleCreateRequest`: `code, name, description?`; code is required/unique (max 80), name required (max 150), description optional (max 500).
- `RolePatchRequest`: `name?, description?, status?, permission_ids?`. Omitted fields retain current values; `description: null` clears description; null for `name`/`status`/`permission_ids` is rejected. `permission_ids` omitted means retain grants, `[]` clears all grants, and a non-empty array replaces the full set atomically. Reject duplicate/missing IDs. Role `code` is immutable after create.
- `PermissionCreateRequest`: `code, name, description?`; code required/unique (max 120), name required (max 200), description optional (max 500).
- `PermissionPatchRequest`: editable fields are `name?` and `description?`; Permission `code` is immutable after creation. Omitted fields retain values; `description: null` clears description; `name: null` is rejected.
- `StaffAccountCreateRequest`: `phone, full_name, email?, password, role_ids[]`. Password is 8–128 characters and is not trimmed. SUPERADMIN sets the initial password; the server hashes it immediately and creates the Account as `ACTIVE`. Validate role IDs; commit Account, grants and audit atomically. Never return/log/audit plaintext password or hash.
- `StaffAccountPatchRequest` may update approved profile/status fields and `role_ids?`; omitted roles retain assignments and a provided role ID list replaces assignments atomically. Account status is server-managed; no request may assign actor identity or change the authenticated principal's scope.

## 3. Product/catalog DTOs

- `ProductDto` / `AdminProductDto`: Product `id`, `parent_product_id`, `category_id`, `brand_id`, `name`, `slug`, `sku`, `description`, `selling_price`, `status`, and the fields permitted for the caller. Cost information is restricted to authorized administration.
- `ProductSummaryDto`: Product identity/name, primary image, category/brand projection, selling price and status required for a list card.
- `ProductDetailDto`: Product summary plus description, images and descriptive attribute values.
- `ProductImageDto`: `id, image_url, is_primary, sort_order`. `image_url` must identify stable/immutable object-version content when used for an Order snapshot; do not rely on a mutable overwriteable URL.
- Product image upload accepts multipart image files under the owning Product ID. Reorder accepts `images[]` entries `image_id, sort_order`; reject IDs belonging to another Product, duplicate positions, gaps or invalid positions. Image removal detaches it from the current gallery but must preserve content/version references required by placed Orders.
- `AttributeTypeDto`: `id, code, name, data_type`.
- `AttributeDto`: `id, attribute_type_id, code, name, is_required, is_variant_defining, sort_order, options[]`.
- `AttributeOptionDto`: `id, attribute_id, value, label, sort_order`.
- `ProductAttributeValueDto`: `attribute_id` plus exactly one of `option_id`, `text_value`, `number_value`, `boolean_value`, matching the authoritative Attribute type. An option must belong to the same Attribute. `is_variant_defining` is informational only; attribute values never create Products.

A Product is the catalog sale unit. A child Product has a normal Product ID and independently owns SKU, required selling price and inventory. Do not encode a Product option-combination ID as a saleable item ID.

## 4. Cart and checkout DTOs

- `CartItemDto`: `id, product_id, quantity`, with server-derived Product display, current unit price, line total and availability where the endpoint requires them.
- `CartDto`: `id, items[], subtotal`. It represents only the authenticated account's Cart. The subtotal is computed by the server.
- Add/update Cart request: `product_id` for a new line and `quantity > 0`; updates to an existing line identify it by `cartItemId`.
- `CheckoutQuoteDto`: item calculation details, `subtotal`, `discount_amount`, `shipping_fee`, `total_amount`, and applicable voucher summary, all integer VND. It has **no** persisted quote identifier.
- A quote is advisory. At order creation, the server reloads current data and revalidates the calculation.

## 5. Order, voucher, Payment and shipping DTOs

- `OrderSummaryDto`: `id, order_number, status, total_amount, currency, placed_at`.
- `OrderItemDto`: `id, product_id, sku_snapshot, product_name_snapshot, attribute_snapshot, image_url_snapshot, quantity, unit_price, discount_amount, line_total`.
- `OrderAddressDto`: `recipient_name, recipient_phone, province, district, ward, address_line`.
- `OrderVoucherSnapshotDto`: order-time voucher code, discount type/value and allocated discount facts.
- `OrderDetailDto`: order identity/state, immutable items/address/voucher snapshots, integer-VND totals, COD Payment, manual shipping and permitted actions.
- `PaymentDto`: `method, payment_status, amount, currency, collected_by_account_id, collected_at, refund_amount, refunded_by_account_id, refunded_at, refund_reason`, with actor/time fields returned only to authorized users.
- `ShippingInfoDto`: `shipping_status`, recipient/carrier/tracking fields present in the target contract and lifecycle timestamps. The v1 operational workflow is manual shipping.
- `VoucherDto`: code, status/window, approved discount configuration and quota information permitted to the caller. It does not expose a per-account usage ledger.
- Order-create requests supply recipient/order inputs and optional voucher input plus the documented idempotency key. Client-computed monetary values are not accepted as authoritative.

The target Order stores Product ID and order-time snapshots. Reading an existing Order must not resolve name, SKU, attributes or image content from mutable current catalog fields.

## 6. Procurement and inventory DTOs

- `SupplierDto`: target Supplier identity/code/contact/status fields.
- `GoodsReceiptItemDto`: `product_id, quantity_received, unit_cost` (unit cost is integer VND).
- `GoodsReceiptDto`: receipt identity/number/status, Supplier, server-resolved warehouse, items and audit-relevant actor/timestamps.
- `InventoryRowDto`: `warehouse_id, product_id, quantity_on_hand, version` plus Product display fields required by the authorized UI.
- `InventoryTransactionDto`: `id, warehouse_id, product_id, transaction_type, quantity_delta, goods_receipt_item_id, order_item_id, idempotency_key, reason_code, reverses_transaction_id, created_by, created_at`.

Inventory quantities and ledger movements are Product-based. Every adjustment has a non-zero signed delta, authenticated actor and reason code. Ledger entries are append-only.

## 7. Audit, report and content DTOs

- `AuditLogDto`: target fields `id, actor_account_id, action, entity_type, entity_id, before_data, after_data, correlation_id, created_at`; redact sensitive fields and secrets.
- `ReportOverviewDto`: `from, to, completed_sales, returned_adjustment, net_sales, orders_by_status`; currency values are integer VND and use the approved reporting timezone/formulas.
- `SalesTrendDto`: `from, to, granularity, timezone, points[]`; each point contains `period_start, completed_sales, returned_adjustment, net_sales`, with monetary values in integer VND.
- `OrdersTrendDto`: `from, to, granularity, timezone, points[]`; each point contains `period_start, total_orders, orders_by_status`, including every approved Order status with zero-fill for empty buckets.
- `ProductPerformanceDto`: `from, to, limit, items[]`; each item contains `product_id, product_name, thumbnail, completed_units, returned_units, net_units`. Use Product IDs, deterministic ranking/ties and a bounded limit (1–100; default 10).
- `ContentPageDto`: `id, slug, title, content, status, updated_by, updated_at`. Public reads return published pages only.
- Customer DTOs summarize only real Accounts, addresses and associated Orders.

## 8. Validation and conflicts

Reject invalid typed attribute values, cross-Attribute options, duplicate active phone, duplicate Product SKU, invalid Product hierarchy, non-positive Cart/receipt quantities, insufficient stock, invalid voucher use and forbidden state transitions. Use stable typed errors for authorization, validation, stock conflicts and idempotency conflicts.

For order idempotency, the server scopes the key to the authenticated account and fingerprints the canonical semantic payload with SHA-256. Same key/same payload replays; same key/different payload conflicts; one account cannot read another account's result. The exact HTTP transport for this key must be explicitly set before runtime implementation.

This is the target DTO contract. Any old response shape not represented here must be deliberately retired or remapped; it must not be kept as a parallel persistence contract.
