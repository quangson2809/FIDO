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

- Cart reads and changes do not reserve stock.
- `POST /api/v1/checkout/quote` is a stateless, advisory calculation. It must not write a quote row, reserve stock, increment voucher usage or create an Order.
- At order placement, reload the authenticated account's Cart and current Product eligibility, selling prices, stock, voucher eligibility/quota and server-owned shipping inputs. Ignore client totals and re-calculate.
- If the current server-calculated result is no longer valid under the accepted order contract, return a typed conflict/requote response and create no Order.
- A quote identifier is not persisted or required by the target contract.

## 4. Order creation idempotency

Order creation uses the authenticated account scope and a canonical SHA-256 fingerprint of the semantic request:

1. Authenticate the caller and derive account scope from the security principal.
2. Canonicalize the semantic request and calculate its fingerprint server-side.
3. If the scoped key is already committed with the same fingerprint, return the prior result without repeating side effects.
4. If the scoped key exists with a different fingerprint, return a deterministic typed conflict without modifying the prior Order.
5. For concurrent duplicate requests, permit one commit. The losing transaction rolls back and then reads the winner to replay or conflict.
6. A key used by another account must not reveal another account's Order.
7. Keep the key/fingerprint associated with the Order for at least the Order's lifetime.

One transaction covers the Order, OrderItems, order address/Product/voucher/image snapshots, COD Payment, voucher counter, inventory balance/ledger, Cart mutation and required audit. Failure injection must prove complete rollback.

## 5. Money and voucher atomicity

- Money is integer VND end-to-end.
- Calculate the order-level discount with HALF-UP rounding to whole VND. Allocate to lines with the largest-remainder method and ascending `product_id` tie-break. Allocated discounts must sum exactly to the order discount; no line or order total may be negative.
- v1 vouchers are order-wide, non-stackable and governed by one global usage limit. Consume usage in the successful order transaction; restore at most once on eligible cancellation. A quote never consumes usage.
- Test the concurrent final-voucher race and repeated cancellation on MySQL.

## 6. Verification gates

Acceptance tests must cover last-stock races, receipt double-confirm, identical source events with different request keys, cancellation/return reversal, same-key order concurrency, changed-payload conflict, cross-account isolation, lost-response replay, voucher quota races, transaction rollback and ledger-to-balance reconciliation. Documentation or schema-only tests do not prove runtime transaction behavior.
