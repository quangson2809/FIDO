# 07 — Transactions, Concurrency and Idempotency

## 1. General transaction rules

- Each business command has one owning module service. Cross-module writes call the owner module service; they do not bypass it through another module's Repository.
- A transaction must include the aggregate/source state change, related balance/ledger updates and required audit records. If any part fails, all parts roll back.
- Validate authorization and business preconditions on the server. Client-provided totals, prices, discounts, stock counts, statuses and account identifiers are not authoritative.
- Use the target ERD and P1 Data Dictionary for physical keys and constraints. Do not create persistence that the approved 31-table target does not contain.

## 2. Inventory movements

Every stock command updates `INVENTORIES(warehouse_id, product_id, quantity_on_hand, version)`, appends a matching `INVENTORY_TRANSACTIONS` row and writes required audit information in one transaction.

| Type | Direction and source requirement |
|---|---|
| `OPENING` | Positive delta; an explicit opening-balance command with actor and idempotency/correlation evidence. |
| `GOODS_RECEIPT` | Positive delta tied to one `GOODS_RECEIPT_ITEMS` row; applied once on successful receipt confirmation. |
| `ORDER` | Negative delta tied to the affected `ORDER_ITEMS` row after stock is revalidated at placement. |
| `ORDER_CANCEL_REVERSAL` | Positive delta linked to the original order deduction through `reverses_transaction_id`; never edits the original ledger row. |
| `RETURN_RESTOCK` | Positive delta only after an authorized decision confirms the returned Product is sellable; link the order item and original movement and prevent duplicate restock. |
| `ADJUSTMENT` | Non-zero signed delta, authenticated actor, required `reason_code`, and idempotency/correlation key. |

Source-specific uniqueness must prevent a business event from applying more than once even when retries use different request keys. An idempotency key by itself is insufficient.

Lock affected inventory rows in deterministic ascending `product_id` order, use guarded non-negative balance updates, and reject stale/conflicting commands. Receipt confirmation, order placement, cancellation, accepted return/restock and manual adjustment must commit the source status, stock balance, ledger and audit together.

The ledger is append-only. Corrections are represented by a linked reversal/new movement; never update or delete the original movement to “fix” the balance.

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
