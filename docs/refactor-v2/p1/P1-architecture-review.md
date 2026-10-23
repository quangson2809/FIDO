# P1 Architecture Review

**Review status: PARTIAL.** This is a source-evidence review of current legacy implementation versus the proposed 31-table target contract. It does not certify production readiness or approve DB-03/DB-05 semantics.

## Scope and evidence

Reviewed target ERD, clean-reset SQL, field-level dictionary, API mapping, core backend services/entities, and related frontend types for Account, Product/attributes, inventory/goods receipts, checkout/orders, voucher redemption, payment/refund and shipping. The live implementation remains on the legacy schema; clean-reset SQL stays separate from active Flyway migrations.

## Structural review

| Severity | Finding | Evidence / disposition |
|---|---|---|
| MAJOR | Target persistence model differs from active entities | Account identity maps legacy account_id and has global unique phone; Product uses ProductVariant; Inventory keys by variant_id; Order uses BigDecimal and legacy snapshot fields. Dictionary mappings are not implemented mappings. |
| MAJOR | API/DTO/frontend still use legacy contracts | Checkout frontend posts quote_id; CheckoutQuote entity/repository exists; Product/stock IDs rely on variants; promotion DTO uses legacy voucher enum values; target contract uses Product IDs, idempotency/fingerprint and integer VND. See P1-api-breaking-changes.md. |
| MAJOR | Target entity/repository alignment is incomplete | WAREHOUSES, typed Product attribute tables, ORDER_ADDRESSES, integer order/refund fields and warehouse/product inventory are not evidenced as aligned across current entities/repositories. P1 remains a contract freeze; implement only after authorization. |
| MINOR | Logical/physical distinction must be explicit | accounts.phone_active_key is a generated physical column, not a writable Java property. MySQL target test passes, but Account lifecycle mapping remains incomplete. |
| NOTE | Existing architecture has modular-monolith/package-by-feature and layered Controller -> Service -> Repository conventions | Current receipt/inventory services include transaction/status guards in legacy variant-based flows. No evidence justifies adding architectural layers or applying design patterns as ceremony in P1. Keep business rules in backend, not duplicated in frontend. |

## Behavioral review

| Severity | Finding | Evidence / disposition |
|---|---|---|
| BLOCKER | DB-03 and DB-05 mechanics are not owner-approved | The owner selected D as a request for a design proposal. Current schema fields do not approve movement source/sign rules, retry/fingerprint scope or transaction mechanics. |
| MAJOR | Inventory target concurrency and ledger completeness are unproven | Legacy InventoryCommandService uses guarded transactional balance updates ordered by variant; target uses warehouse_id/product_id and source/idempotency/reversal fields. Same source with another key, receipt replay and cancellation/return reversals need target concurrency tests. |
| MAJOR | Checkout idempotency/repricing is not implemented in target flow | Current flow relies on quote IDs and BigDecimal. Target Order idempotency key/fingerprint are not mapped. Same-key replay/conflict, commit-then-timeout, concurrent retry and atomic order/stock/voucher writes remain unverified. |
| MAJOR | Monetary conversion/discount allocation differs | Legacy services use BigDecimal and two-decimal HALF_UP calculation; target uses integer VND and basis-point voucher representation. One accepted rounding/allocation rule and cross-layer tests are still needed. |
| MAJOR | Voucher physical bound is tested, quota protocol is not | MySQL rejects usage_count above usage_limit. This does not prove atomic redemption, final-use concurrency, global/per-account scope or cancellation restoration. |
| MAJOR | Refund/snapshot history is not established by fields alone | Legacy payment supports full refund after RETURNED; target adds refund metadata but lacks verified partial/full transitions, refund idempotency, authorization and return/restock protocol. Image URL snapshot does not ensure immutable backing content. |
| MAJOR | Product inheritance, deletes and historical retention lack decisions | DB-01 confirms independent sale units, not hierarchy depth or inheritance of name/slug/description/selling_price/category_id/brand_id. DB-12 lacks owner-approved soft/hard-delete, FK-action and retention rules. |
| PASS (limited) | Selected physical constraints verified on MySQL | Run 39904931447 on MySQL 8.4.13 verifies active phone uniqueness/reuse, nonnegative inventory, voucher counter bound, wrong-attribute option ownership FK, clean reset/reseed and metadata inventory. This is database-level evidence only. |

## Security and transaction boundaries

- Derive actor/account identity from the authenticated principal; do not trust request-supplied actor/account IDs.
- Keep order placement, stock/ledger, voucher consumption, COD Payment and cart mutation in one transaction after DB-05/06 decisions are accepted.
- Keep receipt confirmation and ledger generation atomic and make retries idempotent after DB-03 acceptance.
- Restrict payment/refund/cancel/return/stock-adjustment actions by explicit state and permission matrices; target schema tests do not establish endpoint authorization.
- Preserve audit history and redact secrets. Basic role/permission seed counts passed the schema test, but external-secret SUPERADMIN bootstrap and secret-source scan remain unverified.

## Decision

**P2 NOT AUTHORIZED.** Static consistency and MySQL reset checks pass, but DB-03/05 mechanics, Product inheritance, voucher quota lifecycle, immutable asset retention, refund/return policy and DB-12 deletion/history policy remain open; active backend/API/frontend mappings need a separate approved implementation plan and acceptance tests.
