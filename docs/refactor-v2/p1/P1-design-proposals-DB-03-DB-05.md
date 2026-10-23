# P1 Design Proposals — DB-03 Inventory and DB-05 Checkout Quote

**Status: PROPOSAL FOR OWNER REVIEW — not approved and not implementation authorization.**  
Branch: demo1 · Date: 2026-10-23  
Authority: owner-confirmed 31-table ERD docs/refactor/phase-1-erd-v2-approved.mmd, decision log and explicit owner choices. No table or column is added by this proposal.

## 1. DB-03 — Inventory, receipts, ledger and concurrency

### 1.1 Scope and stock invariant

- One operational warehouse in v1 is already approved (A-04). Seed one active warehouse and resolve its ID from configuration/reference data; do not accept an arbitrary warehouse ID from public requests.
- INVENTORIES.quantity_on_hand means the physical/accounting quantity currently available to promise for sale. No separate reservation quantity exists in the approved ERD.
- Invariant per (warehouse_id, product_id): quantity_on_hand = sum(INVENTORY_TRANSACTIONS.quantity_delta) from the opening balance onward. If an initial opening balance is needed, represent it by an approved opening-balance movement, not an untracked direct update.
- All deltas are signed integers: inbound positive; outbound negative. Zero deltas are invalid. Quantities must remain within the integer column range and must not become negative.
- Only sellable Product records receive inventory. Parent and child Products each have independent stock, SKU and price per DB-01. Cart writes never mutate stock.

### 1.2 When stock changes

| Command/event | Stock effect | Preconditions | Atomic unit |
|---|---|---|---|
| Create/edit receipt draft | None | Draft only; validate positive item quantities | Receipt draft + items |
| Confirm goods receipt | One positive delta per receipt item | Receipt is confirmable; Product is sellable; receipt not previously confirmed | Receipt status + ledger rows + inventory balances |
| Place order successfully | One negative delta per OrderItem | Reprice and validate all Products; sufficient stock for every line; idempotency resolved | Order + snapshots + COD payment + stock movements/balances + cart mutation |
| Cancel eligible order | One positive reversal per prior deduction | Allowed Order transition; original deduction exists; not already reversed | Order transition + reversal rows + balances + audit |
| Manual adjustment | Signed non-zero delta | Permission, mandatory reason/key, actor derived from JWT | Ledger + balance + audit |
| Return/refund | Not enabled as a stock command until DB-08 return scope/persistence is approved | Owner-approved return contract required | Freeze with DB-08 |

Proposed deduction point is successful atomic order placement, not quote creation or cart addition. No reservation field/table exists, so quotes do not reserve stock. Order placement rechecks stock and fails without partial writes if stock is insufficient.

### 1.3 Ledger semantics with current columns

Use INVENTORY_TRANSACTIONS only; do not create another ledger table.

| transaction_type proposal | quantity_delta | Source link | Meaning |
|---|---:|---|---|
| GOODS_RECEIPT | Positive | goods_receipt_item_id | Confirmed receipt item |
| ORDER_DEDUCTION | Negative | order_item_id | Stock consumed by successful Order placement |
| ORDER_CANCEL_REVERSAL | Positive | order_item_id | Reversal of the corresponding deduction |
| MANUAL_ADJUSTMENT | Non-zero signed | Neither | Authorized correction with reason in command/audit metadata |
| OPENING_BALANCE | Strictly positive | Neither | Explicit initial quantity for a tracked Product |

These literals are proposed, not frozen. Receipt/order sources can use nullable source FKs, but each movement type must have exactly one valid source. Manual adjustment/opening balance lack a dedicated ledger reason column. Persist bounded reason/correlation evidence in AUDIT_LOGS (entity_type, entity_id, before_data, after_data, correlation_id) in the same transaction, excluding secrets. This is auditable but is not equivalent to a normalized ledger reason field.

A reversal is a new positive movement, never an edit/delete of the original. Since the ERD has no reversal_of_transaction_id, use a deterministic server-generated key derived from the original movement and reversal operation; if this cannot be unambiguous under the physical unique-key contract, request an ERD amendment. INVENTORY_TRANSACTIONS.idempotency_key is unique in the ERD; use namespaced server keys such as receipt:<itemId>:confirm-v1, order:<orderItemId>:deduct-v1, order:<orderItemId>:cancel-reverse-v1 and adjustment:<requestUUID>. Freeze key length/normalization in the physical contract.

### 1.4 Concurrency and transaction protocol

1. One database transaction per business command.
2. Lock affected INVENTORIES rows in deterministic ascending product_id order using SELECT ... FOR UPDATE. For missing rows, insert under the composite key and handle duplicate-key races by reselecting/locking. Single warehouse does not remove per-Product contention.
3. For deduction, validate every quantity against locked balances before writing any stock changes. Then update balance and increment version, insert the uniquely keyed movement, and use a conditional update (quantity_on_hand >= requested) as a second guard; exactly one row must update.
4. Confirm receipt under a lock on GOODS_RECEIPTS; only the first allowed transition from draft to confirmed may create movements. Unique source keys are the final defense, not the only state guard.
5. Order placement locks inventory rows in sorted order, revalidates stock and price, and commits Order/Payment/ledger/balance writes together. Any failure rolls back the entire transaction.
6. For duplicate key races, roll back the losing transaction, read the committed result, and replay only if the semantic payload matches. Never continue after a uniqueness exception with partial writes.
7. Lock Order/receipt rows before state transitions. Reject already-confirmed receipts, already-cancelled orders, or already-reversed movements according to the frozen API error contract.

### 1.5 Required acceptance tests

- Two simultaneous orders competing for the last units: at most one succeeds; stock never negative.
- Multi-line order with one insufficient item: no Order, Payment, ledger or partial balance change.
- Concurrent receipt confirmation: exactly one inbound movement per receipt item.
- Retry after response loss: no second movement.
- Same semantic source with a different client key: source-derived uniqueness/state guard prevents duplicate movement.
- Concurrent/repeated cancellation: one reversal per original deduction.
- Manual adjustment without permission, reason or key is rejected; actor is server-derived.
- At every checkpoint, balance equals ledger sum and every movement has a valid source shape.

### 1.6 ERD limitations needing owner/reviewer decision

The ERD has no dedicated adjustment reason or reversal FK; INVENTORY_TRANSACTIONS.idempotency_key physical scope/length is unspecified. Audit JSON preserves evidence but does not fully replace normalized ledger fields. Reviewer must decide whether this is sufficient for v1; otherwise amend the ERD explicitly.

## 2. DB-05 — Checkout quote, idempotency and order-time repricing

### 2.1 Quote lifecycle and persistence

- Quote is a short-lived calculation response, not a persisted business record. The target ERD has no CHECKOUT_QUOTES table; do not add one implicitly.
- Inputs: authenticated account, current Cart, optional voucher code and receiver/shipping data required by the existing API. Server reads current Product sale status/price, stock, voucher status/window/rules and configured manual-shipping fee. Never trust client totals, price, discount, stock or currency.
- Quote has no stock side effect, voucher consumption or reservation. Return server-calculated subtotal, discount, shipping fee, total and item lines; quote is indicative until order placement.
- Without a quote record, do not promise durable quote IDs, quote replay, expiry lookup or reservation semantics. If required, owner must approve persistence or a different contract.

### 2.2 Idempotency key proposal

- Client sends Idempotency-Key as a high-entropy UUID for each logical order-placement attempt. Server derives account identity from authentication; never accept account ID as scope input.
- ORDERS.idempotency_key is globally unique in the ERD. Store a canonical server value accountId:clientUUID, subject to a physical length contract. If column length is insufficient, use a fixed-length digest of account ID + UUID and document it; do not silently alter the ERD.
- Canonical semantic input comprises normalized cart Product IDs/quantities, voucher code, receiver/address fields and delivery selection if it affects order semantics. Exclude client totals and volatile fields. Use stable field ordering, Unicode normalization and canonical serialization.
- Critical limitation: ERD has no request-fingerprint column. The service must compare retries against persisted Order, OrderItems, OrderAddress and voucher snapshot. Freeze comparison rules for every input. If any field cannot be reconstructed exactly, safe same-key/different-payload detection is not implementable under current schema; request an ERD amendment for a request hash instead of claiming full coverage.
- Key retention follows Order retention. Do not recycle keys after cancellation or deletion; Order records are not physically deleted in this proposal.

### 2.3 Retry and payload-change behavior

| Condition | Required behavior |
|---|---|
| First request, unused key | Validate and create Order transactionally |
| Same account/key and semantically identical payload; original committed | Return existing confirmation/detail; do not duplicate items, payment, stock or voucher effects |
| Same key but different payload | Deterministic idempotency conflict; never mutate the existing Order |
| Same key from another account | Never disclose the other Order; account-isolated conflict/not-found per API error contract |
| Original transaction fully rolled back | Key remains unused; retry can execute |
| Commit succeeded but response was lost | Find Order by unique key and replay |
| Concurrent same-key requests | One wins; loser rolls back, reads winner, then replays/conflicts by payload comparison |
| Different keys, same unchanged Cart | Freeze explicit policy: after first success, second must see cleared Cart or fail stale-cart validation; do not create two orders from the same unchanged Cart accidentally |

### 2.4 Order-time calculation and atomic sequence

1. Resolve account and idempotency key. If an Order exists, compare persisted semantic input and replay/conflict.
2. Load the account's active Cart; normalize lines. Reject empty Cart, invalid quantities, non-sellable/deleted Products and missing receiver fields.
3. Lock relevant inventory rows in sorted Product ID order and recheck quantity. Quote never reserves stock.
4. Re-read current Product prices/status. Recalculate line gross amounts using integer VND; subtotal is sum of line gross. Reject stale/invalid Product state.
5. Validate optional voucher against current active status, start/end window, minimum order value and supported order-wide discount. No stacking and no Product/Category conditions. If usage caps are enforced, lock/update the voucher atomically only if the schema has a persisted concurrency-safe counter; the current ERD does not.
6. Resolve shipping fee from server configuration and calculate total = subtotal - discount + shipping fee. Reject negative/overflow values. Persist currency VND; money contract must be reconciled across all monetary columns first.
7. Insert Order with canonical unique key; OrderItems and snapshots; OrderAddress; OrderVoucherSnapshot if applicable; COD Payment; stock movements/balances; cart mutation; audit. Consume voucher only if approved semantics are representable.
8. Commit once. Any failure rolls back every write. Return confirmation only after commit.
9. On unique-key collision, roll back, load winner by key/account, compare semantic payload, then replay or conflict.

### 2.5 Money, voucher and shipping

- Quote and Order share one domain calculation service; quote is advisory, order placement recalculates persisted state.
- Integer VND supersedes isolated DECIMAL(18,2) SQL drafts. All persisted/API amounts must be whole VND; do not freeze SQL/JPA until monetary ERD types are reconciled.
- Voucher: order-wide, one voucher, non-stackable, no Product/Category conditions. VOUCHERS has usage_limit but no redemption ledger or used-count column. A safe hard global usage cap cannot be implemented by reading Orders alone unless a precise definition and concurrency guard are frozen. Do not advertise/enforce caps until owner approves a representation or defers caps.
- Shipping fee is server-owned configuration. Current decisions establish manual shipping but do not specify flat vs other fee formula; freeze before P2.
- Discount allocation proposal: calculate order discount in integer VND using approved rounding; allocate across lines with proportional largest-remainder allocation, stable tie-break by Product/order-line identity. Allocated line discounts must sum exactly to order discount; line total = quantity × unit price − allocated discount. This is a proposal requiring acceptance.

### 2.6 Required acceptance tests

- Same-key retry after lost response returns the same Order without duplicate stock/payment/voucher effects.
- Concurrent same-key same-payload requests create one Order.
- Same key with changed quantity, voucher or receiver conflicts and leaves original Order unchanged.
- Cross-account same-key requests never leak Order data.
- Price/status/stock/voucher changes after quote are revalidated at placement; client totals are ignored.
- Different keys racing for the last stock unit cannot oversell.
- Injected failure after each write stage rolls back Order, snapshots, Payment, stock, ledger and Cart effects.
- Integer-money tests assert nonnegative amounts, exact line/order reconciliation, deterministic largest-remainder ties and no fractional VND.
- If global voucher caps remain required, prove the persisted concurrency guard on MySQL; otherwise document caps as deferred.

## 3. Cross-cutting contract conflicts still open

1. **DB-07 image snapshot:** ERD has PRODUCT_IMAGES.image_url but no image reference on ORDER_ITEMS. attribute_snapshot is not a safe substitute for a dedicated image field without changing its meaning/type contract. Immutable remote storage alone is insufficient unless the Order retains a stable reference to that exact object. Owner must approve an ERD amendment or relax historical-image guarantee. No silent schema change is proposed.
2. **DB-09 active phone uniqueness:** MySQL has no PostgreSQL-style partial unique index. Physical design needs a MySQL-compatible strategy (for example, generated nullable active-phone key with a unique index) and approved soft-delete semantics. This may be a physical constraint representation but must be documented and reviewed against the 31 logical tables.
3. **DB-10 integer VND:** canonical ERD still labels money fields decimal. Owner decision says integer VND, so ERD is semantically inconsistent. Approve corrected ERD money notation/physical contract before freeze; update all dependent columns, DTOs and formulas together.
4. **DB-06 voucher usage:** usage_limit exists but a used-count/redemption ledger does not. A hard usage limit needs an approved persistence/concurrency design.
5. **DB-08 return/refund:** ERD has payment status/amount and audit JSON but no normalized refund amount/actor/time or return record. Coarse Order status does not represent a complete auditable return/refund workflow. Owner must narrow scope or amend ERD before implementation.
6. **Approval evidence:** DB-03 and DB-05 remain proposals until owner explicitly accepts/revises them. A documentation change cannot manufacture approval.

## 4. Recommendation

Review this proposal and accept/revise DB-03 and DB-05 explicitly. Resolve the cross-cutting incompatibilities above, then run the P1 consistency review. P1 must remain PARTIAL until decisions and reviewer evidence are recorded.
