# 06 — Business Rules & State Machines

> **Owner-approved target contract (2026-10-23):** the 31-table ERD v2 and DB-01..DB-12 defaults are approved except where a specific artifact records an unresolved approval conflict below. This document defines target behavior; runtime enforcement and acceptance tests remain pending. Do not introduce persistence outside the approved target without an explicit owner amendment.

## 1. Target status/type literals and approval caveats

| Entity | Approved status/type literals | Invariant |
|---|---|---|
| Account | `ACTIVE`, `PENDING_APPROVAL`, `LOCKED`, `SUSPENDED` | Registration/staff creation starts at `ACTIVE`; only `ACTIVE` may authenticate or access protected routes. Wrong credentials return generic `401 INVALID_CREDENTIALS`; valid credentials for any non-ACTIVE Account return `403 ACCOUNT_NOT_ACTIVE` without disclosing exact status. Protected requests re-check status. Phone is canonicalized and unique among non-soft-deleted Accounts; reuse follows soft deletion. |
| Role, Category, Brand, Supplier, Warehouse | `ACTIVE`, `INACTIVE` | Disabling does not erase historical references or bypass FK policy. The server resolves the one operational warehouse in v1. |
| Product | `DRAFT`, `ACTIVE`, `INACTIVE`, `ARCHIVED` | Only eligible active Products sell; parent/child depth is one level; each Product owns its SKU, required selling price and stock. |
| Cart | `OPEN`, `CHECKOUT`, `COMPLETED`, `ABANDONED` | Authenticated owner only. Order placement mutates Cart atomically; Cart never reserves stock. |
| Voucher | `DRAFT`, `ACTIVE`, `INACTIVE`, `EXPIRED` | Order-wide, non-stackable, global usage limit; no catalog targeting or per-account quota ledger. Consume usage atomically at order placement and restore at most once on eligible cancellation. |
| Voucher type | `PERCENT`, `FIXED` | Money is integer VND. Round order discount HALF-UP, then allocate by largest remainder with ascending Product ID tie-break. |
| Order | `PENDING`, `CONFIRMED`, `PREPARING`, `SHIPPING`, `COMPLETED`, `DELIVERY_FAILED`, `CANCELLED`, `RETURNED` | Follow the transition graph below. State, Payment/shipping effects, stock movements and required audit are atomic. |
| COD Payment | `UNPAID`, `PAID`, `REFUNDED` | One Payment aggregate per Order; at most one full refund in v1. |
| ShippingInfo | `PENDING`, `SHIPPED`, `DELIVERED`, `FAILED`, `CANCELLED` | Manual shipping; reject illegal or duplicated transitions. |
| GoodsReceipt | `DRAFT`, `CONFIRMED`, `CANCELLED` | Only DRAFT is editable. CONFIRMED posts stock once; confirmed receipt lines are immutable. |
| Inventory movement | `OPENING`, `GOODS_RECEIPT`, `ORDER`, `ORDER_CANCEL_REVERSAL`, `RETURN_RESTOCK`, `ADJUSTMENT` | Source-linked, signed movement; append-only ledger; deterministic locking and source-derived duplicate prevention. |

Unknown literals and illegal transitions must return stable typed errors. SQL constraints validate data shape but do not replace authorization, transition checks, idempotency or transaction enforcement.

## 2. Order state machine

```text
PENDING -------> CONFIRMED -------> PREPARING -------> SHIPPING -------> COMPLETED -------> RETURNED
   |                  |                   |                 |
   |                  |                   |                 +----------> DELIVERY_FAILED
   |                  |                   |                                |          |
   |                  |                   +-----------------------------> CANCELLED   +--> SHIPPING
   |                  +------------------------------------------------> CANCELLED
   +-------------------------------------------------------------------> CANCELLED
```

Allowed transitions:

| From | To |
|---|---|
| PENDING | CONFIRMED, CANCELLED |
| CONFIRMED | PREPARING, CANCELLED |
| PREPARING | SHIPPING, CANCELLED |
| SHIPPING | COMPLETED, DELIVERY_FAILED |
| DELIVERY_FAILED | SHIPPING, CANCELLED |
| COMPLETED | RETURNED |
| CANCELLED | none |
| RETURNED | none |

- PENDING → CONFIRMED rechecks and deducts stock atomically.
- SHIPPING → COMPLETED requires PaymentStatus = PAID.
- Cancellation after deduction restores stock exactly once through a new linked movement.
- Cancelling before deduction does not affect stock.
- DELIVERY_FAILED alone does not restore stock.
- COMPLETED → RETURNED does not itself prove the goods are sellable and does not automatically restock them.

## 3. Payment and receipt state machines

Payment: `UNPAID → PAID → REFUNDED`. Only COD is in scope. Collection/refund requires an authorized actor, amount, timestamp and replay protection. A cancelled uncollected order remains UNPAID.

GoodsReceipt: `DRAFT → CONFIRMED`, or `DRAFT → CANCELLED`. Confirming posts the receipt once and records actor/time. Confirmed stock-affecting lines are immutable; corrections are separate authorized inventory movements.

## 4. Business rules

| Rule | Target behavior |
|---|---|
| Sale unit | A Product row with explicit Product ID; parent and child records are independently sellable. |
| Price | Each Product owns its required integer-VND selling price; no implicit parent fallback. |
| Total | `total_amount = subtotal - discount_amount + shipping_fee`; baseline shipping fee is 30,000 VND unless changed by explicit configuration. |
| Voucher | Authenticated order-wide non-stackable voucher; global usage count; no catalog targeting or per-account usage ledger. |
| Inventory | Cart and quote do not reserve stock. Deduct at the approved order transition; never allow negative on-hand quantity. |
| Receipt | Only successful first confirmation adds stock; every movement has a source, actor and time. |
| COD | No payment gateway callback. Collection/refund must be bound to the correct Order and authorized actor. |
| Recipient snapshot | Order address facts are immutable once placed; editing the account address must not affect the Order. |
| Return | v1 allows at most one full refund. Restock only after an authorized decision confirms the returned goods are sellable. |
| History | Later Product, price, address and voucher edits cannot rewrite an existing Order's snapshots. |
| Authorization | Backend permission checks protect each administrative mutation; privileged changes are audited. |
| Revenue | Report calculations follow the approved completion/return accounting rule and Asia/Ho_Chi_Minh date boundaries. |

## 5. Catalog and attribute invariants

- Category hierarchy is acyclic.
- Product parent-child depth is limited to one level; children are explicit Product records.
- Dynamic attributes are descriptive only and never create Products automatically.
- A typed attribute value must match its Attribute type; an option must belong to the same Attribute.
- Product lifecycle and available stock are separate: zero stock does not silently change Product status.

## 6. Scope exclusions

Guest checkout, persisted guest carts, online gateways, automatic shipping integration, multi-refund/partial-refund workflows and detailed item-level return/exchange workflows are outside v1. Extending the persistence model requires explicit owner approval and an ERD/API amendment.
