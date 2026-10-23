# 06 — Business Rules & State Machines

> **Owner-approved target contract (2026-10-23):** DB-03/DB-08 target defaults are approved: one COD Payment aggregate, manual ShippingInfo, explicit authorized Order/Payment/Shipping transitions, atomic stock/payment/audit effects and at most one full refund. The approved state literals and default transition matrix are summarized below; runtime enforcement/tests remain pending. Do not add legacy Variant, refund-event or return tables back to ERD v2 by implication.


## 0. Approved target literal and transition defaults (v2)

The target schema's checked status/type literals are frozen as follows. These are target v2 semantics, not an instruction to keep legacy tables or Variant identifiers.

| Entity | Approved status/type literals | Default transition/invariant |
|---|---|---|
| Account | `ACTIVE`, `PENDING_APPROVAL`, `LOCKED`, `SUSPENDED` | Only authorized account/authentication commands may change status; active-phone uniqueness excludes soft-deleted accounts. |
| Role, Category, Brand, Supplier, Warehouse | `ACTIVE`, `INACTIVE` | Disabling does not delete history or bypass referenced-row FK rules. v1 resolves one operational warehouse server-side. |
| Product | `DRAFT`, `ACTIVE`, `INACTIVE`, `ARCHIVED` | Only ACTIVE and otherwise valid Products may be sold; parent/child levels are limited to one; SKU/price/stock belong to each Product row. |
| Cart | `OPEN`, `CHECKOUT`, `COMPLETED`, `ABANDONED` | Only the authenticated owner can mutate it. Checkout consumes cart lines in the order transaction; cart/quote never reserve stock. |
| Voucher status | `DRAFT`, `ACTIVE`, `INACTIVE`, `EXPIRED` | One global usage limit; order-wide/non-stackable; no Product/Category targeting or per-account usage ledger. Usage is consumed atomically with order placement, and an eligible cancellation restores it at most once. |
| Voucher discount type | `PERCENT`, `FIXED` | Integer-VND amounts; percent value uses order-level HALF-UP rounding, then largest-remainder allocation to lines with ascending Product ID tie-break. |
| Order | `PENDING`, `CONFIRMED`, `PREPARING`, `SHIPPING`, `COMPLETED`, `DELIVERY_FAILED`, `CANCELLED`, `RETURNED` | Follow the graph in §1. A state command, related payment/shipping effect, stock movement/reversal and required audit must be atomic. |
| COD Payment | `UNPAID`, `PAID`, `REFUNDED` | `UNPAID → PAID → REFUNDED`; at most one full refund per order in v1. Partial/multiple refunds are out of scope. |
| ShippingInfo | `PENDING`, `SHIPPED`, `DELIVERED`, `FAILED`, `CANCELLED` | Manual shipping only. Reject illegal/replayed transitions; do not add carrier tracking or shipping integration. |
| GoodsReceipt | `DRAFT`, `CONFIRMED`, `CANCELLED` | Only DRAFT is editable. CONFIRMED increases stock once; a confirmed receipt is immutable; corrections are separate authorized movements. |
| ContentPage | `DRAFT`, `PUBLISHED`, `ARCHIVED` | Public reads return PUBLISHED pages only. |
| Inventory movement | `OPENING`, `GOODS_RECEIPT`, `ORDER`, `ORDER_CANCEL_REVERSAL`, `RETURN_RESTOCK`, `ADJUSTMENT` | OPENING/GOODS_RECEIPT positive; ORDER negative; cancellation/eligible sellable-return reversals positive and source-linked; ADJUSTMENT is non-zero with reason/actor. Source-derived uniqueness, deterministic locks and append-only ledger are required. |

Unknown literals and illegal state transitions must be rejected with stable typed business errors. SQL CHECK constraints validate shape; they do not replace service-level transition, authorization, idempotency or transaction enforcement.

## 1. Order state machine

```text
PENDING -------> CONFIRMED -------> PREPARING -------> SHIPPING -------> COMPLETED -------> RETURNED
   |                  |                   |                 |
   |                  |                   |                 +----------> DELIVERY_FAILED
   |                  |                   |                                |          |
   |                  |                   |                                |          +--> CANCELLED
   |                  |                   +-----------------------------> CANCELLED   |
   |                  +------------------------------------------------> CANCELLED   +--> SHIPPING
   +-------------------------------------------------------------------> CANCELLED
```

Allowed transitions only:

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

Additional conditions:

- PENDING -> CONFIRMED rechecks and deducts inventory atomically.
- SHIPPING -> COMPLETED requires PaymentStatus = PAID.
- CANCELLED after stock deduction restores stock exactly once.
- PENDING cancellation does not touch stock.
- DELIVERY_FAILED alone does not restore stock.
- COMPLETED -> RETURNED does not automatically restore stock.

## 2. Payment state machine

```text
UNPAID -> PAID -> REFUNDED
```

- Independent from OrderStatus.
- Only COD in baseline.
- Record actor, timestamp and amounts.
- Repeat collect/refund requests must not double-apply amount.
- CANCELLED before collection remains UNPAID.

## 3. GoodsReceipt state machine

```text
DRAFT -> CONFIRMED
  |
  +----> CANCELLED
```

- Only DRAFT is editable.
- CONFIRMED increments inventory exactly once and writes InventoryTransaction.
- After CONFIRMED, stock-affecting items are immutable; corrections are inventory adjustments with reason/audit.

## 4. BRULE-01..13 implementation checklist

| Rule | Backend behavior |
|---|---|
| BRULE-01 Product sale unit | Target cart/order uses one explicit Product ID per line; no ProductVariant/size/color tables; quantity is a positive integer |
| BRULE-02 Effective price | Each parent/child Product owns its required integer-VND selling price; no price inheritance; snapshot unit price on OrderItem |
| BRULE-03 Total | total = subtotal - valid discount + shipping fee; baseline normal shipping fee 30,000 VND |
| BRULE-04 Voucher | Authenticated account only; order-wide/non-stackable/global usage limit; no Product/Category targeting or per-account usage ledger |
| BRULE-05 Inventory | Cart/PENDING no reserve; CONFIRMED rechecks/deducts; never negative |
| BRULE-06 Cancel restock | If already deducted, CANCELLED restores inventory and writes ledger |
| BRULE-07 Receipt | Only CONFIRMED receipt increments inventory; every movement has source/actor/time |
| BRULE-08 COD | COD only; no gateway callback; payment changes tied to correct Order and actor/time |
| BRULE-09 Recipient | phone/address required, email optional; editable through PREPARING, locked from SHIPPING |
| BRULE-10 Return | baseline: within 2 days from COMPLETED, tags intact; exceptions recorded in order note |
| BRULE-11 History | later catalog/price edits cannot rewrite historical Order snapshot |
| BRULE-12 Authorization | Admin highest business privilege; employees only granted capabilities; backend check |
| BRULE-13 Revenue | recognized from COMPLETED; RETURNED adjusts retained sales |

## 5. Catalog invariants

- Category is a self-referencing tree.
- Product may only belong to a leaf Category.
- Target v2 has no SizeSystem/SizeValue/Color/ProductVariant identity. Child Products are explicit Products with independently owned SKU, required price and stock.
- Dynamic attributes are descriptive only and never auto-generate Products.
- Product lifecycle state and inventory quantity are separate concepts; zero stock does not by itself change Product status.

## 6. After-sales semantics

Baseline has no independent after-sales case resource.

- `RETURN`: v1 supports at most one full refund per order; no partial/multiple refunds. Restock only after an authorized decision confirms physically received goods are sellable. Do not infer restock from the Order entering `RETURNED` alone.
- `EXCHANGE_SIZE`: detailed size-exchange automation is out of target scope because v2 has no Variant/size persistence; do not reintroduce those tables without an explicit ERD amendment.
- Item-level/partial-return structured workflow is deferred.


## Target-state reconciliation (P1; not runtime implementation)

- Cart and order placement require an authenticated account; guest identity, guest checkout, lookup-by-phone and cart merge are out of scope under owner decision A-03.
- Parent and child Product records are independently sellable and each owns SKU, selling price and inventory. Dynamic attributes are descriptive and never auto-generate child Products.
- Target money is integer VND. Owner-approved discount rounding/allocation is HALF-UP at the order discount followed by largest-remainder allocation to lines with ascending `product_id` tie-break; legacy BigDecimal rules do not override that contract.
- Stock is represented by INVENTORIES(warehouse_id, product_id, quantity_on_hand, version) and INVENTORY_TRANSACTIONS. DB-03 source/movement/reversal/deduplication and concurrency policy is owner-approved; apply it through atomic service transactions and test it on MySQL.
- Target PAYMENTS has one order-owned COD aggregate and refund metadata. Owner-approved v1 supports at most one full refund per order; partial/multiple refunds are out of scope. Enforce authorized state transitions, replay protection, source-linked stock reversal and atomic audit.
- Product hierarchy is one parent-child level in v1. Parent and child are independently sellable with row-owned SKU, required price and inventory. `name`, `slug` and `description` do not fall back to parent when NULL; no other field inherits. `selling_price` is required and never inherited. Enforce this in target DDL/service/DTO and tests.
