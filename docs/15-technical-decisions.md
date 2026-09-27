# Implementation decisions — 2026-09-26

This file contains **technical implementation decisions** approved by the project owner or safely chosen to encode already-approved source semantics. It must not be used to invent new business rules.

## Explicitly approved by project owner

- Preserve Java 17, Spring Boot 4.0.3, Gradle and MySQL from the repository.
- Use Flyway to version the schema. Hibernate validates mappings; it does not create or update the schema.
- Login uses the account phone number. Login does not require phone verification.
- `ADMIN` identifies employees; `SUPERADMIN` is the highest administrator. Lowercase `admin` is not privileged. Phone values are unique.
- Bootstrap the initial account with role `SUPERADMIN` from external credentials.
- JWT library: Spring Security Resource Server with Nimbus JOSE/JWT, versions managed by Boot.

## Decision policy

Unresolved points are classified before implementation:
- HARD BLOCK — missing business/API/security/schema/state/money/stock/external-contract meaning.
- TECHNICAL DECISION — semantics fixed; implementation naming/organization remains. Decide here and continue.
- DEFERRED FEATURE — explicitly phase-later/TBD; skip only that slice.

Ordinary technical decisions do not require stakeholder confirmation when they preserve approved semantics and public contracts.

## Foundation conventions

- UTC timestamps stored as TIMESTAMP(6).
- Entity lifecycle callbacks assign UTC creation/update times. No actor or timestamp comes from request data.
- Flyway V1 maps DD-DB-01 v1.3.0.
- Foreign references are scalar IDs in JPA; SQL FKs enforce integrity.
- Composite junction keys use explicit ID classes.
- History repositories expose no delete method.
- Audit, inventory ledger and order-item snapshots are immutable records/entities where appropriate.
- Existing Spring Boot `/error` rendering remains; no custom public error envelope has been introduced.
- CI tests H2 in MySQL mode and MySQL 8.4.
- V1 targets an empty schema; populated production databases require a separate reviewed migration plan.

## Phase 2 decisions already implemented

- Flyway V2 adds UNIQUE(phone) and seeds ADMIN/SUPERADMIN roles.
- JWT uses HS256 with externally configured Base64 secret; role/permission data is reloaded from DB rather than trusted from JWT claims.
- System roles cannot be deleted.
- RBAC writes protect the last SUPERADMIN assignment.
- Staff means an account currently assigned ADMIN or SUPERADMIN.
- Staff creation without explicit role_ids assigns ADMIN; explicit assignments must include ADMIN or SUPERADMIN.
- Permission rows are managed data.
- API #58–69 currently require SUPERADMIN.
- Mutations use service transactions including audit where implemented.
- Validation/auth/error status mapping follows existing Boot behavior.
- No refresh API/account lifecycle/status/guest identity/voucher behavior was introduced.

## Phase 3 technical decisions

### Catalog sale-state encoding

The data/requirements already distinguish:
- an item that is allowed to be sold;
- an item that is stopped from sale;
- an item that is still on sale but has zero available inventory.

The source leaves the **technical enum/literal names** open. Encode the two sale-state meanings as:

- `ON_SALE`
- `STOPPED`

These literals apply to both Product and ProductVariant `sale_status`.

This is not a new business lifecycle. Do not add DRAFT/ARCHIVED/DELETED/etc.

Sellable/purchasable availability remains derived from:
- Product sale status;
- Variant sale status;
- `inventories.available_quantity`.

Zero inventory must not mutate sale status.

### Catalog authorization capabilities

Define technical permission capabilities:

- `CATALOG_READ` — admin/back-office read endpoints #27, #28, #33.
- `CATALOG_WRITE` — catalog mutations #29–32 and #34–45.

`SUPERADMIN` may perform both capabilities as the highest technical administrator.

Do **not** automatically grant either capability to `ADMIN` or another employee role. The employee role-to-permission matrix remains business configuration/TBD. Assignment occurs only through RBAC data/configuration.

Public catalog #11–13 remains public according to the API contract.

## Canonical source notes

- Schema authority: `07_Thiet_ke_du_lieu_CSDL_Website_Ban_Quan_Ao_v1.3.0_catalog_final.docx`.
- Current API authority: consolidated `DANH MỤC API TINH GỌN THEO CSDL` with 77 baseline APIs and Appendix A.
- Older API v5/phase snapshots may provide history but do not override the current consolidated contract.
- Modeling Class/Sequence diagrams guide responsibility/order of interaction; they do not override the current physical schema or force Java framework method names.

## Still deferred/unresolved

- Employee role-to-permission assignment matrix.
- Guest session identity/TTL/merge.
- Guest order lookup verification/security details.
- Voucher business rules.
- Detailed size guide.
- Notification/provider/template/retry/retention.
- Create-order retry/dedupe mechanism.
- Order timeline resource.
- Structured/item-level after-sales case.
- GoodsReceipt unit_cost.
- Performance/SLA/RPO/RTO/retention numeric targets.

Administrative bootstrap credentials must remain external; never hardcode shared secrets.


## Phase 3 implementation details recorded during coding

- Public Catalog list includes only Product `ON_SALE` rows that have at least one Variant `ON_SALE`; zero inventory does not mutate or replace sale status.
- Public size/color/price filters are evaluated against sale-enabled Variants. Price range uses effective price: Variant override when present, otherwise Product base price.
- Direct detail lookup does not invent redirect/tombstone behavior for a stopped Product; it returns the existing record with explicit Product/Variant `sale_status` and current `available_quantity`. Purchase flows must still enforce purchasability.
- Catalog metadata returns the existing relational masters; gender/season/style values are derived from stored Product values.
- Catalog writes are audited in the same service transaction.
- Product/Variant creation does not create or mutate Inventory. A missing Inventory row is read as available quantity 0; Phase 4 owns stock mutation/upsert behavior.


## Phase 4 technical decisions

### Supplier usage-state encoding

The approved source fixes two Supplier usage meanings: usable for new receiving work and stopped from further use while historical GoodsReceipt references remain intact. Encode the technical literals as:

- `ACTIVE`
- `INACTIVE`

This is only a literal naming decision. No Supplier delete lifecycle is added. A new GoodsReceipt may use only an `ACTIVE` Supplier; historical receipts remain readable after that Supplier becomes `INACTIVE`.

### Inventory authorization capabilities

Define technical capabilities for APIs #46–57:

- `INVENTORY_READ` — read APIs #46, #47, #50, #51, #55 and #57.
- `INVENTORY_WRITE` — mutation APIs #48, #49, #52–54 and #56.

`SUPERADMIN` may perform both capabilities. Do not automatically grant either capability to `ADMIN` or any employee role.

### Receipt code generation

The API contract requires the server to generate `receipt_code`, while the business sources do not lock a human numbering scheme. Use an opaque unique code `GR-<UUID>` within the existing 40-character column.

No date, sequence, branch, supplier or accounting meaning is inferred from that code.

### Inventory row invariant

DD-DB-01 defines exactly one `inventories` row per ProductVariant for the one-warehouse baseline.

Phase 4 therefore:
- backfills a zero-quantity row for a pre-existing Variant that has none;
- initializes a zero-quantity row when Catalog creates a new Variant;
- keeps ordinary stock changes behind inventory business services so each non-zero movement has its matching ledger entry.

Creating the zero row is initialization, not a stock movement; it does not create an InventoryTransaction.


## Phase 5 technical decisions

### Authenticated cart slice while guest identity is deferred

The public contract keeps Cart/Checkout guest intent, but the source explicitly leaves guest session key, TTL, persistence and merge behavior unresolved.

Phase 5 therefore implements the complete authenticated path for APIs #14–19. Until guest identity/security is approved:

- `/api/v1/cart/**` requires a valid JWT;
- `/api/v1/checkout/quote` requires a valid JWT;
- no guest cookie, session key, hidden fingerprint or merge policy is invented.

This is a deferred transport/identity slice, not a removal of the guest business requirement.

### Current authenticated cart selection

DD-DB-01 allows an Account to reference multiple Cart rows and does not define an active/status field. For the authenticated Phase 5 slice, the current Cart is the most recently updated Cart for that Account, using `cart_id` as the deterministic tie-breaker. If none exists, the backend lazily creates one.

Clearing a Cart removes its items but keeps the Cart row, because the baseline exposes DELETE `/cart` as “empty the cart” and does not define Cart archival/deletion lifecycle.

### POST item behavior

The source distinguishes “add” from PATCH “change quantity”. Therefore:

- POST `/cart/items` adds the requested positive quantity to an existing row for the same Variant, or creates a new row;
- PATCH `/cart/items/{cartItemId}` replaces the row quantity with the requested positive quantity.

This preserves the schema invariant `UNIQUE(cart_id, variant_id)`.

### Voucher-deferred quote behavior

Voucher rules are explicitly not implement-ready. Voucher-less quote is implemented with `discount = 0` and `voucher = null`.

If `voucher_code` is supplied before the voucher rules are approved, API #19 returns HTTP 501 rather than silently accepting, ignoring or inventing a discount rule.

### Shipping fee configuration

BRULE-03 fixes the baseline normal shipping fee at 30,000 VND. The implementation exposes it as configuration `app.checkout.shipping-fee` with baseline default `30000.00`; it is server-derived and never accepted from the client.


## Phase 6 technical decisions

### Authenticated order creation while guest identity remains deferred

API #20 is implemented for authenticated accounts only because guest session identity/verification is still source-TBD. No guest cookie, hidden fingerprint, phone-only lookup secret or merge rule is invented.

The business transaction creates a PENDING Order, immutable OrderItem snapshots and one UNPAID Payment without deducting stock.

### Create-order retry/double-submit guarantee remains blocked

The baseline requires logical dedupe but does not approve an idempotency key, schema column, request token or client fingerprint. Phase 6 therefore does not claim retry/double-click dedupe for API #20.

The endpoint is otherwise implemented and tested. No hidden uniqueness heuristic is used as a fake idempotency guarantee.

### Voucher slice remains deferred

Until voucher eligibility/calculation rules are approved, API #20 rejects a non-blank `voucher_code` with HTTP 501. Voucher-less orders snapshot `discount = 0` and `voucher_id = null`.

### Order authorization capabilities

Technical capability identifiers encode the already-required operation-level authorization without assigning them to employee roles:

- `ORDER_READ` — admin order list/detail;
- `ORDER_EDIT` — recipient/customer-service/shipping-info PATCH;
- `ORDER_PROCESS` — CONFIRM and PREPARE;
- `ORDER_FULFILLMENT` — SHIP, RETRY_DELIVERY and COMPLETE;
- `ORDER_EXCEPTION` — DELIVERY_FAILED, CANCEL and DELIVERY_RETURN_IN;
- `ORDER_PAYMENT` — COLLECT_COD and REFUND;
- `ORDER_AFTER_SALES` — after-sales RETURN command.

`SUPERADMIN` bypasses these capabilities. `ADMIN` receives none automatically. The employee role-to-capability assignment matrix remains business configuration/TBD.

### Order code generation

The source requires server-generated `order_code` but does not lock a human numbering format. Use opaque `ORD-<UUID>` inside the existing 40-character unique column. No accounting/date sequence semantics are inferred.

### Shipping delivery mode

The business meanings “internal delivery” and “external carrier entered manually” are fixed, but technical enum literals are explicitly TBD. Phase 6 therefore stores the supplied non-blank `delivery_mode` string within the existing column and does not invent a closed enum or tracking fields.

### Baseline after-sales boundary

`RETURN` is implemented as the staff command that records an accepted return outcome for a COMPLETED order: Order becomes RETURNED, `returned_at` and reason/note are recorded and audited. It does not automatically restock and does not automatically refund; refund remains the explicit API #25 command after an accepted return.

`EXCHANGE_SIZE` remains deferred because the approved sources explicitly leave target-variant movement, old-variant restock eligibility, price difference, partial exchange and OrderStatus effects TBD. API #26 returns HTTP 501 for that operation rather than inventing movement/payment semantics.


## Structural refactor follow-up — 2026-09-27

- InventoryCommandService owns zero-row initialization as well as stock/ledger writes. ProductAdminService joins its existing transaction when initializing new variants; InventoryAvailabilityService only reads quantities. No stock movement or ledger entry is introduced for zero initialization.
- Pagination raises a dedicated IllegalArgumentException subtype for invalid bounds. ApiExceptionHandler maps only that subtype to the existing HTTP 400 renderer; unrelated programming errors remain HTTP 500. Services call Pagination.of directly.
- API routes, request/response DTOs, schema, order/payment states, capability assignments and stock semantics are unchanged.
