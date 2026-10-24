# 06 — Business Rules & State Machines

> **Owner-approved target contract (2026-10-23):** the 31-table ERD v2 and DB-01..DB-12 defaults are approved except where a specific artifact records an unresolved approval conflict below. This document defines target behavior; runtime enforcement and acceptance tests remain pending. Inventory balance, source/sign, receipt, concurrency and reconciliation details are governed by [P1.4 Inventory Contract](refactor-v2/p1/P1.4-inventory-contract.md). Do not introduce persistence outside the approved target without an explicit owner amendment.

## 1. Target status/type literals and approval caveats

| Entity | Approved status/type literals | Invariant |
|---|---|---|
| Account | `ACTIVE`, `PENDING_APPROVAL`, `LOCKED`, `SUSPENDED` | Public registration creates an `ACTIVE` Account and atomically assigns the seeded `CUSTOMER` Role; staff creation starts `ACTIVE` with SUPERADMIN-supplied roles. Only `ACTIVE` may authenticate or access protected routes. Wrong credentials return generic `401 INVALID_CREDENTIALS`; valid credentials for any non-ACTIVE Account return `403 ACCOUNT_NOT_ACTIVE` without disclosing exact status. Protected requests re-check status. Phone is canonicalized and unique among non-soft-deleted Accounts; reuse follows soft deletion. |
| RBAC and system permissions | Role: `ACTIVE`/`INACTIVE`; Permission has no status | The `SUPERADMIN` Role must stay `ACTIVE` and retain every current Permission. New Permission creation grants it to `SUPERADMIN` in the same transaction. At least one non-soft-deleted `ACTIVE` Account must retain that Role; role/account/grant changes and audit enforce this invariant atomically. Seed Permission rows are protected. Custom Permission may be deleted only when no non-SUPERADMIN Role uses it; remove its SUPERADMIN grant atomically with deletion. |
| Role, Category, Brand, Supplier, Warehouse | `ACTIVE`, `INACTIVE` | Disabling does not erase historical references or bypass FK policy. The server resolves the one operational warehouse in v1. |
| Product | `DRAFT`, `ACTIVE`, `INACTIVE`, `ARCHIVED` | Only eligible active Products sell; parent/child depth is one level; each Product owns its SKU, required selling price and stock. |
| Cart | `OPEN`, `CHECKOUT`, `COMPLETED`, `ABANDONED` | Authenticated owner only. Order placement mutates Cart atomically; Cart never reserves stock. |
| Voucher | `DRAFT`, `ACTIVE`, `INACTIVE`, `EXPIRED` | Only ACTIVE is potentially redeemable; additionally require UTC `starts_at ≤ now < ends_at` for non-null bounds, subtotal before discount and excluding shipping ≥ minimum_order_value, and remaining global quota. One non-stacking order-wide Voucher only; no Product/Category targeting or per-account quota ledger. Consume once at successful Order placement; P1.7 decides whether/when cancellation calls the one-time release operation. See P1.5. |
| Voucher type | `PERCENT`, `FIXED` | FIXED `discount_value` is VND; PERCENT is integer basis points (100 bps=1%). Compute one order-wide discount, HALF_UP the percentage amount, apply optional VND cap and subtotal bound, then largest-remainder allocation with ascending Product ID tie-break. See P1.5. |
| Order | `PENDING`, `CONFIRMED`, `PREPARING`, `SHIPPING`, `COMPLETED`, `DELIVERY_FAILED`, `CANCELLED`, `RETURNED` | Follow the transition graph below. State, Payment/shipping effects, stock movements and required audit are atomic. |
| COD Payment | `UNPAID`, `PAID`, `REFUNDED` | One Payment aggregate per Order; at most one full refund in v1. |
| ShippingInfo | `PENDING`, `SHIPPED`, `DELIVERED`, `FAILED`, `CANCELLED` | Manual shipping; reject illegal or duplicated transitions. |
| GoodsReceipt | `DRAFT`, `CONFIRMED`, `CANCELLED` | Only DRAFT is editable. CONFIRMED posts stock once; confirmed receipt lines are immutable. |
| Inventory movement | `OPENING`, `GOODS_RECEIPT`, `ORDER`, `ORDER_CANCEL_REVERSAL`, `RETURN_RESTOCK`, `ADJUSTMENT` | Source-linked, signed movement; append-only ledger; deterministic locking and source-derived duplicate prevention. |

Unknown literals and illegal transitions must return stable typed errors. SQL constraints validate data shape but do not replace authorization, transition checks, idempotency or transaction enforcement.

Pricing and Voucher configuration, eligibility/time-window boundaries, integer-VND calculations, line allocation and global quota consume/release semantics are normative in [P1.5 Pricing and Voucher Contract](refactor-v2/p1/P1.5-pricing-voucher-contract.md). This does not change the Order transition graph: P1.7 owns the cancellation timing that invokes quota release.

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

GoodsReceipt: `DRAFT → CONFIRMED`, or `DRAFT → CANCELLED`. CONFIRM requires at least one valid line and atomically records one positive movement per line, balance/version, confirmed actor/time and audit; concurrent/repeated confirm cannot post twice. CANCEL is DRAFT-only and has no stock effect. Confirmed/cancelled receipts and confirmed lines are immutable; corrections use an authorized new movement. Full lock/source/deduplication rules are P1.4.

## 4. Business rules

| Rule | Target behavior |
|---|---|
| Sale unit | A Product row with explicit Product ID; parent and child records are independently sellable. |
| Price | Each Product owns its required integer-VND selling price; no implicit parent fallback. |
| Total | `subtotal = Σ(unit_price × quantity)` before discount/shipping; line total = gross − allocated line discount; `total_amount = subtotal - discount_amount + shipping_fee`; `PAYMENTS.amount = ORDERS.total_amount`. Baseline shipping is 30,000 VND unless explicit server configuration overrides it. See P1.5. |
| Voucher | Single order-wide non-stackable Voucher; no Product/Category targeting, per-account limit or usage ledger. Minimum is evaluated against pre-discount merchandise subtotal excluding shipping. Quote does not consume usage; only committed placement increments global usage_count atomically. Eligible cancellation release is invoked according to P1.7; refunds/returns do not release by default. See P1.5. |
| Inventory | Cart and quote do not reserve stock. Deduct only when requested by the approved Order-owning command; balance is keyed by (warehouse_id, product_id), missing balance reads as zero, version increments per committed movement, bounds are enforced, and every balance change has an atomic ledger movement/audit. See P1.4; Order transition timing remains P1.7. |
| Receipt | Only successful first confirmation adds stock; every movement has a source, actor and time. |
| COD | No payment gateway callback. Collection/refund must be bound to the correct Order and authorized actor. |
| Recipient snapshot | Order address facts are immutable once placed; editing the account address must not affect the Order. |
| Saved Address default | An Account may have zero saved addresses; if any remain, exactly one is default. The first address defaults automatically; switching/unsetting/deleting the current default promotes the most recently updated remaining address atomically, tie-break by descending ID. Deleting the last address leaves no default. |
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
