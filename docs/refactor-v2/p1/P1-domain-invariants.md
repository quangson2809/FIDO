# P1 — Owner-Approved Domain Invariants

**Status: PARTIAL.** The target behavior below reflects the owner approval dated 2026-10-23. Runtime implementation, authorization, transaction, concurrency and end-to-end tests remain open. Numeric retention durations and anonymization/deletion exceptions remain TBD under DB-12.

## Account and RBAC

- **INV-ACC-01:** Phone is the login identity; canonicalize Vietnamese `0` + 9 digit or `+84` + 9 digit inputs (allow common whitespace/`-()` separators) to `+84` + 9 digits before lookup and uniqueness enforcement. The canonical phone is unique among active Accounts; soft deletion releases it for reuse. Generic wrong-credential messaging must not reveal account existence.
- **INV-ACC-02:** /me resources, saved addresses and customer Orders are scoped to the authenticated principal. Request-supplied Account IDs do not grant access.
- **INV-ACC-03:** Public registration creates an `ACTIVE` Account and atomically assigns the seeded `CUSTOMER` Role; staff-account creation starts `ACTIVE` with SUPERADMIN-assigned roles. Only `ACTIVE` may receive tokens/use protected APIs. Wrong credentials return generic `401 INVALID_CREDENTIALS`; valid credentials for any non-ACTIVE Account return `403 ACCOUNT_NOT_ACTIVE` without disclosing exact status. Protected requests re-check current status.
- **INV-RBAC-01:** Resolve grants through target role data. For ordinary Roles, `permission_ids` omitted retains, `[]` clears, non-empty replaces the full set atomically with audit. The `SUPERADMIN` Role always remains ACTIVE and has every Permission; create Permission + SUPERADMIN grant atomically. Seed Permissions are undeletable; custom Permission cannot be deleted while granted to a non-SUPERADMIN Role. At least one non-soft-deleted ACTIVE Account must retain the ACTIVE SUPERADMIN Role under concurrent updates. Role/Permission technical codes are immutable.
- **INV-SEED-01:** Seed system roles/permissions through Flyway; keep demo fixtures separate. Bootstrap SUPERADMIN credentials come from external secret/configuration and are never committed.

## Product, attributes and images

- **INV-PROD-01:** Product parent/child depth is at most one. Reject self-parenting, cycles and invalid parent references.
- **INV-PROD-02:** Parent and child Product rows are independently sellable. Each row owns its own Product ID, SKU, required integer-VND selling price and stock.
- **INV-PROD-03:** NULL name/slug/description means the stored field is NULL; it does not implicitly inherit a parent value. No other field may acquire implicit inheritance.
- **INV-ATTR-01:** Dynamic attributes support OPTION, TEXT, NUMBER and BOOLEAN. A value must match the authoritative Attribute type and exactly one compatible value is populated.
- **INV-ATTR-02:** An OPTION value must reference an option belonging to the same Attribute. `is_variant_defining` is informational only: attributes do not generate child Products or define a composite sale identity.
- **INV-IMG-01:** Order-time ORDER_ITEMS.image_url_snapshot must reference immutable retained object/version content. Never reconstruct historical Order images from the current Product gallery. Numeric retention duration and legal exceptions remain TBD; automatic purge is disabled pending approval.
- **INV-IMG-02:** A Product gallery is empty or has exactly one primary image at sort_order 0. Non-empty gallery positions are unique and contiguous from zero; upload/remove/reorder update positions and is_primary atomically. The P1.9 owner amendment selects unique (product_id, sort_order) in the isolated clean-reset target DDL. The index prevents duplicates; per-Product transaction/locking still maintains contiguity and the primary-image invariant. A populated-database rollout requires an approved duplicate/gap/primary preflight and repair.
- **INV-PROD-04:** SKU is globally unique and required for every Product row; selling_price is required whole-VND and belongs to that row. Neither parent nor child inherits SKU, price, stock, category, brand or descriptive fields.

## Cart, checkout and Order

- **INV-CART-01:** Persisted Cart operations, quote access and Order placement require authentication. There are no guest Cart/order flows or cart merges in target v1.
- **INV-CART-02:** Cart item identity is (Cart, Product); use product_id. Quantity must be positive. Cart and quote do not reserve/deduct stock.
- **INV-CART-03:** The schema does not imply one-active-Cart uniqueness or merge. If multiple Cart rows exist for an Account, current-Cart resolution must be defined explicitly in the API/workflow contract before implementing Cart/quote/Order; do not silently choose by update time.
- **INV-PRICE-01:** The server controls Product price, discount, shipping fee, subtotal and total. At Order placement, reload/reprice current server-side Product, stock, voucher and shipping inputs.
- **INV-QUOTE-01:** Quote is stateless/advisory: no CHECKOUT_QUOTES row, quote_id, stock reservation, voucher mutation or Order side effect.
- **INV-ORDER-01:** Create-order idempotency is scoped to authenticated Account plus operation and key, with a canonical SHA-256 semantic-request fingerprint. Same key/payload replays the committed result; changed payload conflicts; a different Account cannot access another result. The HTTP transport for the key must be specified in the API contract.
- **INV-ORDER-02:** Money is VND-only whole integer storage. `subtotal = Σ(unit_price × quantity)` before discount/shipping; calculate one order-wide Voucher discount using FIXED VND or PERCENT basis points (100 bps=1%), HALF_UP the PERCENT result, apply optional VND cap and subtotal bound, then allocate by largest remainder with ascending Product ID tie-break. Line discounts sum exactly to Order.discount_amount; line_total = gross − allocated discount; total_amount = subtotal − discount_amount + shipping_fee; Payment.amount equals Order.total_amount. See P1.5.
- **INV-ORDER-03:** Capture Product/SKU/name/attribute/quantity/price/discount/line/image facts and recipient/voucher snapshots at placement. Later source edits never rewrite placed Order facts.
- **INV-ORDER-04:** Use the approved Order state/actor matrix; Order, Payment, inventory and required audit side effects commit atomically.
- **INV-ADDR-01:** Saved Address and ORDER_ADDRESSES are different aggregates. Editing a saved Address must not rewrite an OrderAddress snapshot. If saved addresses exist, exactly one is default; the first address defaults automatically and switching/deleting/unsetting promotes the most recently updated remaining address atomically (tie-break ID descending).

## Voucher, COD and shipping

- **INV-VOUCHER-01:** One Voucher may be applied to an Order; voucher discounts are order-wide and non-stacking. No Product/Category targeting, per-account usage cap or per-account usage ledger is part of v1.
- **INV-VOUCHER-02:** Eligibility requires normalized code, ACTIVE status, UTC time in `[starts_at, ends_at)` with NULL as an open bound, merchandise subtotal before discount/excluding shipping ≥ minimum_order_value, and `usage_limit IS NULL OR usage_count < usage_limit`.
- **INV-VOUCHER-03:** FIXED discount_value is VND; PERCENT discount_value is integer basis points (100 bps=1%). Calculate order discount once; HALF_UP percent calculation, optional VND cap and subtotal bound follow P1.5. Allocate via largest remainder with ascending Product ID tie-break; no per-line rounding.
- **INV-VOUCHER-04:** Quote is advisory and does not consume/reserve quota. Successful Order placement increments global usage_count once atomically with Order and immutable snapshot. Counter guard protects the final global use and must not exceed usage_limit.
- **INV-VOUCHER-05:** usage_count is net committed uses not released by eligible cancellation. P1.7 determines when to invoke a release; P1.5 defines one guarded decrement in the same cancellation transaction. No release on quote, failed Order placement, refund or return by default.
- **INV-VOUCHER-06:** Order snapshot stores normalized code, discount_type, raw discount_value (VND or bps according to type) and actual applied VND discount. Later Voucher edits never rewrite Order snapshots. Same logical Order retry cannot consume quota twice under P1.6 idempotency.
- **INV-PAY-01:** COD only. Collection/refund actor and time are server-derived by an authorized command.
- **INV-PAY-02:** One Payment aggregate per Order; at most one full refund per Order in v1. Partial/multiple refunds are out of target. Duplicate collection/refund is rejected and side effects are atomic.
- **INV-SHIP-01:** Shipping is manual; no carrier API or automatic tracking integration. Use approved ShippingInfo state/actor matrix and preserve order-time receiver facts.

## Inventory, Supplier and Goods Receipt

- **INV-STOCK-01:** INVENTORIES uses composite key `(warehouse_id, product_id)`; `quantity_on_hand` is `0..2,147,483,647`, and `version` is server-owned/non-negative. v1 uses one operational ACTIVE warehouse resolved by the server.
- **INV-STOCK-02:** Missing balance reads quantity 0/version 0. A positive first movement inserts a zero row if absent, then locks/re-reads and applies the delta within the transaction; a negative movement against missing/zero stock fails without residue.
- **INV-STOCK-03:** Every committed non-zero movement changes balance, increments version exactly once, appends one matching immutable INVENTORY_TRANSACTIONS row and writes required audit in one transaction. No balance write without a ledger movement.
- **INV-STOCK-04:** Only OPENING, GOODS_RECEIPT, ORDER, ORDER_CANCEL_REVERSAL, RETURN_RESTOCK and ADJUSTMENT are approved. Type/sign/source/actor/reason/reversal rules follow [P1.4 Inventory Contract](P1.4-inventory-contract.md).
- **INV-STOCK-05:** Source identity is deduplicated independently of the HTTP retry key. Receipt-item, OrderItem, reversal and accepted return-event identities remain stable across retries. ADJUSTMENT has a stable `source_operation_id` separate from transport idempotency.
- **INV-STOCK-06:** Lock source aggregate first, source lines in stable order, then balances by ascending product_id. Use row lock or guarded version update, enforce both quantity bounds, check affected-row count and roll back source/balance/ledger/audit together.
- **INV-STOCK-07:** Ledger is append-only. ORDER_CANCEL_REVERSAL and RETURN_RESTOCK link to the original ORDER deduction. An exact full correction has the opposite signed delta; never modify/delete the original movement.
- **INV-STOCK-08:** From a zero baseline where initial stock is represented by OPENING, `quantity_on_hand = SUM(quantity_delta)` by warehouse/Product; version equals the count of committed balance-changing movements. Reconciliation reports and never silently rewrites.
- **INV-STOCK-09:** ADJUSTMENT requires non-zero delta, authorized actor, controlled reason_code and stable source_operation_id. Same ID/same payload replays; same ID/different payload conflicts. Negative adjustment cannot overdraw stock.
- **INV-RECEIPT-01:** GoodsReceipt is DRAFT/CONFIRMED/CANCELLED; only DRAFT is editable. CONFIRM requires at least one valid positive-quantity Product line and atomically posts one GOODS_RECEIPT movement per item. CANCEL is DRAFT-only and posts no movement.
- **INV-RECEIPT-02:** Concurrent/retried confirmation is guarded by source identity and DRAFT→CONFIRMED. confirmed_by/confirmed_at are set once; confirmed facts/lines are immutable. Corrections require a new authorized movement.
- **INV-WH-01:** In v1 callers cannot pick an arbitrary warehouse. Missing/ambiguous operational warehouse resolution fails closed; receipt, balance and movement must use the same resolved/stored warehouse.

## Audit, content, soft deletion and reports

- **INV-AUDIT-01:** Before/after JSON must exclude password/hash, tokens, OTP, cookies/session IDs, secrets, raw Authorization headers and unnecessary PII.
- **INV-AUDIT-02:** Actor attribution comes from authenticated/system context; correlation IDs are not identity.
- **INV-CONTENT-01:** Public content reads return published pages only. Use target slug/status semantics; no version/event table is implied.
- **INV-SOFTDELETE-01:** Prefer disabling/soft deletion for referenced Account/catalog/voucher/warehouse records. RESTRICT is the default for business/history FKs; CASCADE only for approved disposable dependent data. Preserve placed Order, Payment, ledger and audit history.
- **INV-REPORT-01:** Apply the approved report formulas, Asia/Ho_Chi_Minh date boundaries and return adjustment policy consistently across backend/frontend.

## Acceptance boundary

The canonical ERD, owner approval and data dictionary are the target authority. Existing Entities/Repositories/APIs/frontend may be used to locate mismatches only. Use the P1 traceability and API mapping files to report implementation status; do not turn old behavior into target requirements.

P1 remains PARTIAL until fresh-target MySQL checks, application mappings, RBAC/security, source/balance/ledger transaction tests, quote/idempotency replay/conflict tests, voucher race tests, immutable image history and frontend/API acceptance all pass on the exact candidate SHA. Clean Schema Reset is allowed only on an identified disposable local/development/test database.
