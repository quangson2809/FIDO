# 05 — Target JSON, DTO and Request/Response Contract

## 1. General rules

- JSON properties use `snake_case`; controller DTOs are explicit and are not serialized JPA entities.
- The standard response is `{ "data": ... }`. Paged lists also include `meta: { page, page_size, total, total_pages }`.
- Authenticated actor/account scope comes from the access token. Never accept `account_id`, actor IDs, prices, totals, stock values or workflow state as authoritative client input.
- All monetary values are whole VND integers from request through response. Do not emit JSON floating-point money.
- A nullable field may be cleared only when the specific request contract explicitly allows it. Omitted and explicit null are not interchangeable by default.

### Money and Voucher DTO rules

- Every monetary JSON value is a whole-VND integer; no JSON float/decimal money. `unit_price`, line/order/payment totals, shipping and applied discount are VND. `discount_value`/`discount_value_snapshot` are VND for FIXED but basis points for PERCENT (100 bps=1%).
- `CheckoutQuoteDto` and Order responses use the same subtotal/discount/shipping/total formulas and P1.5 HALF_UP plus largest-remainder allocation; the quote is not persisted and cannot mutate quota.
- `VoucherDto` exposes `id, code, discount_type, discount_value, minimum_order_value, maximum_discount, starts_at, ends_at, usage_limit, usage_count, status` only to authorized admin reads. `usage_count` is read-only; do not expose per-account usage history. Dates are ISO-8601 instants normalized to UTC.
- Create Voucher starts `status=DRAFT`, `usage_count=0`; clients cannot set `id` or `usage_count`. Patch may not lower `usage_limit` below current `usage_count`; EXPIRED is terminal. Historical Order snapshots do not change after Voucher edits.

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

- `RegisterRequest`: required fields are `phone` (max 20), `full_name` (max 150), and `password` (8–128 characters, do not trim); `email` optional (max 254). Normalize Vietnamese phone input before lookup/uniqueness: accept `0` + 9 digits or `+84` + 9 digits, allowing whitespace and `-()` separators; canonical stored form is `+84` + 9 digits. Registration creates `ACTIVE`, assigns the seeded `CUSTOMER` Role server-side in the same transaction, and returns `AuthResponseDto`; never accept `id`, `status`, `account_id`, `role_ids` or `password_hash` from the request.
- `LoginRequest`: `phone, password`. Phone is the login identifier; canonicalize it by the same rule as registration before account lookup. Wrong credentials return generic `401 INVALID_CREDENTIALS`; valid credentials for any non-ACTIVE Account return `403 ACCOUNT_NOT_ACTIVE` without a token or disclosure of the exact state.
- `ProfilePatchRequest`: target profile fields are `full_name?` and `email?`; `phone`, `status`, `id`, `role_ids`, timestamps and password/hash are excluded. Omitted fields retain the current value; explicit `null` is rejected for both fields because this endpoint does not explicitly allow clearing them. This follows the general DTO rule in §1; non-null `full_name` is required by the target schema.
- `AddressCreateRequest`: `recipient_name, recipient_phone, province, district, ward, address_line, is_default?`. Required strings must be nonblank and fit bounds: recipient name 150, phone 20, province/district/ward 120 each, address line 500. `account_id`, IDs and timestamps are server/database-owned. If this is the first saved address, it becomes default automatically; explicit `true` switches default atomically.
- `AddressPatchRequest`: partial form of `AddressCreateRequest`, excluding `account_id`, ID and timestamps. Omitted fields mean no requested change; explicit null is rejected for target non-null fields. At most one default is allowed; where at least one saved address remains, exactly one is default. Switch/unset/delete operations promote the most recently updated remaining address atomically; tie-break by descending ID.
- `RoleCreateRequest`: `code, name, description?`; code is required/unique (max 80), name required (max 150), description optional (max 500).
- `RolePatchRequest`: `name?, description?, status?, permission_ids?`. Omitted fields retain current values; `description: null` clears description; null for `name`/`status`/`permission_ids` is rejected. `permission_ids` omitted means retain grants, `[]` clears all grants, and a non-empty array replaces the full set atomically. Reject duplicate/missing IDs. For `SUPERADMIN`, an explicit set must equal the complete Permission catalogue and its status stays ACTIVE; each new Permission is granted to SUPERADMIN atomically. Role `code` is immutable after create.
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
- `AttributeDto`: `id, code, name, is_required, is_variant_defining, sort_order, options[]`.
- `AttributeOptionDto`: `id, attribute_id, value, label, sort_order`.
- `ProductAttributeValueDto`: `attribute_id, attribute_code, attribute_name, attribute_value_id, value, label`. Product create/update requests send `attribute_value_ids[]`; Backend resolves each Option and its owning Attribute. An Option must belong to the Attribute, and only one Option may be selected per Attribute. `is_variant_defining` is informational only; attribute values never create Products.

A Product is the catalog sale unit. A child Product has a normal Product ID and independently owns SKU, required selling price and inventory. Do not encode a Product option-combination ID as a saleable item ID.

## 4. Cart and checkout DTOs

- `CartItemDto`: `id, product_id, quantity` plus server-derived Product display, current unit price, line total and advisory availability fields where required. Product ID is the sole sale-unit identity; there are no variant fields.
- `CartDto`: `id: bigint | null, items[], subtotal`. With no OPEN Cart return `id=null, items=[], subtotal=0` without writing. More than one OPEN Cart returns `409 CART_SELECTION_AMBIGUOUS` and does not select/merge rows. Subtotal is computed by the server.
- `AddCartItemRequest`: `product_id, quantity`; positive SQL INT quantity is added to an existing same-Product line or inserted when absent. `UpdateCartItemQuantityRequest`: `quantity`; positive SQL INT replaces the line quantity exactly. Combined quantity may not exceed 2,147,483,647. Return the resulting CartDto after mutation.
- `CheckoutQuoteRequest` and `OrderCreateRequest`: `recipient_name, recipient_phone, province, district, ward, address_line, voucher_code?`. Recipient/address fields are required and follow target Data Dictionary limits. Omitted/null voucher_code means no Voucher; supplied codes follow P1.5 normalization. Neither request accepts account/cart IDs, line items, prices, discounts, shipping fee, totals or `quote_id`.
- `CheckoutQuoteDto`: current item calculations, `subtotal`, order `discount_amount`, `shipping_fee`, `total_amount`, per-line allocated `discount_amount` and `line_total`, plus applicable Voucher summary. Monetary fields are integer VND and reconcile under P1.5. It has **no** `quote_id`, persisted record or stock/quota side effect.
- Quote is advisory only. Order creation re-reads and revalidates all Product, stock, Voucher and shipping inputs. See [P1.6 Cart and Checkout Contract](refactor-v2/p1/P1.6-cart-checkout-contract.md).

## 5. Order, voucher, Payment and shipping DTOs

- `OrderSummaryDto`: `id, order_number, status, total_amount, currency, placed_at`.
- `OrderItemDto`: `id, product_id, sku_snapshot, product_name_snapshot, attribute_snapshot, image_url_snapshot, quantity, unit_price, discount_amount, line_total`. `discount_amount` is the allocated whole-VND share of the order Voucher; `line_total = unit_price*quantity - discount_amount`.
- `OrderAddressDto`: `recipient_name, recipient_phone, province, district, ward, address_line`.
- `OrderVoucherSnapshotDto`: order-time voucher code, discount type/value and allocated discount facts.
- `OrderDetailDto`: order identity/current state, immutable items/address/voucher snapshots, integer-VND totals, COD Payment, manual ShippingInfo and server-permitted actions. The allowed actions and transition preconditions come from [P1.7](refactor-v2/p1/P1.7-order-payment-contract.md), not from a client-writable status field.
- `PaymentDto`: `method, payment_status, amount, currency, collected_by_account_id, collected_at, refund_amount, refunded_by_account_id, refunded_at, refund_reason`, with actor/time fields returned only to authorized users. COD collection is atomic with `SHIPPING → COMPLETED`; a full refund is a manually attested offline COD action combined with `COMPLETED → RETURNED`. One Payment/one full refund maximum; never accept client amount or actor/time.
- `ShippingInfoDto`: `shipping_status`, recipient/carrier/tracking fields present in the approved target schema and available lifecycle timestamps. The v1 operational workflow is manual shipping; current fields are not an attempt-event timeline. State transitions follow [P1.7](refactor-v2/p1/P1.7-order-payment-contract.md).
- `VoucherDto`: `id, code, discount_type, discount_value, minimum_order_value, maximum_discount, starts_at, ends_at, usage_limit, usage_count, status`, only for authorized admin reads. FIXED `discount_value` is VND; PERCENT is basis points. `usage_count` is server-owned and no per-account usage ledger exists.
- `VoucherCreateRequest`: `code, discount_type, discount_value, minimum_order_value?, maximum_discount?, starts_at?, ends_at?, usage_limit?`; status begins DRAFT and usage_count begins zero.
- `VoucherPatchRequest`: patch only allowed configuration/status fields; never accepts `usage_count`, IDs, actor or audit timestamps.
- `POST /api/v1/orders` requires the `Idempotency-Key` HTTP header (1–128 ASCII characters matching `[A-Za-z0-9._~-]+`). The key is not in the JSON body. Response/replay status, canonical request fingerprint, Account namespace and conflict behavior are normative in [P1.6](refactor-v2/p1/P1.6-cart-checkout-contract.md). Client-computed monetary values are not authoritative.

The target Order stores Product ID and order-time snapshots. Reading an existing Order must not resolve name, SKU, attributes or image content from mutable current catalog fields. `ORDER_ADDRESSES` is immutable after placement; the target does not expose recipient-snapshot PATCH. P1.7 limits `COMPLETED → RETURNED` to one full COD refund and explicitly excludes per-line return quantities/history.

## 6. Procurement and inventory DTOs

- `SupplierDto`: target Supplier identity/code/contact/status fields.
- `GoodsReceiptItemDto`: `product_id, quantity_received, unit_cost` (unit cost is integer VND).
- `GoodsReceiptDto`: receipt identity/number/status, Supplier, server-resolved warehouse, items and audit-relevant actor/timestamps.
- `InventoryRowDto`: `warehouse_id, product_id, quantity_on_hand, version` plus Product display fields required by the authorized UI.
- `InventoryTransactionDto`: `id, warehouse_id, product_id, transaction_type, quantity_delta, goods_receipt_item_id, order_item_id, idempotency_key, reason_code, reverses_transaction_id, created_by, created_at`.

Inventory quantities and ledger movements are Product-based. Every adjustment has a non-zero signed delta, authenticated actor and reason code. Ledger entries are append-only.

## 7. Audit, report and content DTOs

- `AuditLogDto`: target fields `id, actor_account_id, action, entity_type, entity_id, before_data, after_data, correlation_id, created_at`. Apply P1.8 allowlist/redaction recursively before serialization; never expose credentials, tokens, signed URLs, raw payloads or unnecessary PII. Audit query permission/filter/order behavior is normative in [P1.8](refactor-v2/p1/P1.8-operations-seed-contract.md).
- `ReportOverviewDto`: `from, to, completed_sales, returned_adjustment, net_sales, orders_by_status`; currency values are integer VND. Inclusive business-date bounds, source data, date basis, timezone and zero-fill behavior follow [P1.8](refactor-v2/p1/P1.8-operations-seed-contract.md); formulas and Order/Payment semantics remain P1.5/P1.7 owned.
- `SalesTrendDto`: `from, to, granularity, timezone, points[]`; each point contains `period_start, completed_sales, returned_adjustment, net_sales`, with monetary values in integer VND.
- `OrdersTrendDto`: `from, to, granularity, timezone, points[]`; each point contains `period_start, total_orders, orders_by_status`, including every approved Order status with zero-fill for empty buckets.
- `ProductPerformanceDto`: `from, to, limit, items[]`; each item contains `product_id, product_name, thumbnail, completed_units, returned_units, net_units`. Use Product IDs, deterministic ranking/ties and a bounded limit (1–100; default 10).
- `ContentPageDto` (admin): `id, slug, title, content, status, updated_by, updated_at`. Admin response requires the corresponding `CONTENT_READ`/`CONTENT_WRITE` action permission. Public `GET /content-pages/{slug}` uses `PublishedContentPageDto(slug, title, content)` for `PUBLISHED` pages only; it must not expose `updated_by` or other admin metadata. Content lifecycle, slug rules and sanitized rendering are specified by [P1.8](refactor-v2/p1/P1.8-operations-seed-contract.md).
- Customer DTOs summarize only real Accounts, addresses and associated Orders.

## 8. Validation and conflicts

Reject invalid option-only Attribute values, cross-Attribute options, duplicate active phone, duplicate Product SKU, invalid Product hierarchy, non-positive Cart/receipt quantities, insufficient stock, invalid voucher use and forbidden state transitions. Use stable typed errors for authorization, validation, stock conflicts and idempotency conflicts.

For order-creation idempotency, require the `Idempotency-Key` HTTP header on `POST /api/v1/orders`; scope the stored key to the authenticated account and fingerprint the canonical semantic payload with SHA-256. Same key/same payload replays; same key/different payload conflicts; another account cannot read the result. P1.6 is normative for transport/replay details. Post-create transition retries are guarded by locked state preconditions and source-deduplicated Inventory effects; they do not imply a new command-id table.

This is the target DTO contract. Any old response shape not represented here must be deliberately retired or remapped; it must not be kept as a parallel persistence contract.


## P1.3 target DTO validation and ownership

- A Product is one sale-unit record identified by id. Parent and child records each expose their own sku, required integer-VND selling_price, status and stock relationship. A child is created by setting parent_product_id; no variants[], variant_id or option-combination identity is part of the target DTO.
- category_id, brand_id, name, slug and description follow target nullability and never inherit from the parent. PATCH omission retains the current value; explicit null clears only a nullable target field. For attribute_values, omission retains the set and a supplied array replaces the complete set.
- ProductAttributeValueDto exposes the Attribute and selected Option (`attribute_value_id`, `value`, `label`). Product create/update accepts only `attribute_value_ids[]`; Backend derives the owning Attribute, rejects unknown IDs, duplicate IDs and multiple Option selections for one Attribute, and enforces required values before activation. Values never generate Products.
- AttributeDto exposes id, code, name, is_required, is_variant_defining, sort_order and options[]. AttributeOptionDto exposes id, attribute_id, value, label and sort_order. Attribute code and Option machine value are immutable under the target write contract; display label/order may change.
- ProductImageDto exposes id, image_url, is_primary and sort_order. A non-empty gallery has exactly one primary image at sort_order zero; writes atomically renumber the full gallery. Order snapshots never resolve through mutable current gallery state.
- Exact routes, typed filter operators, errors and evidence are owned by [P1.3 Catalog Metadata Contract](refactor-v2/p1/P1.3-catalog-metadata-contract.md). This is target documentation, not a claim that current runtime DTOs conform.
