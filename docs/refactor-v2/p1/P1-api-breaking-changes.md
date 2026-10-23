# P1 — Target API/DTO/Frontend Breaking-Change Map

**Status: INVENTORY — NOT IMPLEMENTED.** The clean-reset schema is isolated from active Flyway migrations. Current APIs/frontend types still represent the legacy schema and must not be silently treated as target-compatible.

| Domain | Current implementation evidence | Target contract | Compatibility impact / P2 requirement |
|---|---|---|---|
| Account identity | Account.accountId maps to account_id; entity declares global unique phone; no deleted_at property | accounts.id, soft delete, generated active-phone uniqueness | Remap identity/login; preserve generic credential errors; verify active duplicate rejection and phone reuse on MySQL. |
| Product sale unit | Product + ProductVariant; legacy Size/Color fields; product price BigDecimal | Parent and child Product rows each sell independently with own SKU, integer price and stock; attributes descriptive only | Catalog/Cart/Order/receipt/stock IDs and DTOs change; resolve hierarchy depth and all inheritance fields first. |
| Dynamic attributes | Existing code uses variant option entities | ATTRIBUTE_TYPES, ATTRIBUTES, ATTRIBUTE_OPTIONS, PRODUCT_ATTRIBUTE_VALUES with typed single values | Target entities, services, DTO and FE types are not yet implemented; no variant auto-generation. |
| Inventory | Inventory.variantId and available_quantity | INVENTORIES(warehouse_id, product_id) with balance/version and ledger keyed to Product IDs | Replace variant queries; concurrency-safe guarded writes and balance/ledger invariants need tests. |
| Goods receipt | Legacy receipt/item entity and DTO | Required goods_receipts.warehouse_id FK; one active warehouse resolved server-side in v1 | Update receipt create/confirm/detail contract; do not accept arbitrary warehouse selection from public client. |
| Checkout | CheckoutQuote Entity/Repository and legacy quote DTOs exist | Candidate stateless advisory quote plus Order idempotency key/fingerprint; mechanics pending DB-05 approval | Do not remove or reinterpret current quote API until DB-05 contract is accepted; then update retry/replay/conflict and error shapes together. |
| Voucher | Legacy targeting/usage shapes exist in models/migrations | Order-wide, non-stackable, no Product/Category targeting; usage_count present in target draft | Scope-related DTO fields may be breaking. Atomic usage limits/restoration must be agreed and tested before exposed as guarantee. |
| Order IDs and amounts | order_id/customer_account_id/BigDecimal legacy totals | orders.id/account_id; integer VND; total = subtotal - discount + shipping; idempotency key + fingerprint | All backend DTO serialization, error contracts, reports and FE money arithmetic require alignment. |
| Order item/address | Existing item fields and order recipient inline fields | OrderItem SKU/name/attribute/image/price/discount/line snapshots; separate ORDER_ADDRESSES | History DTO and placement request change; retaining immutable image object is still unproven. |
| Payment/refund | Legacy Payment field semantics differ | COD payment aggregate with integer VND and refund amount/actor/time/reason columns | Fields do not implement state transitions or idempotency; partial/full refund policy, auth and return/restock remain blockers. |
| Shipping | Legacy ShippingInfo mapping | Manual-shipping statuses/recipient/tracking target fields | Match enums/transitions/actors; do not imply external carrier integration. |
| Roles and permissions | Current RBAC controllers and mappings | Flyway system seed, external secret bootstrap, demo fixtures separate | Validate grants and bootstrap behavior; secrets must not be in SQL/source/demo seeds. |

## Current implementation disposition

- Backend target Entity/Repository alignment: **FAIL / not migrated**. Target SQL and legacy Java entity names/columns differ substantially.
- API/DTO target compatibility: **FAIL / mapping only**. The 87-row P1 API mapping describes existing endpoints and gaps; it is not runtime proof of the target API.
- Frontend compatibility: **NOT VERIFIED end-to-end**. Preserve visual presentation; update business types/services after owner-approved target API decisions.
- No active production API behavior was changed in this P1 documentation/schema-draft alignment. P2 must use request/response fixtures, error assertions, authorization and real database integration tests.
