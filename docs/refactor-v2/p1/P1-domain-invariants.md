# P1 — Owner-Approved Domain Invariants

**Status: PARTIAL.** The target behavior below reflects the owner approval dated 2026-10-23. Runtime implementation, authorization, transaction, concurrency and end-to-end tests remain open. Numeric retention durations and anonymization/deletion exceptions remain TBD under DB-12.

## Account and RBAC

- **INV-ACC-01:** Phone is the login identity and is unique among active Accounts. Soft deletion releases the phone for reuse. Generic credential-failure messaging must not reveal whether an account exists.
- **INV-ACC-02:** /me resources, saved addresses and customer Orders are scoped to the authenticated principal. Request-supplied Account IDs do not grant access.
- **INV-ACC-03:** Account status literals are ACTIVE, PENDING_APPROVAL, LOCKED and SUSPENDED. Status-specific login/session effects must follow the API/security contract.
- **INV-RBAC-01:** Resolve effective grants from target role/permission data. Role/permission mutation and required audit are atomic; preserve the last-SUPERADMIN invariant under concurrent updates.
- **INV-SEED-01:** Seed system roles/permissions through Flyway; keep demo fixtures separate. Bootstrap SUPERADMIN credentials come from external secret/configuration and are never committed.

## Product, attributes and images

- **INV-PROD-01:** Product parent/child depth is at most one. Reject self-parenting, cycles and invalid parent references.
- **INV-PROD-02:** Parent and child Product rows are independently sellable. Each row owns its own Product ID, SKU, required integer-VND selling price and stock.
- **INV-PROD-03:** NULL name/slug/description means the stored field is NULL; it does not implicitly inherit a parent value. No other field may acquire implicit inheritance.
- **INV-ATTR-01:** Dynamic attributes support OPTION, TEXT, NUMBER and BOOLEAN. A value must match the authoritative Attribute type and exactly one compatible value is populated.
- **INV-ATTR-02:** An OPTION value must reference an option belonging to the same Attribute. `is_variant_defining` is informational only: attributes do not generate child Products or define a composite sale identity.
- **INV-IMG-01:** Order-time ORDER_ITEMS.image_url_snapshot must reference immutable retained object/version content. Never reconstruct historical Order images from the current Product gallery. Numeric retention duration and legal exceptions remain TBD; automatic purge is disabled pending approval.

## Cart, checkout and Order

- **INV-CART-01:** Persisted Cart operations, quote access and Order placement require authentication. There are no guest Cart/order flows or cart merges in target v1.
- **INV-CART-02:** Cart item identity is (Cart, Product); use product_id. Quantity must be positive. Cart and quote do not reserve/deduct stock.
- **INV-CART-03:** The schema allows the possibility of more than one Cart row for an Account; an automatic one-active-Cart constraint or merge policy is not inferred. Specify a deterministic current-Cart resolution rule before implementing Cart/checkout if multiple rows may exist.
- **INV-PRICE-01:** The server controls Product price, discount, shipping fee, subtotal and total. At Order placement, reload/reprice current server-side Product, stock, voucher and shipping inputs.
- **INV-QUOTE-01:** Quote is stateless/advisory: no CHECKOUT_QUOTES row, quote_id, stock reservation, voucher mutation or Order side effect.
- **INV-ORDER-01:** Create-order idempotency is scoped to authenticated Account plus operation and key, with a canonical SHA-256 semantic-request fingerprint. Same key/payload replays the committed result; changed payload conflicts; a different Account cannot access another result. The HTTP transport for the key must be specified in the API contract.
- **INV-ORDER-02:** Money is whole VND in integer storage. Calculate order discount using HALF-UP rounding once at order level, then allocate by largest remainder with ascending Product ID tie-break. Line discounts sum exactly to the order discount; totals are reconciled and non-negative.
- **INV-ORDER-03:** Capture Product/SKU/name/attribute/quantity/price/discount/line/image facts and recipient/voucher snapshots at placement. Later source edits never rewrite placed Order facts.
- **INV-ORDER-04:** Use the approved Order state/actor matrix; Order, Payment, inventory and required audit side effects commit atomically.
- **INV-ADDR-01:** Saved Address and ORDER_ADDRESSES are different aggregates. Editing a saved Address must not rewrite an OrderAddress snapshot.

## Voucher, COD and shipping

- **INV-VOUCHER-01:** Voucher is order-wide and non-stackable. There is one global usage limit; no Product/Category targeting and no per-account usage ledger.
- **INV-VOUCHER-02:** Increment voucher usage atomically with successful Order placement; restore at most once on eligible cancellation. A quote never consumes usage.
- **INV-VOUCHER-03:** Snapshot voucher code/type/value/discount so later voucher edits cannot rewrite historical Orders. Test the concurrent final-use race and cancellation retries.
- **INV-PAY-01:** COD only. Collection/refund actor and time are server-derived by an authorized command.
- **INV-PAY-02:** One Payment aggregate per Order; at most one full refund per Order in v1. Partial/multiple refunds are out of target. Duplicate collection/refund is rejected and side effects are atomic.
- **INV-SHIP-01:** Shipping is manual; no carrier API or automatic tracking integration. Use the approved ShippingInfo state/actor matrix and preserve order-time receiver facts.

## Inventory, Supplier and Goods Receipt

- **INV-STOCK-01:** INVENTORIES is keyed by (warehouse_id, product_id), tracks quantity_on_hand and version, and never becomes negative. v1 uses one operational warehouse resolved by the server.
- **INV-STOCK-02:** Every movement updates source state, Product balance, append-only INVENTORY_TRANSACTIONS and required audit in one transaction.
- **INV-STOCK-03:** Approved movement types are OPENING, GOODS_RECEIPT, ORDER, ORDER_CANCEL_REVERSAL, RETURN_RESTOCK and ADJUSTMENT. Enforce source/sign rules and semantic-source dedupe independently of client request keys.
- **INV-STOCK-04:** Lock stock rows in deterministic ascending Product ID order. Guard balance/version updates and check affected-row count; @Transactional alone is insufficient to prevent lost updates.
- **INV-STOCK-05:** Correct mistakes with linked compensating movements. Never update/delete an original ledger entry. Receipt confirmation, Order placement/cancellation, eligible restock and adjustment must be atomic with source state and audit.
- **INV-RECEIPT-01:** GoodsReceipt is DRAFT/CONFIRMED/CANCELLED; only DRAFT is editable and CONFIRMED posts stock once. Confirmed stock-affecting lines are immutable.
- **INV-STOCK-06:** ADJUSTMENT requires a non-zero delta, authenticated actor and reason code; reject invalid/duplicate source movements and insufficient stock.

## Audit, content, soft deletion and reports

- **INV-AUDIT-01:** Before/after JSON must exclude password/hash, tokens, OTP, cookies/session IDs, secrets, raw Authorization headers and unnecessary PII.
- **INV-AUDIT-02:** Actor attribution comes from authenticated/system context; correlation IDs are not identity.
- **INV-CONTENT-01:** Public content reads return published pages only. Use target slug/status semantics; no version/event table is implied.
- **INV-SOFTDELETE-01:** Prefer disabling/soft deletion for referenced Account/catalog/voucher/warehouse records. RESTRICT is the default for business/history FKs; CASCADE only for approved disposable dependent data. Preserve placed Order, Payment, ledger and audit history.
- **INV-REPORT-01:** Apply the approved report formulas, Asia/Ho_Chi_Minh date boundaries and return adjustment policy consistently across backend/frontend.

## Acceptance boundary

The canonical ERD, owner approval and data dictionary are the target authority. Existing Entities/Repositories/APIs/frontend may be used to locate mismatches only. Use the P1 traceability and API mapping files to report implementation status; do not turn old behavior into target requirements.

P1 remains PARTIAL until fresh-target MySQL checks, application mappings, RBAC/security, source/balance/ledger transaction tests, quote/idempotency replay/conflict tests, voucher race tests, immutable image history and frontend/API acceptance all pass on the exact candidate SHA. Clean Schema Reset is allowed only on an identified disposable local/development/test database.
