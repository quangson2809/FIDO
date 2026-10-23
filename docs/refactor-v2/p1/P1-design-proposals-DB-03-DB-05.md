# P1 Design Proposals — DB-03 Inventory and DB-05 Checkout

**STATUS: PROPOSED — NOT OWNER-APPROVED.** DB-03 and DB-05 were explicitly selected as requests for a design proposal. The presence of proposed fields in ERD/SQL, this document, or a green static check does not mean the owner approved the mechanics.

Current target draft: 31 logical tables; SQL includes warehouse destination, inventory ledger reason/reversal references, order idempotency key + request fingerprint, integer-VND totals, voucher usage counter, order image snapshot, and refund metadata. Runtime schema verification is a separate gate. Live backend and frontend still implement legacy Variant/BigDecimal/quote-ID contracts.

## 1. DB-03 — Inventory, receipt, ledger and concurrency

### Current target-schema evidence

- v1 has one operational warehouse (decision A-04). WAREHOUSES exists; GOODS_RECEIPTS.warehouse_id is NOT NULL and references WAREHOUSES. The service should resolve the active single warehouse, not trust an arbitrary public-client warehouse ID.
- INVENTORIES has composite primary key (warehouse_id, product_id), a nonnegative quantity check and version field. The balance has no reservation column; quote/cart actions must not reserve stock.
- INVENTORY_TRANSACTIONS has warehouse_id, product_id, signed quantity_delta, transaction_type, nullable goods_receipt_item_id/order_item_id, unique idempotency_key, reason_code and nullable self-FK reverses_transaction_id. Its current draft CHECK accepts OPENING, GOODS_RECEIPT, ORDER, ORDER_CANCEL_REVERSAL, RETURN_RESTOCK and ADJUSTMENT; do not use a different literal set without updating ERD, SQL, dictionary, services and tests together.
- Current draft has no CHECK that enforces the source-column shape for each movement type, no unique constraint on the semantic source event independent of client/server key, and no constraint equating inventory balances to ledger sums. Those are behavioral/transaction invariants, not proven by field presence.

### Candidate movement semantics — approval required

| Draft type | Proposed effect | Expected source | Proposed requirements |
|---|---:|---|---|
| OPENING | positive | no receipt/order item | explicit opening movement; never silently seed a balance without ledger evidence |
| GOODS_RECEIPT | positive | exactly one goods_receipt_item_id | only on the first successful receipt confirmation |
| ORDER | negative | exactly one order_item_id | only after rechecking current product price/status and sufficient stock |
| ORDER_CANCEL_REVERSAL | positive | original order-item movement / reverses_transaction_id | at most one reversal of an eligible prior deduction |
| RETURN_RESTOCK | positive only when item is approved to return to sellable stock | order item and/or explicit reversal link per accepted contract | return decision and inventory restoration must be atomic |
| ADJUSTMENT | non-zero signed delta | no receipt/order item | require reason code, authorized actor and idempotency/correlation key |

The exact source relationship for RETURN_RESTOCK and ORDER_CANCEL_REVERSAL is still a design choice. The same semantic source movement submitted under a different key is not automatically prevented by a unique idempotency_key alone; use state guards and an accepted source-derived uniqueness strategy.

### Proposed transaction protocol

1. Treat every receipt confirmation, order placement, cancellation, return-restock and manual adjustment as one transaction covering source state, inventory balance, ledger rows and audit evidence.
2. Lock affected inventory rows in a deterministic ascending product_id order; for missing rows, handle a composite-key insert race by reselecting under lock.
3. Validate every line before writing stock changes. Use guarded updates (quantity_on_hand >= requested quantity) as a final defense; require exactly one affected row and roll back the whole business command on failure.
4. Lock the receipt/order before state transitions. A receipt can be edited only while DRAFT; confirmation is one-way. A confirmed receipt must not be edited or cancelled by mutating its original ledger effects.
5. Create reversals as new ledger movements, never by editing/deleting original history. A uniqueness exception must roll back, then a caller may replay only after checking the committed source/key and payload.
6. Actor identity comes from authenticated server context. reason_code vocabulary, requiredness, idempotency key scope/length, lock order, opening-balance process and reversal/source checks must be explicitly accepted before implementation.

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

- The target ERD has no CHECKOUT_QUOTES table. The proposed target quote is stateless/advisory and has no stock or voucher side effects. The current legacy backend does have CheckoutQuote Entity/Repository/service and current frontend submits quote_id; removing or reinterpreting this is an API-breaking change that requires the target contract to be accepted first.
- ORDERS currently has a globally unique idempotency_key and request_fingerprint CHAR(64). The fingerprint field therefore exists in the target schema; it is not mapped into the current legacy Order entity/service/API. Its canonicalization, replay rules, retention and conflict response remain unapproved.
- Proposed client key scope is one logical create-order operation per authenticated account. A candidate stored key can be namespaced with server-derived account identity and the client UUID; never trust account ID from request body. Because the draft unique constraint is global, the key format and cross-account reuse behavior must be explicitly frozen rather than assumed.
- A unique key plus fingerprint does not by itself create correct retry behavior. Application code must distinguish same-key/same-payload replay from same-key/changed-payload conflict, roll back a losing concurrent transaction, and never reveal another account's Order.

### Candidate retry contract — approval required

| Condition | Candidate behavior |
|---|---|
| New key | Re-read current cart, product state/price, inventory, voucher state and server-owned shipping values; calculate and create atomically |
| Same scoped key + same canonical payload + committed Order | Return the existing confirmation; do not consume stock/voucher a second time |
| Same scoped key + different semantic payload | Deterministic conflict; never mutate the original Order |
| Concurrent duplicate requests | One transaction commits; loser rolls back, loads the winner and replays or conflicts after comparing fingerprints |
| Commit succeeded but response was lost | Find the committed Order using the accepted idempotency scope and replay the existing result |
| A different account reuses a client UUID | Do not reveal the other account's Order; define whether namespaced keys make this independent or the API returns a generic conflict |
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
- Rounding proposal: calculate an integer order discount with an explicit half-up rule, then allocate line discounts using largest remainder and a deterministic tie-break; allocated amounts must sum exactly to the order discount and no line/order amount may be negative. This algorithm remains proposed, not owner-approved.
- VOUCHERS.usage_count exists in the target schema and is bounded by usage_limit. Atomic increment under concurrent checkout, global versus per-account scope, cancelled-order restoration, return/refund effects and retry rules still need approval and tests. The column alone does not implement the behavior.
- ORDER_ITEMS.image_url_snapshot exists, but immutable content requires a stable object/version reference and an explicit retention/deletion/overwrite policy. A URL string alone is not proof the referenced bytes remain unchanged.
- Payment refund metadata columns exist, but refund idempotency/partial/full state transitions and authorization remain DB-08 work, separate from DB-05.

### Required tests

- Same-key retry after lost response returns the same Order without duplicating stock/payment/voucher effects.
- Concurrent same-key same-payload calls create one Order; changed quantity/voucher/address with the same key conflicts and preserves the original.
- Client totals are ignored; product/price/stock/voucher changes after quote are rechecked at placement.
- Injected failure at every write stage rolls back order, snapshots, payment, inventory/ledger, voucher and cart changes.
- Discount allocation uses integer VND, is deterministic for ties and reconciles exactly to order totals with no fractional VND.
- If quota remains enabled, concurrent last-redemption requests prove the counter cannot exceed usage_limit on MySQL 8.4.

## 3. Other open decisions that prevent P1 PASS

1. Product parent/child depth and inheritance of name, slug, description, selling_price, category_id and brand_id are not resolved. NULL does not implicitly mean inherit; requiredness and parent-update propagation must be specified per field.
2. DB-06 defines voucher scope but still needs quota scope and cancellation/restoration policy consistent with usage_count.
3. DB-07 defines snapshots but still needs retained image asset/version policy and historical access tests.
4. DB-08 defines COD/order lifecycle/refund direction but still needs partial/full refund semantics, idempotency, state transitions, return/restock, actor authorization and audit behavior.
5. DB-09's generated phone_active_key is present in the target draft. MySQL schema tests cover active uniqueness; the new soft-delete/reuse test must pass before claiming the full rule is verified.
6. DB-11 system role/permission seed is in V2__system_seed.sql and the clean-reset tests verify basic seed counts/grants; the external secret bootstrap path still needs a source/configuration security audit.
7. DB-12 has no owner-approved per-entity deletion/cascade/restrict/retention matrix.
8. These are target-schema documents only. Current Entity/Repository/API/DTO/frontend still use legacy ProductVariant, quote_id, voucher targeting and BigDecimal shapes, so they must not be labelled target-compatible.

## Recommendation

Review and explicitly accept/revise DB-03 and DB-05. Continue keeping P1 PARTIAL until behavior decisions, full mapping and fresh evidence are recorded. The design proposal itself is not approval and must not authorize P2.
