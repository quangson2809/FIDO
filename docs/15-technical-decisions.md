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
- Product/Variant creation does not perform a stock movement. When a new Variant is created, Catalog calls the Inventory module to initialize its required zero-quantity row; later stock changes remain owned by Inventory.


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

- Inventory no longer calls back into Product for Variant validation. The Phase 4 one-row-per-Variant invariant makes the Inventory row the module-local tracked-Variant reference; Product remains responsible for creating that zero row through InventoryCommandService when a Variant is created. This removes the Product ↔ Inventory circular service dependency without changing stock semantics.
- InventoryCommandService owns zero-row initialization as well as stock/ledger writes. ProductAdminService joins its existing transaction when initializing new variants; InventoryAvailabilityService only reads quantities. No stock movement or ledger entry is introduced for zero initialization.
- Pagination raises a dedicated IllegalArgumentException subtype for invalid bounds. ApiExceptionHandler maps only that subtype to the existing HTTP 400 renderer; unrelated programming errors remain HTTP 500. Services call Pagination.of directly.
- API routes, request/response DTOs, schema, order/payment states, capability assignments and stock semantics are unchanged.


## Phase 7 operations — 2026-09-27

Sources: consolidated API Appendix A #70–77, SRS FR-29/30/31, BRULE-13, Customer Admin / FR-27; DB v1.3.0 audit_logs/content_pages/accounts/orders.

- Capabilities: `AUDIT_READ`, `CONTENT_READ`, `CONTENT_WRITE`, `CUSTOMER_READ`. SUPERADMIN may use them; no employee role receives them automatically. Content read and write are separate capabilities.
- API #73 follows its specific Appendix A contract: `{data: ContentPageDto[]}`, all small content pages including content, ordered by page_id. It has no pagination parameters or separate detail endpoint. This specific source contract takes precedence over the generic list convention (docs/00).
- Audit filters combine with AND, timestamp bounds are inclusive UTC values consistent with stored timestamps and the existing inventory API; deterministic newest audit_id first. No audit write/delete endpoint.
- Content page_code is immutable through PATCH. Non-null title/content reject explicit null; omitted fields remain unchanged. Actor derives from JWT and timestamp from the entity lifecycle; timestamps use the existing TIMESTAMP(6) microsecond precision, and flush before mapping ensures PATCH returns the persisted timestamp. Audit shares the content transaction. No content lifecycle or schema change.
- Customer queries start from existing Accounts, with phone/email search and stable account_id ordering; no synthetic guest Account, inferred phone/email ownership, minimum-order requirement or new customer-role predicate. Customer stats aggregate all linked orders in one query for the current account page. Detail includes only the documented AccountDto/AddressDto/OrderSummaryDto. Account calls CustomerOrderQueryService, never OrderRepository or Order entities; the module read contract also enforces CUSTOMER_READ. Order detail summaries join Payment in one query.

### API #71 — resolved by stakeholder decisions, 2026-09-28

The user explicitly approved these rules in the Phase 7 conversation:

- Sales is the amount received from the order, including shipping paid by the customer.
- A returned order deducts its full order value from its original completion period, regardless of the later return/refund date.
- Order-status counts use order creation date; sales uses completion date.
- Report dates use Vietnam time (`Asia/Ho_Chi_Minh`).

Implementation of the existing ReportOverviewDto:

- `completed_sales`: sum `payments.amount_received` for orders with `completed_at` in the requested period and current status COMPLETED or RETURNED. RETURNED retains its original recognized sale in this gross amount. Baseline COD collection sets amount_received to amount_due (the order total, including shipping).
- `returned_adjustment`: positive sum of `orders.total_snapshot` for RETURNED orders in the same completion cohort. It does not depend on `amount_refunded` or filter by returned_at.
- `net_sales = completed_sales - returned_adjustment`. The adjustment is never subtracted twice; a return in a later month restates the completion month.
- `orders_by_status`: counts current order statuses among orders created in the requested date range. All eight baseline status keys are present, with zero for absent statuses. This is not a historical status-at-period-end reconstruction; no timeline resource is introduced.
- Required `from`/`to` are inclusive local dates. Convert Vietnam midnight at `from` and midnight after `to` into UTC, then query `[start, end)` against existing UTC timestamps. JDBC binds LocalDateTime using JDBC 4.2, avoiding dependence on the JVM default timezone for conversion.
- API #71 remains highest-administrator-only per its source actor: SUPERADMIN at both HTTP and service boundaries; no employee capability/role grant is invented.
- ReportRepository performs two aggregate read queries across Order/Payment tables without foreign repositories/entities, per docs/01's explicit report-read allowance. The read-only REPEATABLE_READ service transaction keeps both aggregates in one snapshot. No aggregate table, migration, cached report or order mutation.

The earlier monetary/time HARD BLOCK is resolved. Phase 7's gate now depends on successful API/adjustment tests, recorded in docs/16; earlier-phase deferred slices are unchanged.

## Service read/write boundary — 2026-10-01

- Query services perform no persistence mutations; command services may read data to validate invariants or build the mutation response. Existing JPA repositories, database, endpoints, DTOs, and domain transaction boundaries remain in use. No command bus, separate read store, or service interface is introduced.
- Account profile, staff, RBAC, cart, inventory admin/supplier, and content page entry points are divided by responsibility. Goods receipt, product, order, audit, report, and deferred promotion code retain their current boundaries.
- An authenticated GET of a cart with no persisted cart returns the existing CartDto shape with the account ID, empty items, zero subtotal, and null cart ID/timestamps. The GET no longer creates a row; the first mutation creates a cart. The checkout quote already used an empty read view for this case.

## Phase 12 image security & operational hardening — 2026-10-05

- Backend method security remains the authoritative boundary for Product image mutations. Multipart upload, image reorder, image removal, and Product PATCH image association changes require `ROLE_SUPERADMIN` or `PERMISSION_CATALOG_WRITE`; frontend visibility is not authorization.
- Multipart image validation is defense-in-depth: at least one non-empty file, configured per-file size limit, configured per-request file-count limit, declared MIME allowlist, and independent magic-signature detection. All files are validated before the first provider upload.
- Supported baseline upload formats are JPEG (`image/jpeg`), PNG (`image/png`) and WebP (`image/webp`). The operational batch default is 10 files per request via `IMAGE_STORAGE_MAX_FILES_PER_REQUEST`; it does not cap the total Product gallery and remains externally configurable.
- ImgBB connect/read timeouts remain externally configurable. Provider HTTP rejection maps to 502, timeout to 504, unavailable/client/invalid-response failures to 502, and missing provider configuration to 503 without exposing provider response bodies or request URIs.
- `IMGBB_API_KEY` is backend runtime secret configuration only. Real values are not logged, returned in API responses, persisted, exposed as frontend variables or committed to Git. `.env.example` contains only an empty placeholder and real `.env` files remain ignored.
- Operational logs use safe identifiers/results only: Product upload may log `productId` and duration; the provider adapter logs result category/status and duration. It does not log provider request URI, API key, payload, response body or raw exception message.
- Detailed implementation/verification notes live in `docs/21-image-security-operational-hardening.md`. Antivirus scanning, transcoding, quarantine, WAF/rate-limiter infrastructure and remote-asset garbage collection remain outside this phase.

## Frontend runtime DTO validation — 2026-10-07

The project owner selected the handwritten DTO/service approach with selective runtime validation instead of generated OpenAPI clients.

- Keep existing TypeScript DTOs and feature API services; do not introduce client generation as part of this decision.
- Validate runtime data first where malformed payloads can corrupt a high-impact client boundary. The initial scope is `POST /auth/login` and `GET /me`, because they establish access-token, session, role and permission state.
- Parse those responses from `unknown` before publishing them into application state. Extra response fields remain forward-compatible; required fields must match the existing backend DTO contract.
- A malformed login response must not publish an access token. A malformed `/me` response must fail before role/permission state is accepted.
- Use a small dependency-free feature-local parser for this initial scope. Do not add a validation library until repeated schemas or broader runtime-validation coverage create a concrete reuse/maintenance need.
- Other API DTOs remain compile-time typed for now and should be promoted to runtime validation based on impact and evidence, not by mechanically validating every endpoint.

## Confirmed backend hardening — 2026-10-07

Base: `aca05117d6650bb3a5eb9ef0283973cfa40e4371`. Scope: findings #1, #4, #5, #7, #8, #9, #10, #11, #13, #18, #20.

- Local Gradle `bootRun` fixes only its working directory; `backend/.env` or process environment sets `SPRING_PROFILES_ACTIVE` for local and Docker. Spring imports `backend/.env` as Java properties, and profile selection is resolved in non-profile-specific `application.properties`. No dev profile or database credentials are hardcoded in build files or runtime properties. Compose additionally reads ignored root `.env` for Docker-only host/port and database settings, overrides the backend DB URL to reach the Docker DB service, and requires ignored backend `.env` for application secrets.
- No public development JWT signing key or implicit dev profile fallback. Every runtime profile requires an externally supplied, stable, private Base64 JWT secret of at least 32 decoded bytes. Missing, malformed and short keys fail fast, independent of profile. Test resources use explicit non-production fixtures only. No runtime secret is committed.
- Exception logs use a safe category message, HTTP method, matched route template, numeric path IDs, status and internal stack/cause types for server/database failures. Raw throwable messages, query strings, bodies and credentials are excluded because SQL/provider exceptions may include secrets. Lock/deadlock/optimistic concurrency failures map to existing HTTP 409; the public Boot error envelope is unchanged.
- Inventory commands sort a copy of all stock lines by `variantId`, across receipt/confirmation/restoration. Atomic conditional inventory updates remain; only the affected managed Inventory is refreshed afterward. No global persistence-context clearing. GoodsReceipt uses its existing pessimistic row lock and managed state transitions instead of redundant bulk updates.
- Account-owned pessimistic locking serializes authenticated cart commands before reading/creating a current cart. The cart current-row lookup is a locking read. This prevents first-cart/first-item races and lost increments across application instances without assuming a new unique account-cart schema constraint. Cart reads remain read-only. Guest cart remains deferred.
- Staff role replacement must retain at least one of ADMIN/SUPERADMIN; full replacement semantics and last-superadmin protection remain.
- Admin namespace admission requires SUPERADMIN or an effective permission loaded from the database. It does not require ADMIN in addition to a custom capability role, and it does not grant ADMIN any capability. Existing service-level checks still authorize each operation.
- Existing Product PATCH image URLs and provider output must be absolute HTTPS URIs with a host, no userinfo/fragment and a valid port. No provider-host allowlist is invented. Historical snapshots are untouched. The live Analyst API now excludes images from Product PATCH whereas this repository still documents/supports replacement: removing that write path requires a separate contract migration.
- OrderActionPolicy is the common source for advertised/executable actions, including payment/delivery-return prerequisites. It delegates transitions to OrderPolicy; command services retain side effects and authorization. Repeating an already-applied command remains a no-op.
- RETURN enforces an inclusive two-day interval from completed_at in UTC, before any state/note/audit mutation. Missing/future completed_at is rejected. Accepted-return retry remains a no-op. Tags/physical inspection remain staff checks; no automatic refund or stock restoration is inferred.

### #8: fixed business policy, missing receipt command representation

The live DB source (`12y5Wjo2y0Ig2ncU9uPqxe7PcSlD6mZFa`, sections after-sales/C-17) confirms two days, intact tags, and CUSTOMER_RETURN_IN only after physically received, inspected, sellable goods. This is **not** a business-policy TBD and requires no new after-sales resource/table.

The live consolidated API (`1WNaHu6g_-XINTVcUvGX9vSJnpSyLff-PebkkDk_9mMk`, Appendix A #26) accepts only operation RETURN/EXCHANGE_SIZE + reason; source_variant_id/target_variant_id/quantity are specified for EXCHANGE_SIZE. It has no received/inspection/sellable flag or separate customer-receipt action. Automatically crediting all items on RETURN would violate C-17 and the current repository contract. Inferring inspection from free text, silently repurposing exchange fields, or adding a public action/field would invent public semantics.

Therefore only the receipt-command wiring is MATERIAL_DECISION_REQUIRED: approve an explicit representation for the actual receipt/inspection result and whether it covers the whole order or selected sellable quantities. Until then #8 is PARTIAL: the return window is implemented, CUSTOMER_RETURN_IN is not exposed or claimed implemented. No unused speculative internal write method is added.

### Explicit exclusions retained

#2 COD collection/cancellation policy; #6 create-order idempotency strategy; #14 phone canonical format; #23 phone-change authentication remain material decisions. #16/#17/#21/#22/#24/#25 are not changed merely to satisfy the old report. #26 DB environment variables are already wired in application-dev.properties. No schema, phone normalization, payment state rules or capability assignments are changed.
