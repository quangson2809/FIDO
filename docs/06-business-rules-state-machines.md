# 06 — Business Rules & State Machines

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
| BRULE-01 Variant | Purchase selection maps to exactly one size/color Variant; quantity positive integer |
| BRULE-02 Effective price | Variant override price wins; otherwise Product base price; snapshot on Order |
| BRULE-03 Total | total = subtotal - valid discount + shipping fee; baseline normal shipping fee 30,000 VND |
| BRULE-04 Voucher | Only authenticated customer can use; detailed eligibility rules still TBD |
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
- Product selects exactly one SizeSystem.
- ProductVariant references a SizeValue belonging to that Product's SizeSystem and one Color.
- A missing Variant row means the combination is not sold; `available_quantity=0` means an existing Variant is out of sellable quantity.
- Product/Variant sale state and inventory quantity are separate concepts.

## 6. After-sales semantics

Baseline has no independent after-sales case resource.

- `RETURN`: accepted full return may set Order `RETURNED`; refund through Payment if applicable; inventory movement only for physically received goods that can be returned to sellable stock.
- `EXCHANGE_SIZE`: must not automatically set Order to RETURNED. When applied, old/new variant movements reflect actual returned/supplied quantities and stock checks.
- Item-level/partial-return structured workflow is Phase later/TBD.
