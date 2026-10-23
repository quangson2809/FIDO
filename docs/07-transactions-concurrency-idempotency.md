# 07 — Transactions, Concurrency & Idempotency

> **P1 target status (2026-10-23):** Legacy transaction examples below use Variant IDs and available_quantity and are source behavior only. The target uses INVENTORIES(warehouse_id, product_id, quantity_on_hand, version) and INVENTORY_TRANSACTIONS; it has no reservation table or reserved-quantity field. DB-03 and DB-05 mechanics were owner-approved on 2026-10-23. Implement the approved stock source/sign/dedupe/reversal protocol and account-scoped order idempotency; do not treat legacy examples as the target contract.


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
2. Lock the GoodsReceipt row and apply the guarded DRAFT -> CONFIRMED transition; an already-CONFIRMED retry applies no stock increment.
3. Increment each existing Variant inventory in ascending variant_id order.
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

## 8. Create-Order idempotency — DB-05 approved contract / implementation pending

The current target ERD and isolated draft DDL include `ORDERS.idempotency_key` and `ORDERS.request_fingerprint`; this corrects older statements that the target has no idempotency fields. Their presence alone does not define a correct guarantee.

- DB-05 is approved. Implement API #20 against the owner-accepted protocol and keep it pending until replay/conflict/rollback and concurrency tests pass.
- The proposal must freeze key scope, canonical fingerprint content, same-key/same-payload replay, changed-payload conflict, cross-account isolation, collision handling, retention and transaction boundary.
- An in-memory lock alone is not durable across instances/restarts; use the approved database-backed uniqueness/arbitration mechanism after acceptance.
- Current legacy Order/API/frontend flow is not mapped to those target fields. Do not claim target idempotency works until implementation and concurrency tests pass.

## 9. Transaction tests

Each critical command must have a test proving:

- atomic rollback on intermediate failure;
- repeated command does not duplicate side effects;
- concurrent stock changes do not make stock negative;
- ledger quantity changes reconcile with applied business movements;
- invalid state never performs a side effect before rejection.


## Target concurrency gate (P1)

Under the owner-approved DB-03 contract, target stock writes are keyed by warehouse + Product, with order/receipt state, INVENTORIES balance, INVENTORY_TRANSACTIONS and required audit committed atomically. Quote/cart reads must not reserve stock. Implement the approved movement vocabulary, semantic source uniqueness across different request keys, append-only reversals, explicit opening balance and deterministic lock order; these are engineering acceptance gates, not pending owner decisions.
