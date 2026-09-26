# 07 — Transactions, Concurrency & Idempotency

## 1. Principle

Any operation that changes business state plus stock/payment/audit must have one explicit transactional boundary in the Service layer. Do not scatter partial commits across controllers or repository calls.

## 2. Confirm Order transaction

Required algorithm:

1. Start transaction.
2. Load Order and continue only if current status is `PENDING`.
3. Lock or use an atomic conditional update for every involved `inventories` row.
4. Validate sufficient inventory for **all** OrderItems.
5. If any Variant is insufficient: rollback the entire operation.
6. Decrement `available_quantity` for all items.
7. Insert `ORDER_CONFIRM_OUT` InventoryTransaction rows.
8. Change Order to `CONFIRMED` with current-state guard.
9. Write required audit record.
10. Commit.

Repeat request after successful CONFIRMED must not deduct again. Competing confirmations must never create negative stock.

Implementation technique (pessimistic lock vs conditional update) may follow the existing DB/repository technology; semantics above are mandatory.

## 3. Cancel after deduction

- If the Order has actually consumed stock, cancellation restores the exact quantity once via `ORDER_CANCEL_IN`.
- If Order is still PENDING, no inventory movement.
- State change + stock restoration + ledger + audit must succeed or rollback together.
- Retry must not create a second restoration.

## 4. GoodsReceipt confirm

1. Require DRAFT.
2. Conditional DRAFT -> CONFIRMED update; if no row changes, no stock increment.
3. Upsert/increment each Variant inventory.
4. Create `RECEIPT_IN` ledger rows linked to GoodsReceipt.
5. Set `confirmed_by`, `confirmed_at` and audit in same transaction.
6. Do not mutate confirmed item quantities afterward.

## 5. COD collect/refund

- One Payment per Order (`payments.order_id` PK/FK).
- Conditional state changes: UNPAID -> PAID, PAID -> REFUNDED.
- Actor/time/amount updated once.
- Retry cannot add amount again.
- COMPLETE is rejected unless current Payment is PAID.

## 6. Manual inventory adjustment

- Requires authorization and non-empty reason.
- `quantity_delta != 0`.
- Derive IN/OUT direction from sign.
- Inventory row update + ledger row + audit are one business transaction.
- Reject result below zero.
- No ordinary API/service may directly overwrite `available_quantity` without ledger movement.

## 7. Delivery failure / return

- `DELIVERY_FAILED`: no automatic inventory increment because goods may still be in transit.
- `DELIVERY_RETURN_IN`: only when the failed-delivery package physically returns.
- `RETURNED`: no automatic increment.
- `CUSTOMER_RETURN_IN`: only after received goods are inspected and sellable.

## 8. Create-Order idempotency blocker

FR-10 requires retry/double-click not to create duplicate Orders, but current logical schema intentionally does not lock an idempotency column/token mechanism.

Therefore:

- implement API #20 business transaction only after the project's physical-design decision for dedupe is available;
- do not invent an `idempotency_key` column or hidden client fingerprint and treat it as approved;
- if the repo already contains an approved mechanism, use and document it.

## 9. Transaction tests

Each critical command must have a test proving:

- atomic rollback on intermediate failure;
- repeated command does not duplicate side effects;
- concurrent stock changes do not make stock negative;
- ledger quantity changes reconcile with applied business movements;
- invalid state never performs a side effect before rejection.
