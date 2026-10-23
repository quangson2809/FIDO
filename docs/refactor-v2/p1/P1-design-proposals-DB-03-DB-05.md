# P1 Design Proposals — DB-03 Inventory and DB-05 Checkout

**STATUS: OWNER-APPROVED TARGET CONTRACT (2026-10-23); IMPLEMENTATION/TESTS PENDING.** The owner explicitly approved DB-03 and DB-05 proposals. This freezes the target rules below; it does not imply that runtime code or concurrency/acceptance tests already pass.

Current target draft: 31 logical tables; SQL includes warehouse destination, inventory ledger reason/reversal references, order idempotency key + request fingerprint, integer-VND totals, voucher usage counter, order image snapshot, and refund metadata. Runtime schema verification is a separate gate. Live backend and frontend still implement legacy Variant/BigDecimal/quote-ID contracts.

## 1. DB-03 — Inventory, receipt, ledger and concurrency

### Current target-schema evidence

- v1 has one operational warehouse (decision A-04). WAREHOUSES exists; GOODS_RECEIPTS.warehouse_id is NOT NULL and references WAREHOUSES. The service should resolve the active single warehouse, not trust an arbitrary public-client warehouse ID.
- INVENTORIES has composite primary key (warehouse_id, product_id), a nonnegative quantity check and version field. The balance has no reservation column; quote/cart actions must not reserve stock.
- INVENTORY_TRANSACTIONS has warehouse_id, product_id, signed quantity_delta, transaction_type, nullable goods_receipt_item_id/order_item_id, unique idempotency_key, reason_code and nullable self-FK reverses_transaction_id. Its current draft CHECK accepts OPENING, GOODS_RECEIPT, ORDER, ORDER_CANCEL_REVERSAL, RETURN_RESTOCK and ADJUSTMENT; do not use a different literal set without updating ERD, SQL, dictionary, services and tests together.
- Current draft has no CHECK that enforces the source-column shape for each movement type, no unique constraint on the semantic source event independent of client/server key, and no constraint equating inventory balances to ledger sums. Those are behavioral/transaction invariants, not proven by field presence.

### Approved movement semantics — owner accepted 2026-10-23

| Draft type | Proposed effect | Expected source | Proposed requirements |
|---|---:|---|---|
| OPENING | positive | no receipt/order item | explicit opening movement; never silently seed a balance without ledger evidence |
| GOODS_RECEIPT | positive | exactly one goods_receipt_item_id | only on the first successful receipt confirmation |
| ORDER | negative | exactly one order_item_id | only after rechecking current product price/status and sufficient stock |
| ORDER_CANCEL_REVERSAL | positive | original order-item movement / reverses_transaction_id | at most one reversal of an eligible prior deduction |
| RETURN_RESTOCK | positive only when item is approved to return to sellable stock | order item and/or explicit reversal link per accepted contract | return decision and inventory restoration must be atomic |
| ADJUSTMENT | non-zero signed delta | no receipt/order item | require reason code, authorized actor and idempotency/correlation key |

ORDER_CANCEL_REVERSAL must reference the original ORDER movement. RETURN_RESTOCK must reference the order item and original stock deduction; it is allowed only after an authorized return decision determines the item is sellable again, and at most once for the accepted return event. The same semantic source movement submitted under a different request key must still be rejected through a source-derived uniqueness strategy plus guarded state transition.

### Proposed transaction protocol

1. Treat every receipt confirmation, order placement, cancellation, return-restock and manual adjustment as one transaction covering source state, inventory balance, ledger rows and audit evidence.
2. Lock affected inventory rows in a deterministic ascending product_id order; for missing rows, handle a composite-key insert race by reselecting under lock.
3. Validate every line before writing stock changes. Use guarded updates (quantity_on_hand >= requested quantity) as a final defense; require exactly one affected row and roll back the whole business command on failure.
4. Lock the receipt/order before state transitions. A receipt can be edited only while DRAFT; confirmation is one-way. A confirmed receipt must not be edited or cancelled by mutating its original ledger effects.
5. Create reversals as new ledger movements, never by editing/deleting original history. A uniqueness exception must roll back, then a caller may replay only after checking the committed source/key and payload.
6. Actor identity comes from authenticated server context. Implement the reason_code vocabulary and validation, command-scoped idempotency, deterministic lock order, explicit opening-balance process and source/reversal guards as required by the approved contract.

### Required tests

- Two simultaneous orders compete for last units: at most one commits; stock never becomes negative.
- A multi-line order with one insufficient line leaves no Order/Payment/ledger/balance/cart partial writes.
- Concurrent confirmation of a receipt creates exactly one inbound movement per receipt item.
- Same source event retried after response loss or with another key cannot duplicate stock.
- Concurrent cancellation/return cannot create multiple reversal/restock movements.
- Every committed inventory balance equals the sum of opening and subsequent ledger deltas for that warehouse/product.
- Missing reason/key or insufficient permission rejects a manual adjustment; audit actor is derived from auth.

These concurrency and semantic tests are not yet evidenced as passing. The MySQL schema suite only covers actual DDL constraints and targeted negative cases.

## 2. DB-05 — Checkout quote, idempotency and order-time repricing

### Current target-schema evidence

- The target ERD has no CHECKOUT_QUOTES table. The approved target quote is stateless/advisory and has no stock or voucher side effects. The legacy backend has CheckoutQuote Entity/Repository/service and the frontend submits quote_id; removing/replacing that contract is an intentional API-breaking change to implement against this approval record.
- ORDERS currently has a globally unique idempotency_key and request_fingerprint CHAR(64). The fingerprint field therefore exists in the target schema; it is not mapped into the current legacy Order entity/service/API. Its canonicalization, replay rules, retention and typed conflict response are approved by the 2026-10-23 owner decision; runtime mapping/tests remain pending.
- Proposed client key scope is one logical create-order operation per authenticated account. Derive the persisted key namespace from the authenticated account and the client operation key (for example, a deterministic hash of both) so the globally unique stored key is account-scoped. Never trust an account ID from the request body. Another account reusing the same client key produces a different stored namespace and cannot discover the first account's Order.
- A unique key plus fingerprint does not by itself create correct retry behavior. Application code must distinguish same-key/same-payload replay from same-key/changed-payload conflict, roll back a losing concurrent transaction, and never reveal another account's Order.

### Approved retry contract — owner accepted 2026-10-23

| Condition | Candidate behavior |
|---|---|
| New key | Re-read current cart, product state/price, inventory, voucher state and server-owned shipping values; calculate and create atomically |
| Same scoped key + same canonical payload + committed Order | Return the existing confirmation; do not consume stock/voucher a second time |
| Same scoped key + different semantic payload | Deterministic conflict; never mutate the original Order |
| Concurrent duplicate requests | One transaction commits; loser rolls back, loads the winner and replays or conflicts after comparing fingerprints |
| Commit succeeded but response was lost | Find the committed Order using the accepted idempotency scope and replay the existing result |
| A different account reuses a client UUID | Resolve to a different account-scoped stored key; never reveal another account's Order |
| Two different keys race against the same stock | Lock and revalidate inventory; at most one may consume the last units |

### Candidate atomic order-placement sequence

1. Resolve account from authentication and normalize the idempotency key and semantic payload. Client totals, prices, discounts, stock and currency are never trusted.
2. If a committed order exists for the accepted key scope, compare the persisted fingerprint: replay only if equivalent; otherwise return the frozen conflict error.
3. Load a non-empty active cart, validate quantities and receiver/address fields, then lock inventory in deterministic product order.
4. Re-read Product price/status and available stock. Quote is advisory and does not reserve stock; reprice and validate again at placement.
5. Validate at most one order-wide voucher, current status/window/minimum and approved quota policy; do not use Product/Category targeting because DB-06 excludes it.
6. Calculate integer VND subtotal, discount, shipping fee and total using the accepted rounding/allocation rules. Persist item/address/voucher/image snapshots.
7. Commit Order, OrderItems, OrderAddress, voucher snapshot/counter, COD Payment, inventory ledger/balances, cart mutation and audit in one transaction; any failure rolls back every write.
8. On a key collision, roll back first, then query the committed winner and compare the fingerprint. Never continue after a unique-key exception with partial writes.

### Money, voucher and snapshot constraints

- Target monetary values use integer VND. The ERD draft describes percent voucher values as integer basis points and fixed values as integer VND. Legacy Java currently uses BigDecimal, computes percentage as a percent value divided by 100 and rounds to two decimals; frontend money fields still represent legacy amounts. The conversion must be consistent across calculation, JSON, persistence, reporting and FE formatting.
- Approved rounding/allocation: calculate the integer order discount with HALF-UP rounding, then allocate line discounts using largest remainder and a stable product_id-ascending tie-break. Allocated amounts must sum exactly to the order discount and no line/order amount may be negative or contain fractional VND.
- VOUCHERS.usage_count exists and is bounded by usage_limit. The approved policy is a global quota, atomic increment in the order transaction and at-most-once restoration when an eligible order cancellation releases the use. Return/refund does not restore the use by default. These behaviors still require MySQL concurrency/retry tests; the column alone does not implement them.
- ORDER_ITEMS.image_url_snapshot exists, but immutable content requires a stable object/version reference and an explicit retention/deletion/overwrite policy. A URL string alone is not proof the referenced bytes remain unchanged.
- Payment refund metadata columns exist, but refund idempotency/partial/full state transitions and authorization remain DB-08 work, separate from DB-05.

### Required tests

- Same-key retry after lost response returns the same Order without duplicating stock/payment/voucher effects.
- Concurrent same-key same-payload calls create one Order; changed quantity/voucher/address with the same key conflicts and preserves the original.
- Client totals are ignored; product/price/stock/voucher changes after quote are rechecked at placement.
- Injected failure at every write stage rolls back order, snapshots, payment, inventory/ledger, voucher and cart changes.
- Discount allocation uses integer VND, is deterministic for ties and reconciles exactly to order totals with no fractional VND.
- If quota remains enabled, concurrent last-redemption requests prove the counter cannot exceed usage_limit on MySQL 8.4.

## 3. Implementation and verification gates before P1 PASS

The owner has approved the behavior in this document. The following are engineering acceptance tasks, not unresolved owner choices:

1. Implement and test the approved parent/child constraints: one hierarchy level, explicit child creation, required row-owned SKU/price/stock and no implicit inheritance.
2. Implement the approved global voucher counter transactionally; prove concurrent last-use requests cannot exceed the limit and cancellation restores a use at most once.
3. Implement stable immutable image references and historical access. The numeric retention duration for images remains TBD under DB-12; do not add scheduled purging yet.
4. Implement COD/order transition authorization and at-most-one full refund. Partial/multiple refunds and detailed item-level returns remain out of v1 unless the ERD is amended.
5. Map active-phone uniqueness and soft deletion into the Account entity/service; schema tests alone do not prove the auth flow.
6. Test Flyway system seeds and the external-secret SUPERADMIN bootstrap, including a source/configuration secret scan.
7. Align the runtime Entity/Repository/API/DTO/frontend away from legacy ProductVariant, quote_id, voucher targeting and BigDecimal contract shapes.
8. Complete MySQL acceptance tests for source-event dedupe, inventory race/reversal, same-key replay/conflict, injected rollback, integer-VND allocation, deletion/FK behavior and history snapshots.

## Recommendation

Treat the target rules above as approved. Proceed with P2 implementation using a clean target schema only in a verified disposable development/test database. Keep P1 PARTIAL until implementation, acceptance tests and exact-SHA CI prove alignment; decide numeric retention periods before any automated purge or final retention-policy freeze.
