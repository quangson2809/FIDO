# FIDO P1 — Owner Approval Record (2026-10-23)

**Disposition:** The owner approved the proposed target defaults for DB-03, DB-05, DB-12 and the remaining DB-01/02/06–11/API contract details in the conversation dated 2026-10-23. This record freezes the accepted target behavior; it does not claim that runtime code or acceptance tests are already complete.

## 1. Clean Schema Reset — approved

- Use the owner-confirmed target ERD v2 with 31 logical tables as the target schema.
- Existing disposable development/test data may be discarded in full. Do not migrate, preserve, or crosswalk legacy development/test records solely to support the reset.
- Recreate the target schema from a clean baseline and seed it again according to the target contract: required system roles/permissions through Flyway; separate development/test fixture data; bootstrap SUPERADMIN through external secret/configuration, never hard-coded in source.
- This does **not** authorize deleting or resetting production, staging, shared integration, or any database with real/persistent business data. Before a reset, verify the exact host, database name and environment and obtain confirmation that the database is disposable.
- No database reset was executed when this approval was recorded. The clean-reset DDL remains isolated until the application mapping/activation step is ready.

## 2. DB-03 — Inventory, receipts, ledger and concurrency: APPROVED

Accepted target rules:

1. The v1 deployment has one operational warehouse. The server resolves it; clients cannot select an arbitrary warehouse.
2. The only approved movement types are `OPENING`, `GOODS_RECEIPT`, `ORDER`, `ORDER_CANCEL_REVERSAL`, `RETURN_RESTOCK` and `ADJUSTMENT`.
3. `OPENING` is a positive, explicit opening movement. `GOODS_RECEIPT` is positive and tied to one receipt item, recorded only on the first successful confirmation. `ORDER` is negative and tied to one order item after stock is revalidated. `ORDER_CANCEL_REVERSAL` is positive and references the original order deduction. `RETURN_RESTOCK` is positive only after an authorized return decision confirms that the item is sellable again; it references the order item and original movement, with no more than one restock reversal for an accepted return event. `ADJUSTMENT` has a non-zero signed delta, an authorized actor, a required reason code and an idempotency/correlation key.
4. A semantic source movement must not be applied twice even when retries use different request keys. Enforce this through a source-derived uniqueness strategy and guarded state transitions; an idempotency key alone is insufficient.
5. Receipt confirmation, order placement, cancellation, return/restock and adjustment are atomic across source state, inventory balance, ledger and required audit. Lock affected inventory in deterministic `product_id` order, use guarded non-negative balance updates and roll back the entire command on any failure.
6. Ledger history is append-only. Reversal means a new linked movement, never editing/deleting the original movement. Cart and quote do not reserve inventory.

## 3. DB-05 — Quote, idempotency and order-time repricing: APPROVED

Accepted target rules:

1. Do not create a persisted `CHECKOUT_QUOTES` table. A quote is stateless/advisory and has no stock or voucher side effects.
2. At placement, the authenticated server reloads the cart and rechecks current Product eligibility, price, stock, voucher eligibility/quota and server-owned shipping values. Client totals, prices, discounts, stock and account ID are untrusted.
3. Scope order-creation idempotency to the authenticated account. Derive the stored key namespace from the authenticated account and client operation key; never trust an account identifier supplied in the body. Persist a SHA-256 fingerprint of the canonical semantic request payload.
4. Same scoped key + same canonical payload + committed order replays the prior result without duplicating side effects. Same scoped key + different payload returns a deterministic typed conflict and never mutates the original order. Concurrent duplicate requests permit one commit; the loser rolls back, then replays or conflicts after reading the winner. A different account using the same client key must not discover another account's order.
5. Keep the idempotency record for at least the lifetime of the associated order; do not expire the key earlier than the order can be retried/referenced.
6. One transaction covers Order, OrderItems, immutable address and product/voucher/image snapshots, COD Payment, voucher counter, inventory balance/ledger, cart mutation and required audit. Any failure rolls back the full write set.
7. Money is integer VND. Calculate the order-level discount with HALF-UP rounding to the nearest VND, then allocate it by largest remainder with a stable tie-break (`product_id` ascending). Allocated line discounts must sum exactly to the order discount; no line/order total may be negative or contain fractional VND.

## 4. DB-12 — Deletion, foreign keys and history: APPROVED DEFAULTS; RETENTION PERIODS TBD

Accepted default lifecycle:

| Data class | Approved default |
|---|---|
| Accounts | Soft-delete. The phone identifier is unique among active accounts and may be reused after soft deletion. |
| Addresses and carts | Account-owned working data may be deleted when permitted; deleting an address must never alter the immutable order-address snapshot. Cart-item cascading is limited to cart working data. |
| Products, categories, brands, attributes, options, vouchers and warehouses | Prefer soft-delete/disable. Reject hard deletion while operational or historical references exist. |
| Inventory balances and goods receipts | Do not delete balances/receipts that still have stock or ledger/history references. A confirmed receipt is immutable; corrections use new documented movements. |
| Inventory transactions | Immutable and append-only; corrections use reversal/new movements. Never cascade-delete ledger history. |
| Orders, order items, order-address/voucher/image snapshots and payments | Preserve after placement; do not hard-delete merely because an account or product is deleted. Preserve historical order facts. |
| Audit logs | Append-only. No casual update/delete; retention period and lawful anonymization policy remain to be finalized. |
| Foreign keys | Use RESTRICT by default for business/history records. Use CASCADE only for explicitly disposable dependent working data, such as cart items. Use SET NULL only for a specifically approved optional reference where it preserves history and is consistent with the target ERD. |

**Still TBD:** the numeric retention duration for audit logs, image assets and personal/business data, and any required anonymization/deletion exceptions. Until those periods are approved, do not implement a scheduled purge of those records/assets. This does not block a clean reset of a verified disposable development/test database.

## 5. Other contract details — APPROVED PROPOSED DEFAULTS

- **DB-01 Product hierarchy:** parent and child Products are independently sellable, with their own required SKU, selling price and inventory. Children are created explicitly. v1 permits one parent-child level only. No field inherits implicitly from `NULL`; `sku` and `selling_price` are row-owned and never inherited. `name`, `slug` and `description` are explicit values rather than implicit runtime fallbacks; `slug` is separately defined for each Product. Category/brand references follow their own row values and target DDL nullability.
- **DB-02 Dynamic attributes:** attributes are descriptive and do not generate Products/variants. Accepted value types are `OPTION`, `TEXT`, `NUMBER` and `BOOLEAN`, with one value per Product/Attribute pair. The option must belong to the same Attribute. `is_variant_defining` is descriptive metadata only. Expose product-facing metadata only; no unapproved filter operators or combination-based auto-generation.
- **DB-06 Vouchers:** order-wide, non-stackable; no Product/Category targeting and no per-account quota ledger. Use a global limit. Increment `usage_count` atomically within successful order placement. Restore a consumed use at most once when an eligible order cancellation releases it; do not restore it again for repeated cancellation or refund/return by default. Voucher snapshot and counter update must commit atomically with the order.
- **DB-07 Snapshots/assets:** recipient/address, order items, prices/discounts, voucher and image reference are snapshots. Later catalog/address edits must not mutate an existing order. Image references must resolve to stable immutable content/version; do not overwrite/delete a referenced asset while its history-retention window is active. The numeric retention period remains TBD under DB-12.
- **DB-08 COD/refund:** one COD Payment aggregate per order and manual shipping. Use explicit Order/Payment/Shipping transitions and role-authorized actors. v1 accepts at most one full refund for an order; partial and multiple refunds and a detailed item-level return/exchange workflow are out of scope unless the owner amends the ERD. Order/stock/refund/audit changes are atomic and idempotent.
- **DB-09 Physical data:** active-phone uniqueness with soft-delete reuse, BIGINT identifiers, UTC `TIMESTAMP(6)`, integer VND/BIGINT, explicit bounded text, nullability/defaults, checks/indexes, and restrictive foreign-key defaults. Exact generated SQL/JPA constraints must be verified against the dictionary and MySQL.
- **DB-10 Money:** VND only, integer values throughout storage/API/calculation/reporting. Discount rounding and allocation follow Section 3 above; totals reconcile as subtotal − total discounts + shipping.
- **DB-11 Bootstrap/seeds:** Flyway seeds required roles and permissions; bootstrap SUPERADMIN credentials come from external secret/configuration; development fixture data is separate; no committed secrets or seeded demo account credentials.
- **API/DTO/UC:** Cart and order placement require authentication. Target APIs use `product_id`, not `variant_id`. The old size/color/variant endpoints must be removed or explicitly mapped to dynamic attributes and Products; unsupported legacy tables/endpoints must not be reintroduced silently. Catalog metadata uses the approved typed-attribute shape described above. Runtime requests/responses and frontend services must be reconciled before claiming compatibility.

## 6. Acceptance boundary after owner approval

Owner approval closes the **decision** portion of these gates; it does not automatically make P1 PASS. Remaining engineering acceptance requires:

- target ERD, DDL, data dictionary, API/DTO/UC matrices and reset runbook to agree;
- Entity/Repository/service/API/DTO/frontend mappings to the accepted Product-ID, integer-VND, idempotency, voucher and snapshot contracts;
- MySQL tests for stock race/reversal/source dedupe, checkout replay/conflict/rollback, voucher quota, rounding reconciliation, delete/FK behavior and seed/bootstrap;
- source/configuration security audit for external SUPERADMIN bootstrap; and
- explicit approval of numeric retention periods before introducing automatic data/image purging or declaring the retention policy fully frozen.

**P2 clean-reset implementation is authorized for a verified disposable development/test database only.** The approval is not permission to reset any unspecified database and no actual reset was performed by this documentation change.
