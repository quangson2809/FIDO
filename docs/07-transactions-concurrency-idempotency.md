# 07 — Transactions, Concurrency and Idempotency

## 1. General transaction rules

- Each business command has one owning module service. Cross-module writes call the owner module service; they do not bypass it through another module's Repository.
- A transaction must include the aggregate/source state change, related balance/ledger updates and required audit records. If any part fails, all parts roll back.
- Validate authorization and business preconditions on the server. Client-provided totals, prices, discounts, stock counts, statuses and account identifiers are not authoritative.
- Use the target ERD and P1 Data Dictionary for physical keys and constraints. Do not create persistence that the approved 31-table target does not contain.

## 2. Inventory movements

The normative details are in [P1.4 Inventory Contract](refactor-v2/p1/P1.4-inventory-contract.md). This section is the cross-domain transaction summary; it does not assign Order transition ownership to Inventory.

Every non-zero stock command updates `INVENTORIES(warehouse_id, product_id, quantity_on_hand, version)`, appends exactly one matching `INVENTORY_TRANSACTIONS` row and writes required audit in one transaction. No subset may commit independently.

### 2.1 Movement type, sign and source

| Type | Direction and source requirement |
|---|---|
| `OPENING` | Positive only; explicit authorized opening, at most once per warehouse/Product pair. |
| `GOODS_RECEIPT` | Positive, equal to persisted receipt-item quantity; posts once on first successful receipt confirmation. |
| `ORDER` | Negative; derives quantity from OrderItem after the Order owner requests an approved effect and revalidates stock. P1.7 owns transition timing. |
| `ORDER_CANCEL_REVERSAL` | Positive exact inverse linked to the original ORDER deduction; at most once for the cancellation source. |
| `RETURN_RESTOCK` | Positive and within remaining eligible quantity; linked to OrderItem/original ORDER and stable authorized return-event identity. |
| `ADJUSTMENT` | Non-zero signed delta, authorized actor, controlled `reason_code` and stable `source_operation_id`; cannot overdraw stock. |

Unknown types and invalid source/sign combinations are rejected. A correction is a new linked movement; never update/delete the original. Cart and quote never reserve stock.

### 2.2 Missing row, bounds, version and locking

- A missing balance reads quantity 0/version 0; read is side-effect-free. For a positive movement, insert a zero row if absent, lock/re-read it and apply the delta in the same transaction. A negative movement against missing/zero stock fails and rolls back any attempted row creation.
- Quantity range is `0..2,147,483,647`. Version is server-owned, starts at 0 and increments once per committed movement; reject stale expected_version and version overflow. Client cannot set balance/version.
- Lock source aggregate first, source lines in stable order, then balance keys in ascending `product_id` order (warehouse ID tie-break if a future approved scope expands). Use SELECT FOR UPDATE or guarded compare-and-swap, enforce `quantity_on_hand + delta >= 0`, check upper bound and verify exactly one updated row.
- The stored unique `idempotency_key` is a server-derived semantic source key, not just an HTTP retry key. Receipt item/OrderItem/reversal/return-event identity must survive a retry under a different request key. Adjustments require a stable `source_operation_id` separate from the transport key; same ID/different canonical payload conflicts.

### 2.3 Receipt lifecycle and atomicity

GoodsReceipt is `DRAFT`, `CONFIRMED` or `CANCELLED`. Only DRAFT is editable. Confirmation requires at least one valid line and atomically claims DRAFT→CONFIRMED, posts one positive GOODS_RECEIPT movement per line, updates balance/version, sets confirmed actor/time and writes audit. CANCEL is DRAFT-only and has no stock effect. Concurrent/retried confirm never posts twice. Confirmed receipt facts/lines are immutable; correction uses a new authorized movement.

### 2.4 Reconciliation

From a zero baseline where all initial stock uses OPENING, `quantity_on_hand = SUM(INVENTORY_TRANSACTIONS.quantity_delta)` per warehouse/Product and version equals the count of committed balance-changing movements. Reconciliation reports discrepancies; it never rewrites balances or ledger history.

A transaction includes applicable source state, guarded balance/version update, exactly one semantic-keyed ledger row and required audit. Receipt confirm, Order inventory effect as requested by its owner, cancellation compensation, authorized return restock and adjustment roll back as a unit. Deadlock, stale version, duplicate source, insufficient stock, overflow or audit failure must not leave partial state.

## 3. Cart and checkout quote

The normative Cart API, quantity semantics, ambiguity handling and request-key/replay protocol are in [P1.6 Cart and Checkout Contract](refactor-v2/p1/P1.6-cart-checkout-contract.md).

- Guest Cart/order placement is excluded by owner-approved A-03. The current Cart is the sole Cart owned by the authenticated Account with `status=OPEN`. If none exists, reads return empty without writing; mutations may create one atomically. If multiple OPEN rows exist, return `409 CART_SELECTION_AMBIGUOUS` without selecting, merging or mutating any Cart. The schema has no one-active-Cart uniqueness constraint; P3.8 must serialize Account-scoped creation/mutations.
- Cart add/update/remove/clear never reserve or deduct stock. Quantity is intent only. Product state/availability can change; quote and Order creation revalidate.
- `POST /api/v1/checkout/quote` is stateless/advisory: no quote row, `quote_id`, stock reservation, Cart/Voucher mutation or Order write. It is not an optimistic lock or authorization to place an Order.
- `POST /api/v1/orders` has no `quote_id` dependency. The server resolves and locks the current Cart, re-loads current Product eligibility/price/stock, Voucher eligibility/quota and server-owned shipping inputs, recalculates through P1.5 and writes the approved create effects atomically. Failure rolls back the entire write set.
- P1.6 defines idempotency transport/fingerprint/replay. P1.4 owns Inventory mechanics, P1.5 owns money/Voucher rules, P1.7 owns Order lifecycle timing. P3.8 implements Cart; P3.9 implements quote and Order creation.

## 4. Order creation idempotency

Wire format and semantics are normative in [P1.6 Cart and Checkout Contract](refactor-v2/p1/P1.6-cart-checkout-contract.md).

1. Require `Idempotency-Key` on `POST /api/v1/orders`; validate the 1–128 ASCII character grammar and treat values as case-sensitive.
2. Store an Account-scoped key as decimal authenticated Account ID + `:` + lowercase hexadecimal SHA-256 of the raw client key. Do not store the raw key or accept Account ID from the body. The stored value fits `ORDERS.idempotency_key VARCHAR(120)`.
3. Normalize semantic request fields (recipient/address and optional normalized Voucher code), deterministically canonicalize, and persist lowercase hexadecimal SHA-256 to `ORDERS.request_fingerprint`. Exclude the key, token, Cart lines, quote and live server price/stock/quota/shipping calculations.
4. Same scoped key + same fingerprint + committed Order returns the original `201 Created`, body and `Location`, with `Idempotency-Replayed: true`, before Cart resolution. Same key + changed fingerprint returns `409 IDEMPOTENCY_PAYLOAD_MISMATCH` without mutation.
5. Concurrent duplicate requests commit at most once. The loser rolls back, then reads the winner to replay or conflict. A uniqueness race must not leave side effects or surface avoidable untyped failure.
6. Retry a lost response with the exact key/body. Use a new key for a different purchase. Keep key/fingerprint for at least the Order lifetime; replay cannot duplicate Order, Cart consumption, Voucher use or Inventory effects.
7. Order + item/snapshot rows + COD Payment + Voucher counter + Cart consumption + audit + applicable Inventory effects are one transaction. Any required write failure rolls it all back.

## 5. Money and voucher atomicity

Normative arithmetic and Voucher eligibility rules are in [P1.5 Pricing and Voucher Contract](refactor-v2/p1/P1.5-pricing-voucher-contract.md).

- All currency values are whole VND integers. FIXED Voucher `discount_value` is VND; PERCENT `discount_value` is integer basis points (100 bps=1%). Use exact integer arithmetic and overflow-safe intermediates.
- `subtotal = Σ(unit_price × quantity)` before discount/shipping. Calculate one order-level Voucher discount: FIXED candidate is the configured VND value; PERCENT candidate is `ROUND_HALF_UP(subtotal × bps / 10,000)`. Apply an optional VND `maximum_discount` cap, then cap by subtotal.
- Allocate that integer discount by largest remainder proportional to line gross; ties use ascending `product_id`. Each line total is gross minus allocated line discount. `ORDERS.discount_amount = Σ(ORDER_ITEMS.discount_amount)`, `ORDERS.total_amount = subtotal - discount_amount + shipping_fee`, and `PAYMENTS.amount = ORDERS.total_amount`; all totals are non-negative.
- Voucher eligibility at placement requires normalized code, ACTIVE status, `starts_at ≤ now < ends_at` for non-null UTC bounds, subtotal before discount/excluding shipping ≥ minimum_order_value, and remaining global quota. One Voucher per order; no stacking, Product/Category targeting, per-account caps or usage ledger.
- Quote never reserves or mutates voucher quota. Successful placement guards and increments `usage_count` exactly once inside the Order transaction together with snapshots, Payment, Cart, inventory and audit. A race for the final global use has at most one winner; rollback of Order creation rolls back the increment.
- `usage_count` is net committed uses not released by an eligible cancellation. P1.7 decides when cancellation invokes the P1.5 release operation; when invoked, decrement once in the same guarded cancellation transaction. Repeat cancellation cannot decrement twice. Refund/return does not release quota by default.
- Order-time Voucher snapshots preserve normalized code, type, configured value and actual applied discount. Later Voucher edits only affect future placements. No per-account usage ledger or other persistence is implied.
## 6. Verification gates

Acceptance tests must cover last-stock races, receipt double-confirm, identical source events with different request keys, cancellation/return reversal, same-key order concurrency, changed-payload conflict, cross-account isolation, lost-response replay, voucher quota races, transaction rollback and ledger-to-balance reconciliation. Documentation or schema-only tests do not prove runtime transaction behavior.
