# 15 — Current Technical Decisions

## 2026-11-18 — Remove ShippingInfo completely

- Owner authorizes deleting shipping_infos, its entity/repository/DTO and all carrier/tracking/shipping-status fields without merging them into orders or adding replacement columns. Order retains the existing transition matrix, stock/payment/Voucher/audit transactions and permissions.
- In the COD-only workflow, completing delivery and collecting COD is one atomic action. PAYMENTS.collected_at is the completion timestamp for order responses, the existing two-day return window and report periods, including after a full return. Do not substitute ORDERS.updated_at or add a separate delivery timestamp.
- Order detail removes shipping_info. RecipientDto gains name from the existing ORDER_ADDRESSES.recipient_name snapshot, preserving the displayed recipient identity. Existing completed_at/returned_at response fields remain, derived from Payment collection/refund facts.
- Fresh installs use the amended single V1 baseline and 29-table ERD/dictionary. Existing databases require a separate guarded manual upgrade: compare completion/collection timestamps and state consistency before removing the table; abort on mismatches rather than guessing or rewriting purchase history. No live database change is performed by this code task.
- Server-generated COD collection/refund times use TIMESTAMP(6) precision so the first response and later database reads expose the same completion/refund instant. Focused verification covers Order actions, COD and refund replay/rollback, cancellation and stock ledger invariants, response contracts, report periods, seed, schema mapping and legacy upgrade guards. Preserve current architecture and handler registry; no replacement shipping module or service is introduced.

## 2026-11-18 — One reusable Cart per Account

- Owner authorizes removing carts.status and its lifecycle/check/index, adding UNIQUE(account_id), and reusing a Cart across purchases. This amendment supersedes earlier sole-OPEN/ambiguity selection rules and Cart completion behavior.
- Missing read/clear returns empty without persistence; only the first add creates a Cart. Success deletes purchased lines and retains Cart identity; failure rolls back all Order/Payment/audit/Voucher/Cart writes. Pending Orders and Carts still do not reserve stock.
- AccountMutationLockService remains the first lock, followed by the Cart write lock. The Account lock also serializes first creation. Cart consumption requires an existing transaction and is called through the cart module service. Entity code has no HTTP, repository or cross-module coordination.
- Preserve Order idempotency and all frontend pending/lock controls. Replay is resolved before reading the reused Cart so an old key cannot consume new lines. No API endpoint or CartDto field is added.
- Fresh installs use the single canonical V1. A separate [manual upgrade](operations/reusable-cart-upgrade.md) checks existing rows, keeps a sole nonempty Cart (or lowest ID when all empty), and deletes only redundant empty rows. Multiple nonempty Carts abort before mutation. No live database reset, automatic repair or arbitrary merge is authorized.
- Focused tests cover read/clear without creation, SQL uniqueness, retained Cart ID, transaction rollback, idempotency replay, concurrent mutations and the exact upgrade SQL on isolated MySQL.

## 2026-11-18 — Entity-owned business behavior

- Follow-up review closes creation-only setters for Payment amount/order identity, GoodsReceipt number/warehouse/creator and Role code. Named factories initialize these facts; JPA retains protected no-argument constructors and field access. Role status accepts only ACTIVE/INACTIVE. Payment collection/refund preconditions have one implementation reused by the entity and application service; cross-entity eligibility and transaction boundaries stay in the service.
- Remove unused legacy Order permission constants and recipientEditable policy; the recipient snapshot remains immutable after placement. Focused regressions cover public mutation surfaces and the three reproduced invariant bypasses.

- Owner authorizes moving local business rules from services into the existing JPA entities. Preserve Modular Monolith, feature packages, handler registry, module contracts, schema, HTTP envelopes, permissions, transaction propagation and locking order.
- Order owns its transition matrix and named state changes. Payment owns clean unpaid/collected predicates, COD collection and one full refund. The later ShippingInfo-removal amendment keeps dispatch/retry/failure/cancellation on Order. Cross-entity eligibility, inventory/voucher effects and audit remain in the owning application service/policy.
- GoodsReceipt guards draft edits and confirmation/cancellation; the service retains source-line validation, committed-state replay and atomic stock posting. Voucher validates a complete configuration before applying it and owns status/time/minimum/quota eligibility. The guarded database quota update and balance/ledger commands remain unchanged.
- CartItem owns positive quantity/overflow checks; the later reusable-Cart amendment removes Cart completion. ContentPage owns its existing status matrix, and Role protects the ACTIVE SUPERADMIN invariant. Multi-account/address/family rules remain services because a single entity lacks the required state.
- Remove public setters for protected workflow facts. JPA continues field access; tests that deliberately model stored corrupt/terminal states use explicit reflection fixtures. A small common BusinessRuleException carries only rejection kind/code; ApiExceptionHandler maps it to the existing 400/409 envelope without introducing HTTP dependencies in entities.
- The branch-specific backend workflow and `backend/scripts/verify-domain-behaviors.sh` run the same focused entity, API/security, transaction/rollback, retry and concurrency checks on isolated MySQL. No full backend/frontend suite is selected for this refactor.

> This is the active decision summary for implementation against the owner-approved ERD v2. Historical implementation/audit reports are not target contracts. For business decisions, see the dated [P1 owner approval](refactor-v2/p1/P1-owner-approval-2026-10-23.md) and [Decision Log](refactor-v2/p1/P1-decision-log.md).

## 1. Architecture and stack

- Preserve the current Java/Spring Boot/Gradle application stack; no framework or database-platform upgrade is implied by the schema refactor.
- Use a modular monolith and package-by-feature. The normal call path is Controller → Service → Repository.
- Each module owns its persistence and business invariants. Cross-module writes call the owning module's service, not its Repository.
- Flyway owns schema changes; ORM schema generation does not replace versioned migrations. Validate mappings against an empty target database.
- Use `Long` for BIGINT identifiers and the repository's approved timestamp types/UTC policy. Composite keys must be represented explicitly.

## 2. Approved persistence and money contract

- The revised target is the 30-table option-only model in `docs/refactor-v2/target/erd-v2-approved.mmd`; exact physical details are in `docs/refactor-v2/p1/P1-data-dictionary.csv`.
- Target monetary values are whole VND stored as integer BIGINT values. Do not use decimal money or JSON floating-point money. 
- Calculate order-level discount with HALF-UP rounding to a whole VND, then allocate with largest remainder and ascending Product ID tie-break. Line discounts reconcile exactly to the order discount.
- Product, Order, OrderItem, address, voucher, Payment and image facts that must remain historically stable are snapshotted at the appropriate write boundary.

## 3. Account, catalog and RBAC

- Account phone identity is unique among active accounts and can be reused after soft deletion. Account lifecycle and generated active-phone enforcement must agree between DDL, Entity, authentication and service validation.
- Product parent/child records share `PRODUCTS`. v1 allows one parent-child level; children are explicit, independently sellable records. Each row owns SKU, required selling price and inventory; NULL never means implicit inheritance.
- Catalog Attributes are Option-only. The `ATTRIBUTE_TYPES` table and `attributes.attribute_type_id` are removed. Each Product/Attribute value contains a required `option_id` owned by the stored `attribute_id`; the composite FK enforces ownership. Product create/update sends `attribute_value_ids[]`; Backend resolves each Option, derives its Attribute and rejects unknown IDs, duplicate IDs and multiple Options for one Attribute. Required Attributes must be selected before activation. Attributes never auto-generate Products or variants.
- Required system roles/permissions are seeded by Flyway. Bootstrap SUPERADMIN credentials come from external secret/configuration, never committed source or demo seed. Protect the last SUPERADMIN invariant and audit privileged changes.

## 4. Owner-directed option-only Attribute model (2026-10-30)

- The clean-install target is the revised 30-table option-only catalog model. Remove `ATTRIBUTE_TYPES`, `ATTRIBUTES.attribute_type_id`, and `PRODUCT_ATTRIBUTE_VALUES.text_value`, `number_value`, `boolean_value`.
- `PRODUCT_ATTRIBUTE_VALUES.option_id` is mandatory and constrained by `(option_id, attribute_id)` to `ATTRIBUTE_OPTIONS(id, attribute_id)`. Keep one row per `(product_id, attribute_id)`.
- Product create/update accepts `attribute_value_ids: Long[]`; the server resolves each Option ID and derives the owning Attribute. Product detail responses expose `attribute_value_id`, machine `value` and display `label` with Attribute metadata.
- This is a clean-install contract change, not a migration of existing populated databases. Existing installations require a separately reviewed data-preserving migration.
- Keep `is_required`, `is_variant_defining` and `sort_order`; `is_variant_defining` remains informational and never generates saleable Products.

- **Public Product detail family projection (2026-10-31):** keep the existing ProductDetailDto fields and add `family: {root_product_id, members[]}`. Each member is an independently sellable ACTIVE, non-deleted Product with its own Product ID/SKU/price, ordered images and Option-only Attribute values. Include the public root (when ACTIVE) and all public direct children even if the request targets a child; never expose non-public siblings or infer inheritance. Use batched family image/Attribute reads. COLOR/SIZE are frontend selectors of existing Product IDs, never Product generators; other Attributes remain descriptive. Ambiguous color/size combinations must not automatically choose a SKU.

## 5. Cart, checkout, Order and vouchers

- Persisted Cart and Order creation require authentication; Account scope comes from the security principal; guest Cart, checkout and merge are excluded.
- Each Account owns at most one reusable Cart, enforced by uq_carts_account. There is no Cart status or timestamp-based selection. Missing reads/clear do not write; first add creates; checkout consumes lines while retaining the Cart. Account-first locks and the Order transaction remain mandatory. See the dated 2026-11-18 amendment above.
- Quote is stateless/advisory: no CHECKOUT_QUOTES, quote_id, stock reservation or Voucher use. Order placement reloads/reprices Product eligibility, price, stock, Voucher eligibility/quota and server-owned shipping inputs.
- POST /orders requires Idempotency-Key; the stored key is Account-namespaced and the normalized semantic request gets a canonical SHA-256 fingerprint. Same committed key/payload replays; changed payload conflicts; another Account cannot discover the result. Details are normative in P1.6.
- P1.6 placement atomically writes Order PENDING, OrderItems and immutable address/Product/Voucher/image snapshots, COD Payment UNPAID, applicable Voucher counter, Cart consumption and audit. It does not deduct stock. P1.7 requires stock deduction at PENDING→CONFIRMED and linked one-time reversal for eligible cancellation, with the Order/Inventory/audit write set atomic.
- v1 vouchers are order-wide, non-stackable and use one global limit. Consume usage atomically with successful order placement and restore at most once on eligible cancellation. No catalog-targeting joins or per-account usage ledger.
- Payment is COD-only with one Payment aggregate per Order. Collect COD only atomically with SHIPPING→COMPLETED after manual delivery verification; v1 allows one whole-order full offline refund paired with COMPLETED→RETURNED. Partial/multiple refunds, automated disbursement and detailed item-level return workflows require an approved scope change.

## 6. Inventory, receiving and audit

- v1 has one operational warehouse; the server selects the active warehouse for stock-affecting commands.
- `INVENTORIES` is keyed by `(warehouse_id, product_id)` and stores `quantity_on_hand` plus a concurrency version. A successful movement updates source state, balance, append-only `INVENTORY_TRANSACTIONS` and required audit in one transaction.
- Approved movements are `OPENING`, `GOODS_RECEIPT`, `ORDER`, `ORDER_CANCEL_REVERSAL`, `RETURN_RESTOCK` and `ADJUSTMENT`. Use source-derived uniqueness, deterministic Product-ID lock order, guarded non-negative updates and linked reversal rows.
- **P3.5 balance implementation:** inventory commands lock Products in ascending Product-ID order through the Product-owned access contract, lock/re-read the composite balance row, and apply the quantity delta atomically in SQL. The guarded update checks non-negative current quantity/version, resulting quantity within signed-INT bounds and version below the signed-INT maximum, then verifies exactly one affected row. Version increments once per successful non-zero movement. A positive first movement inserts a zero/version-zero row before the guarded update; negative movement against a missing row fails. Read paths expose logical quantity/version `0/0` for a missing balance and resolve exactly one ACTIVE operational warehouse on the server.
- **P3.6 receipt posting implementation:** receipt create resolves the sole ACTIVE operational warehouse on the server; create/PATCH never use a client-supplied warehouse ID. CONFIRM locks the receipt before reading its lines, then calls the Inventory-owned command service within the same transaction. Each ledger key is derived from `goods_receipt_item_id` and `GOODS_RECEIPT`; source rows and existing postings are compared before any balance mutation. Mixed/changed duplicate sources fail closed. Receipt status/confirmed actor/time, balance/version, append-only ledger and allowlisted before/after audit with the request correlation ID share one transaction. `OPENING` is a one-time positive movement per warehouse/Product pair with `opening:<warehouse_id>:<product_id>` semantic identity; an identical replay returns the prior movement, while any prior movement prevents a second opening.
- Adjustments require a non-zero delta, actor, reason code and idempotency/correlation evidence. No ledger row may be edited/deleted to correct history.
- Audit fields, actor provenance, correlation propagation, allowlisted before/after JSON, redaction and required event/transaction behavior follow [P1.8 Operations, Audit, Content/Report and Seed Contract](refactor-v2/p1/P1.8-operations-seed-contract.md). Do not serialize whole entities/raw requests or log secrets/unnecessary PII; audit failure rolls back the associated required business write set.

- **P3.0 audit write core:** the target-schema writer persists only `actor_account_id, action, entity_type, entity_id, before_data, after_data, correlation_id`; the database owns `id` and `created_at`. `AuditWriteService` uses `Propagation.MANDATORY`, derives human actors from the authenticated JWT subject, exposes a separate trusted-system entry point for NULL actors, and applies action-specific scalar field allowlists before JSON serialization. `X-Correlation-ID` is the request header; trim and accept only 1–120 printable ASCII characters matching `[A-Za-z0-9._:-]`, otherwise generate a UUID. The request filter scopes and clears the value; non-HTTP command handlers that emit multiple events must open one generated correlation scope for that command.

- **Runtime schema alignment:** the canonical `backend/src/main/resources/db/migration/V1__fido_target_schema.sql` in this branch defines the target `audit_logs` columns `id, actor_account_id, action, entity_type, entity_id, before_data, after_data, correlation_id, created_at`. `AuditLog` and `AuditWriteRepository` map/write that target shape. This baseline is for a fresh, empty database; it is not an upgrade path for a populated database whose `audit_logs` table still has the legacy shape. Never run target-schema writers against that legacy database.

## 7. Order states, shipping and reporting

- Enforce the normative [P1.7 Order/Payment/Shipping contract](refactor-v2/p1/P1.7-order-payment-contract.md) and its summary in `docs/06-business-rules-state-machines.md`; validate actor, preconditions, state, transaction and errors under lock. Duplicate collection/refund and illegal replays must not repeat side effects.
- Shipping is manual; do not introduce carrier API, automatic tracking integration or a dedicated event/timeline table in v1. Order and Payment state changes plus required audit are atomic.
- P3.13 cancellation applies an exact, source-linked reversal to each original `ORDER` inventory movement using a deterministic `order-cancel-reversal:<movement_id>` key, restores voucher quota under a guarded counter update, and writes the required audit records in the same transaction. The inventory reason code is fixed to `ORDER_CANCELLED`; free-form request text is not written to the ledger.
- COD collection is one `SHIPPING → COMPLETED` command updating Order and Payment atomically. Full refund is only `COMPLETED → RETURNED` with `ORDER_AFTER_SALES` plus `ORDER_PAYMENT`; it records the full persisted Payment amount once and does not restock inventory or release the Voucher.
- The target `ORDERS` table has no durable completion/return timestamp columns. Order detail and summary responses derive `completed_at` from `PAYMENTS.collected_at` and `returned_at` from `PAYMENTS.refunded_at`, rather than relying on transient fields in the Java entity.
- Report query periods, bucket boundaries, zero-filled status metrics, source tables and deterministic Product ranking follow [P1.8](refactor-v2/p1/P1.8-operations-seed-contract.md). Money and Order/Payment/return semantics remain owned by P1.5/P1.7; use Asia/Ho_Chi_Minh inclusive business dates and adjust a whole-Order return in its original completion period. Current status counts use Order creation date.

### P3.14 — Audit read and Content Pages

- Audit search uses the existing `GET /api/v1/admin/audit-logs` contract only: `AUDIT_READ`, validated actor/action/entity/time filters, UTC-normalized instants, deterministic `created_at DESC, id DESC` order and standard pagination. Unknown query parameters are rejected instead of silently ignored. There is no separate audit-detail or export route in the approved API contract.
- Every successful privileged audit search appends one metadata-only `AUDIT_LOG_QUERY` access event after reading the page. The event does not include result rows, and audit-row insertion is never recursively audited. Historical `before_data`/`after_data` payloads are redacted through the action-specific allowlist before DTO serialization; unknown event codes fail closed.
- Content uses the approved `content_pages.id/slug/title/content/status/updated_by/updated_at` fields. Public slug lookup returns only `PUBLISHED`; invalid, missing, `DRAFT` and `ARCHIVED` pages share the same 404 behavior. Slug is normalized to lowercase and validated against the approved ASCII-hyphen form; it is immutable after creation.
- Content create starts at `DRAFT`; the existing PATCH route handles field updates and the approved `DRAFT/PUBLISHED/ARCHIVED` transitions under a row lock. Content and its redacted audit event commit atomically. The admin list exposes summaries, not the page body. **Contract discrepancy to reconcile:** P1.8 §3.1 says the admin list should be paginated, while the current API-73/Backend AGENTS contract specifies an unpaginated `{data: [...]}` response. This phase preserves API-73 rather than silently changing its response shape; pagination needs an explicit source-contract decision. No detail/export route, revision table, hard delete or retention purge is added.

### P3.15 — Report queries and integer-VND semantics

- All report routes are read-only projections against the canonical target fields: `ORDERS.id/status/total_amount/created_at`, `PAYMENTS.order_id/payment_status/amount/refund_amount/collected_at/refunded_at`, `ORDER_ITEMS.order_id/product_id/quantity`, and current `PRODUCTS`/`PRODUCT_IMAGES` display fields. No legacy report columns or new persistence are used.
- `REPORT_READ` is the endpoint capability; authorization is checked by the service using `PERMISSION_REPORT_READ` (with the existing SUPERADMIN override), not by additionally requiring the `ADMIN` role name.
- Report date inputs are inclusive `Asia/Ho_Chi_Minh` calendar dates converted to the half-open UTC range `[startOfDay(from), startOfDay(to + 1))`. Sales and product performance use the immutable `PAYMENTS.collected_at` completion cohort; status metrics use current `ORDERS.status` grouped by `ORDERS.created_at`.
- Completed sales sum persisted `ORDERS.total_amount` once for current `COMPLETED` and `RETURNED` Orders whose Order and COD Payment facts are consistent. The full `RETURNED` adjustment is included in that same original delivery period only when Payment is `REFUNDED` with `refund_amount = amount`; it is not moved to `refunded_at`. Net sales are completed sales minus that adjustment. No revenue is inferred from placed Order totals before collection.
- API money fields are Java signed-BIGINT-compatible integers (`long`), not floating-point or decimal JSON values. Because MySQL returns `SUM(BIGINT)` as DECIMAL, aggregate projections convert with exact range checking; overflow or inconsistent net totals fail closed rather than round/truncate. Product performance preserves the approved `limit` response field, zero-filled Order-status buckets, whole-Order return semantics and deterministic ranking `net_units DESC, completed_units DESC, product_id ASC`.
- Repository report methods contain only reads; report services run in read-only repeatable-read transactions. No audit mutation, content behavior, cache, snapshot table, query builder or report-owned domain state is added.

## 8. Image history, retention and deletion

- Order image references must resolve to immutable object/version content for the required retention window. Later Product image changes must not rewrite historical order image results.
- Prefer soft-delete/disable for referenced Account/catalog/voucher/warehouse records. Use RESTRICT by default for business/history foreign keys; CASCADE only for explicitly disposable working data.
- Posted Orders, snapshots, Payment facts, inventory ledger and audit history are not cascade-deleted.
- The lifecycle/FK matrix and system-seed manifest are specified in [P1.8](refactor-v2/p1/P1.8-operations-seed-contract.md); numeric audit/image/personal-business retention durations and legal anonymization/deletion exceptions remain TBD. Do not implement scheduled purge until they are approved. Current DDL lacks an explicit CartItems CASCADE; P1.9 must reconcile it, and code must delete child rows explicitly until then.

## 9. Delivery status

Owner-approved behavior and target schema are recorded; application/DTO/frontend alignment and runtime acceptance remain open until verified on the exact candidate SHA. DDL validation does not prove transaction/concurrency, authorization or user-flow behavior. Clean Schema Reset may be run only against a verified disposable development/test database; no reset is authorized against persistent/shared data.


## 2026-11-12 — Internal backend responsibility refactor

- OrderAction is the single source of the six wire actions, target status, permission and audit metadata. Request String validation and OpenAPI vocabulary derive from it; policy remains shared by visibility and execution.
- OrderActionService retains authorization, locking/loading, transaction, audit and response projection. Its complete, duplicate-rejecting registry selects package-private action handlers; dispatch/retry share execution with distinct policy/audit.
- ProductImageAdminService owns gallery replace/append/reorder/remove. Product patch delegates replace with its locked Product in a mandatory transaction; replacement identity/no-op, original validation/errors and EntityManager flush sequence remain unchanged.
- InventoryCommandService keeps its API, StockLine and mandatory propagation. Package-private receipt/opening/adjustment/order workflows own source validation. Internal posting combines guarded balance/version update and ledger append, translating only ledger errors as before. No return-restock wiring, schema or dependency change.
- This candidate was reconstructed in the Windows workspace after the original cloud workspace became unavailable. Verification is rerun on this candidate; earlier cloud results do not prove its status. See refactor-demo1-report.md.

## 2026-11-12 — Backend naming clarification

- OrderStockLineLoader.loadForUpdate explicitly names its OrderItem write-locking read. StartPreparingOrderHandler and MarkDeliveryFailedOrderHandler match the existing action semantics; wire action names remain unchanged.
- OrderActionService.executeAction and OrderActionHandler.supportedActions clarify execution versus handler registration. Enum variables and audit status variables use explicit action/status names.
- ProductImageAdminService.persistGalleryOrderAndPrimary names both primary selection and database persistence. replaceImages documents that the caller must already hold the Product write lock in the shared transaction.
- Inventory posting uses idempotencyKey, sortByProductAndSourceId and normalizeReason to make duplicate prevention, processing order and reason normalization clear at call sites.
- This is a naming/documentation change only. Existing permission expressions, transaction boundaries, lock order, flush sequence, stock/ledger semantics and HTTP/JSON contracts are preserved.

## 2026-11-13 — Parent catalog summary and color/size combination selection

- Public list/search pagination is parent-only. Search/name, category, brand and price retain parent-field semantics. Attribute equality filters use one correlated family-SKU EXISTS with all selected values on that same ACTIVE, non-deleted Product. Admin list is unchanged.
- Owner clarification: the purchase selector contains only COLOR and/or SIZE. COLOR is an exact immutable Attribute code; size roles are immutable codes beginning with uppercase SIZE, not category-specific branches. Options come only from actual Product assignments within the public family; a shirt, trousers and shoes can use different SIZE Options without a global hard-coded list. Other Attributes remain descriptive even when is_variant_defining=true.
- Product attribute-value responses retain the additive is_variant_defining and Attribute sort_order metadata. Generic flag toggles cannot bypass color/size matching or create a third purchase axis. Existing family detail carries Product identity, price, images and stock; no schema or endpoint change is needed.
- Frontend selection is Attribute ID → Option ID. Earlier metadata-ordered axes constrain later axes; missing choices stay missing. Exactly one complete ACTIVE combination must match, regardless of stock on duplicates. Cart additionally requires the matching detail Product ID and available stock.
- Parent is the display representative AND an ordinary sellable combination. It has the same complete color/size axis set as its active children. There is no manual SKU picker, no separate root button, no empty-parent exception and no direct-URL ambiguity bypass. A standalone Product without variants can still be bought.
- Active multi-member families must have at least one COLOR/SIZE axis, the same complete set on every member, and unique Option tuples. Draft rows may be prepared independently; create/update/activation/reparent validate the affected family. Attribute code/Option identity are immutable under existing write contracts, so changing descriptive flags/labels does not change selection semantics.
- Product writes share-lock Attribute metadata, then affected roots in ID order, then the member. Post-wait decisions use current locking reads for values, children and gallery. Deletions use already locked entities instead of derived-delete snapshot queries.
- Development seed marks its existing SIZE/COLOR definitions variant-defining for metadata consistency. Applied migrations and business data are untouched. Existing invalid families must be repaired explicitly; the storefront blocks ambiguous/incomplete combinations rather than guessing or offering SKU buttons.
- Existing backend CI is enabled for this feature branch and frontend CI runs the focused selection model test. This provides verification on Ubuntu instead of retrying the Windows runtime whose unsolicited telemetry was rejected. No workflow permissions or dependencies are added.

## 2026-11-14 — SIZE prefix selection

- Owner request broadens size recognition from exact SIZE to any Attribute code starting with uppercase SIZE, including SIZE_SHOES, SIZE_GIAY and SIZE_TROUSERS. The prefix is literal: no underscore is required; SHOE_SIZE/OVERSIZE do not match. COLOR recognition stays exact.
- Frontend uses the shared recognition predicate for selection, matching and excluding size values from general specifications. Backend family validation uses the same prefix rule; complete, consistent, unique parent/child tuples remain required.
- Option values still come only from the actual family. No schema, seed, API payload, public error-code or stock/Cart behavior change is introduced.
- Focused model, parameterized HTTP validation/detail/filter and browser regressions cover prefixed sizes. Ubuntu CI remains the verification route; the rejected Windows test runtime is not retried.

## 2026-11-16 — Định dạng và nhóm trách nhiệm backend

- Dùng google-java-format 1.22.0 chế độ AOSP: thụt lề 4 dấu cách, sắp xếp/bỏ import không dùng. Giữ nguyên nội dung Javadoc tiếng Việt và không tự tách chuỗi dài. Formatter nằm trong configuration riêng, không đi vào dependency runtime. `./gradlew formatJava` sửa định dạng; `./gradlew checkJavaFormat` kiểm tra, được nối vào `check` của CI.
- Chỉ thêm package con khi có một cụm lớp cộng tác: `account.service.identity`, `order.service.lifecycle`, `order.service.checkout`, `inventory.service.stock`, `product.service.query`. Hai projection đọc kho nằm trong `inventory.repository.projection`. Các module/tầng ít lớp giữ cách bố trí hiện tại; DTO tiếp tục chia request/response.
- `OrderQueryService` ở cùng cụm lifecycle với các lệnh dùng projection chi tiết nội bộ; `CatalogMetaService` ở cùng nhóm upload do dùng giới hạn định dạng ảnh. Cách gom này giữ helper/constant package-private, không mở public chỉ để chuyển folder.
- Chuyển các test cần truy cập package-private cùng cụm triển khai; giữ nguyên mức truy cập, tên bean Spring, biểu thức quyền, route, JSON và transaction. Sửa selector CI theo tên package mới.
- Gom lọc payload audit đọc/ghi vào một hàm; giữ khác biệt null/rỗng ở hai hợp đồng. Gom kiểm tra giới hạn số dư trong điều chỉnh/đảo điều chỉnh, giữ nguyên mã lỗi và thứ tự kiểm tra version/khóa.
- Bỏ `Allocation.originalIndex`, hai constructor `CheckoutCalculation` không được gọi, helper `leafCategory`/`productsById` không có nơi dùng và ba hằng loại bút toán lỗi thời trong `OrderPolicy`. Nguồn loại bút toán đang dùng vẫn là `InventoryPolicy`.
- Bỏ đường ghi `restoreDeliveryReturn`/`restoreOrderStock` không có caller trong source/test; không nối nghiệp vụ trả hàng vào hoàn kho. Giữ mã lịch sử `RETURN_RESTOCK` và các truy vấn ledger để đọc dữ liệu đã có. Không sửa migration/schema.


## 2026-11-17 — Remove redundant persistence fields on demo1

- Owner explicitly removes ten columns: `attributes.is_variant_defining`, `orders.placed_at/currency`, `shipping_infos.recipient_name/recipient_phone`, `product_images.is_primary`, `payments.currency/method`, `cart_items.added_at`, and `order_voucher_snapshots.discount_amount_snapshot`. This supersedes earlier dated decisions that retained these columns.
- Preserve the single pre-release V1 baseline policy. Update the canonical SQL, ERD, dictionary, seed, entities, API contracts, frontend and affected tests together. Existing databases with the old V1 checksum require a separately controlled upgrade or a verified disposable reset; no reset of an existing/shared database is performed by this change.
- `orders.created_at` is the one placement timestamp; account/status indexes now use it. `order_addresses` owns the immutable receiver snapshot. Shipping API fields remain available by projection from that snapshot.
- Image position zero is the primary image for reads, gallery controls and reports. Gallery writes retain Product locks, contiguous ordering and the two-flush temporary-position strategy for the unique index. Image/attribute responses and write forms no longer expose deleted flags; selection still uses exact COLOR and SIZE-prefixed codes.
- Whole integer VND and COD remain fixed application semantics. Keep amount equality, refund limits, state/actor/time, stock/ledger and idempotency checks; remove checks against constants that are no longer stored. `orders.discount_amount` remains the actual historical Voucher discount; code/type/value snapshots stay immutable.


## 2026-11-17 — Customer admin query scope

- Fix API #76/#77: a customer is a non-soft-deleted Account with an assigned `CUSTOMER` Role. The previous list only checked deletion and detail used unrestricted Account lookup, so staff-only Accounts leaked into the customer view.
- Apply the same membership/deletion predicate to the paginated list/count and ID detail lookup. Use correlated EXISTS to avoid row multiplication from multiple roles. Non-customer and soft-deleted IDs return 404 before reading addresses/orders.
- Membership classifies the target Account, independently of the viewer's `CUSTOMER_READ` permission, prior orders and Account login status. Customers without orders or with LOCKED/SUSPENDED status remain manageable; another role alongside CUSTOMER does not erase customer membership. Role status controls access separately from this classification.
- FE already calls the correct customer endpoints. Preserve its request/response contract, existing permission boundary, order statistics and schema. Regression tests use staff-only fixtures (the shared registration helper otherwise also assigns CUSTOMER).


## 2026-11-17 — Customer cancellation of pending orders

- Owner approves the proposed customer self-cancellation scope: PENDING only, own Order, clean UNPAID/undispatched state and no prior stock movement. This supersedes the former exclusion of customer cancellation in API/P1.7 contracts. No schema/dependency change is required.
- Add POST `/api/v1/me/orders/{orderId}/cancel` without a request body. A customer-scoped pessimistic Order query prevents access to foreign Orders; the same row lock used by administrator confirmation serializes competing transitions. Foreign/missing Orders return 404; state conflicts/repeats return 409.
- OrderActionService keeps separate authorization/eligibility entry points and shares handler execution/audit. Reuse CancelOrderHandler and mandatory Voucher release. Admin permissions and cancellation of confirmed/preparing/failed-delivery Orders are preserved.
- Customer detail exposes `allowed_actions`, evaluated with the same customer policy as execution. FE shows the control from this field, asks for confirmation, disables busy controls, refreshes after 409, and ignores late responses after changing Orders. History is read again on returning to the list.
- Commit marker `[customer-cancel-focus]` selects the relevant backend lifecycle/security/stock/rollback/concurrency tests and the customer cancellation browser regression in CI, following existing focused-check conventions. Static compilation, formatting, frontend lint/build, API/architecture/render checks and canonical schema verification remain available. Other commits retain the default suites.

## 2026-11-19 — Thông báo lỗi công khai bằng tiếng Việt tại BE

- Nội dung `message` và `error` được dịch tại `ApiExceptionHandler` hiện có. Mã lỗi và trạng thái HTTP phục vụ xử lý được tách khỏi câu thông báo cho người dùng.
- Lỗi không được nhận diện và lỗi kỹ thuật dùng câu tiếng Việt an toàn, không trả SQL, stack trace hay nguyên nhân gốc. Checkout/voucher dùng cùng cơ chế BE; `/error` cũng trả thông báo an toàn.
- Chỉ BE sở hữu thông báo trả về; không thêm danh mục JSON dùng chung, phụ thuộc đóng gói, cơ chế dịch hoặc thay đổi cách hiển thị của FE.
- Hoàn lại phần FE đã mở rộng trong PR #60 theo yêu cầu làm gọn phạm vi. Không thay đổi nghiệp vụ, schema hoặc transaction.

## 2026-11-19 — Tận dụng luồng xác thực chuẩn Spring Security

- Đăng nhập dùng `AuthenticationManager` / `DaoAuthenticationProvider`; bỏ so mật khẩu, dummy hash và kiểm tra trạng thái tự làm trong `AuthenticationService`. Lỗi credentials hoặc trạng thái tài khoản cùng trả `401 INVALID_CREDENTIALS`; lỗi hạ tầng vẫn trả lỗi máy chủ an toàn.
- `Account` trực tiếp implements `UserDetails` và `CredentialsContainer`; điện thoại là username, password_hash là mật khẩu đã băm, trạng thái hiện có ánh xạ sang enabled/nonLocked. Hai cờ hết hạn dùng mặc định `true` của Spring vì dự án không có quy tắc hết hạn tài khoản/mật khẩu. Bỏ lớp bọc `AccountPrincipal`.
- `AccountUserDetailsService` tải Account theo điện thoại hoặc accountId, nạp role/permission ACTIVE vào authorities `@Transient`, rồi detach entity trước khi trả cho Spring. ProviderManager xóa credentials trên Account đã tách khỏi persistence context nên không cập nhật password_hash trong DB. Đăng nhập dùng chính Account đã xác thực để tạo DTO/token, không truy vấn lại Account. Entity vẫn không được trả trực tiếp từ API.
- Resource Server tiếp tục kiểm JWT bằng decoder hiện có và `JwtAuthenticationConverter` chuẩn. Authorities/trạng thái luôn đọc từ DB, không lấy claim quyền và không cache UserDetails. Giữ kiểm tra issuer, thời hạn, iat/exp và subject accountId.
- Quyền admin do `@PreAuthorize` tại các entry service thực thi; URL chỉ yêu cầu authenticated và các URL ngoài danh sách vẫn denyAll. Bỏ lambda duyệt prefix quyền, bỏ `OrderAuthorization` và metadata permission trùng cho sáu action ORDER_EDIT; lọc allowed_actions bằng AuthorityAuthorizationManager.
- Entry point và access-denied handler dùng bộ xử lý Bearer chuẩn của Spring để có header giao thức, sau đó ghi JSON tiếng Việt hiện có. AccessDeniedException từ method security được chuyển lại cho ExceptionTranslationFilter. Audit dùng AuthenticationTrustResolver để nhận diện anonymous; nguồn actor từ JWT và transaction giữ nguyên.
- CORS không bật credentials vì mô hình API dùng Bearer header, không dùng cookie/session xác thực. Không đổi FE, schema, quy tắc phân quyền hay nghiệp vụ đơn hàng/kho.

## 2026-11-20 — Dọn mã tài khoản và tách persistence địa chỉ

- Bỏ tám tham số actor không được dùng trong lệnh nhân sự/RBAC và phần lấy JWT chỉ để truyền các tham số đó. Audit tiếp tục lấy người thực hiện từ SecurityContext; ID chủ sở hữu hồ sơ/địa chỉ vẫn lấy từ principal đã xác thực.
- Bỏ bảy phương thức repository không có nơi gọi. Không mở API xóa tài khoản hoặc thay đổi dữ liệu lịch sử.
- ProfileCommandService giữ transaction, khóa tài khoản, kiểm tra sở hữu và quy tắc chọn một địa chỉ mặc định. AddressRepository sở hữu bulk update với @Modifying: flush trước cập nhật, clear persistence context sau cập nhật; service đọc lại địa chỉ cần trả về. Bỏ SQL trực tiếp, EntityManager và refresh cả danh sách khỏi service; dùng saveAndFlush chuẩn của Spring Data khi cần phản hồi sau flush.
- Giữ sửa dữ liệu cũ thiếu/thừa mặc định, ưu tiên địa chỉ đã mặc định rồi updated_at/id giảm dần; không tự điền trường địa chỉ thiếu. Chọn địa chỉ kế tiếp bằng truy vấn giới hạn một dòng. Mapping địa chỉ chuyển về AccountMapper hiện có.
- Đồng bộ test đăng nhập nhân sự bị khóa với hợp đồng 401 INVALID_CREDENTIALS. Nhóm CI Spring Security chạy toàn bộ test module account, cùng các test bảo mật/kiến trúc/audit liên quan; không chạy toàn bộ backend. Bổ sung kiểm tra địa chỉ về phản hồi sau bulk update, chọn mặc định thay thế, sửa dữ liệu cũ, rollback và cập nhật đồng thời.

## 2026-11-24 — Operational completion on demo1

- The explicit owner request and subsequent policy answers are retained in [operational completion](operations/operational-completion.md). The [API/transaction contract](operations/operational-api.md) defines request/response, locks, source deduplication, privacy, monetary calculations and testing obligations. This extension overrides prior out-of-scope statements only for these features.
- Preserve the deployed V1 checksum and historical business facts. Add V2 (account auth version, email verification/recovery, CUSTOMER_WRITE), V3 (physical return receipt facts), and V4 (stocktakes and linked receipt corrections). Seven new owned JDBC tables extend the 29-table JPA baseline; no placeholder Entities are created. The [extension ERD](operations/operational-schema.mmd) and migration DDL are the physical contract for these additions. No persistent database is reset.
- Stateless quote confirmation hashes current payable facts; it is an acknowledgement, not a saved quote/reservation or client authority over money. Existing idempotent replay remains before Cart reads.
- Failed-delivery cancellation no longer posts sellable stock. Only source-bound physical receipt/inspection restores accepted quantities; legacy cancellation reversals reduce the remaining receivable quantity. Confirmed/preparing cancellations retain the pre-dispatch reversal.
- Reuse existing audit for bounded redacted action reasons and exact business diffs. No general timeline/event infrastructure is introduced. New source documents retain structured count/inspection/correction facts needed to explain movements.
- Recovery token verification expiry is 24h, reset expiry 15min, one email per account/purpose per 60s; 256-bit opaque tokens are hashed and purpose/email-bound, single-use under Account locks. Email changes clear verification; password changes/reset and customer lock/unlock advance JWT auth_version. SMTP must be configured outside Git and remains the one external delivery prerequisite.
- AOV is the whole-VND HALF_UP average of all placed-order totals in the selected period. Status rates use the same denominator. Slow-moving uses current stock and the explicitly labelled trailing 10 local calendar days; this avoids presenting current balances as historical stock.
- Admin catalog metadata retains complete Category/Brand arrays, including INACTIVE rows, so stop/reactivate remains operable after public metadata is filtered. Public metadata continues to expose only visible entries. Stocktake drafts retain the version observed when each physical count is entered, including across frontend inventory pagination.
