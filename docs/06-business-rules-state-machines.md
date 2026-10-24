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
| Voucher | `DRAFT`, `ACTIVE`, `INACTIVE`, `EXPIRED` | Only ACTIVE is potentially redeemable; additionally require UTC `starts_at ≤ now < ends_at` for non-null bounds, subtotal before discount and excluding shipping ≥ minimum_order_value, and remaining global quota. One non-stacking order-wide Voucher only; no Product/Category targeting or per-account quota ledger. Consume once at successful Order placement; P1.7 specifies that eligible cancellation from PENDING, CONFIRMED, PREPARING or DELIVERY_FAILED releases that consumed use once, atomically with cancellation. Refund/return does not release quota by default. See P1.5. |
| Voucher type | `PERCENT`, `FIXED` | FIXED `discount_value` is VND; PERCENT is integer basis points (100 bps=1%). Compute one order-wide discount, HALF_UP the percentage amount, apply optional VND cap and subtotal bound, then largest-remainder allocation with ascending Product ID tie-break. See P1.5. |
| Order | `PENDING`, `CONFIRMED`, `PREPARING`, `SHIPPING`, `COMPLETED`, `DELIVERY_FAILED`, `CANCELLED`, `RETURNED` | P1.7 defines actor and transition matrix. Placement creates PENDING without stock deduction; confirmation deducts; eligible cancellation reverses; completion collects COD; RETURNED is combined with one full refund. |
| COD Payment | `UNPAID`, `PAID`, `REFUNDED` | One Payment per Order. Collection is atomic with delivery completion; v1 allows one full refund only, manually attested with whole-order return. |
| ShippingInfo | `PENDING`, `SHIPPED`, `DELIVERED`, `FAILED`, `CANCELLED` | Manual status aligned with Order transitions; retry is allowed only after FAILED; no carrier API or event timeline. |
| GoodsReceipt | `DRAFT`, `CONFIRMED`, `CANCELLED` | Only DRAFT is editable. CONFIRMED posts stock once; confirmed receipt lines are immutable. |
| Inventory movement | `OPENING`, `GOODS_RECEIPT`, `ORDER`, `ORDER_CANCEL_REVERSAL`, `RETURN_RESTOCK`, `ADJUSTMENT` | Source-linked, signed movement; append-only ledger; deterministic locking and source-derived duplicate prevention. |

Unknown literals and illegal transitions must return stable typed errors. SQL constraints validate data shape but do not replace authorization, transition checks, idempotency or transaction enforcement.

Pricing and Voucher configuration, eligibility/time-window boundaries, integer-VND calculations, line allocation and global quota consume/release semantics are normative in [P1.5 Pricing and Voucher Contract](refactor-v2/p1/P1.5-pricing-voucher-contract.md). The normative P1.7 transition matrix specifies which eligible cancellation invokes the one-time quota-release operation.

## 2. Order state machine

The normative transition, actor, precondition, side-effect and retry matrix is [P1.7 Order/Payment Contract](refactor-v2/p1/P1.7-order-payment-contract.md). The approved graph is summarized here; runtime acceptance remains pending P3.10.

```text
PENDING -> CONFIRMED -> PREPARING -> SHIPPING -> COMPLETED -> RETURNED
   |           |            |           |
   v           v            v           v
CANCELLED   CANCELLED    CANCELLED   DELIVERY_FAILED -> SHIPPING
                                         |
                                         v
                                      CANCELLED
```

| From | To | Key precondition/effect |
|---|---|---|
| Initial placement | PENDING | P1.6 creates immutable snapshots, COD Payment UNPAID and ShippingInfo PENDING; no stock reservation or deduction at placement. |
| PENDING | CONFIRMED | Authorized operator; recheck stock and deduct once atomically with Order state, balance, ledger and audit. |
| CONFIRMED | PREPARING | Authorized operator; stock deduction already exists; no further stock effect. |
| PREPARING | SHIPPING | Authorized manual dispatch; ShippingInfo becomes SHIPPED in the same transaction. |
| SHIPPING | DELIVERY_FAILED | Authorized manual failure; Payment remains UNPAID; no stock reversal or Voucher release. |
| DELIVERY_FAILED | SHIPPING | Authorized manual retry; no second stock deduction. |
| PENDING / CONFIRMED / PREPARING / DELIVERY_FAILED | CANCELLED | Payment must be UNPAID and dispatch must not be active. Reverse each existing stock deduction exactly once, if present; release an applicable consumed Voucher once; set ShippingInfo CANCELLED; audit atomically. |
| SHIPPING | COMPLETED | Only the combined manual-delivery/COD-collection command; Order, ShippingInfo DELIVERED, Payment PAID and audit commit together. |
| COMPLETED | RETURNED | Only a verified whole-order return with a manually completed full COD refund; Order and Payment REFUNDED plus audit commit together. No automatic restock. |
| CANCELLED / RETURNED | — | Terminal. |

All other transitions are rejected. Cancellation is not allowed directly from SHIPPING or COMPLETED; a shipping failure must be recorded first. COMPLETED → RETURNED does not prove goods are sellable and does not trigger a stock movement. See P1.7 for actor rights, error codes, transaction boundaries and the exact API action vocabulary.

## 3. Payment, shipping and receipt state machines

- **COD Payment:** `UNPAID → PAID → REFUNDED`. Payment collection is permitted only as part of the atomic `SHIPPING → COMPLETED` command after physical delivery and COD collection are manually verified. `PAID → REFUNDED` is a staff-attested offline full refund combined with `COMPLETED → RETURNED`. One full refund maximum; no gateway, partial or multiple-refund flow.
- **ShippingInfo:** create as `PENDING`; manual dispatch sets `SHIPPED`; failed delivery sets `FAILED`; authorized retry returns it to `SHIPPED`; completion sets `DELIVERED` together with COD collection; eligible cancellation sets `CANCELLED`. Current status/last-transition fields are not a delivery-attempt timeline.
- **Transaction/retry rules:** lock and re-read the Order before checking transition preconditions. Payment collection/refund and each source-linked Inventory movement must not occur twice on retry. A repeated committed operation receives a stable conflict instead of duplicating effects. Every successful state change and required AuditLog commit or roll back as a unit. Exact contracts are in [P1.7](refactor-v2/p1/P1.7-order-payment-contract.md).
- **GoodsReceipt:** `DRAFT → CONFIRMED`, or `DRAFT → CANCELLED`. CONFIRM requires at least one valid line and atomically records one positive movement per line, balance/version, confirmed actor/time and audit; repeated confirm cannot post twice. CANCEL is DRAFT-only and has no stock effect. Confirmed/cancelled receipts and confirmed lines are immutable; corrections use an authorized new movement. Full lock/source/deduplication rules are P1.4.

## 4. Business rules

| Rule | Target behavior |
|---|---|
| Sale unit | A Product row with explicit Product ID; parent and child records are independently sellable. |
| Price | Each Product owns its required integer-VND selling price; no implicit parent fallback. |
| Total | `subtotal = Σ(unit_price × quantity)` before discount/shipping; line total = gross − allocated line discount; `total_amount = subtotal - discount_amount + shipping_fee`; `PAYMENTS.amount = ORDERS.total_amount`. Baseline shipping is 30,000 VND unless explicit server configuration overrides it. See P1.5. |
| Voucher | Single order-wide non-stackable Voucher; no Product/Category targeting, per-account limit or usage ledger. Minimum is evaluated against pre-discount merchandise subtotal excluding shipping. Quote does not consume usage; only committed placement increments global usage_count atomically. P1.7 invokes a one-time quota release for eligible cancellation; refunds/returns do not release by default. See P1.5. |
| Inventory | Cart and quote do not reserve stock. Deduct only when requested by the approved Order-owning command; balance is keyed by (warehouse_id, product_id), missing balance reads as zero, version increments per committed movement, bounds are enforced, and every balance change has an atomic ledger movement/audit. See P1.4 for mechanics and P1.7 for the specified transition timing; runtime acceptance remains pending. |
| Receipt | Only successful first confirmation adds stock; every movement has a source, actor and time. |
| COD | No payment gateway callback. Collection/refund must be bound to the correct Order and authorized actor. |
| Recipient snapshot | Order address facts are immutable once placed; editing the account address must not affect the Order. |
| Saved Address default | An Account may have zero saved addresses; if any remain, exactly one is default. The first address defaults automatically; switching/unsetting/deleting the current default promotes the most recently updated remaining address atomically, tie-break by descending ID. Deleting the last address leaves no default. |
| Return | v1 supports one whole-order return with one full COD refund. RETURNED does not automatically restock; no per-line return quantity/inspection persistence or item-level workflow is in scope. |
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
