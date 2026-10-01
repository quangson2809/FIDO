# 10 — Testing Strategy & Acceptance Matrix

## 1. Test levels

### Unit

- pure price selection;
- Order transition policy;
- Payment transition policy;
- GoodsReceipt transition policy;
- Category tree/leaf rules where implemented as pure logic;
- mapper conversions without persistence.

### Service/integration

- repository constraints and queries;
- transaction rollback;
- state + side-effect coupling;
- inventory ledger creation;
- role/permission mappings;
- snapshot immutability.

### API/controller

- path/method/request binding;
- JSON snake_case and envelope;
- pagination;
- JWT/public access boundaries;
- ownership and permission rejection;
- response DTO does not leak secrets/entities.

### Concurrency

Use real transactional integration testing appropriate to the configured DB stack for Order confirm, GoodsReceipt confirm and payment/idempotent commands. Mock-only tests are insufficient for locking behavior.

## 2. Analyst acceptance criteria AC-01..AC-10

| AC | Required automated behavior |
|---|---|
| AC-01 | Variant override price is used; otherwise Product base price; Order snapshot preserves chosen price |
| AC-02 | Guest can logically create valid COD Order; status PENDING; no inventory decrement |
| AC-03 | Concurrent PENDING confirmation beyond stock: only stock-feasible confirms succeed, no negative/duplicate deduction |
| AC-04 | Recipient editable in PENDING/CONFIRMED/PREPARING, rejected from SHIPPING |
| AC-05 | Invalid Order transition rejected; DELIVERY_FAILED only retries to SHIPPING or cancels |
| AC-06 | UNPAID Order cannot COMPLETE; repeated PAID recording does not duplicate collection |
| AC-07 | Cancellation after deduction restores exact quantity with ledger; PENDING cancellation leaves stock unchanged |
| AC-08 | GoodsReceipt CONFIRMED increments stock once; repeated confirm has no second increment |
| AC-09 | Return policy behavior/recorded outcome follows 2-day + tags baseline; accepted full return -> RETURNED |
| AC-10 | Received sales include shipping; RETURNED subtracts the full order value in the original completion period. Status counts use order creation date; report date bounds use Asia/Ho_Chi_Minh (resolved in docs/15). |

AC-02's guest identity/session plumbing may remain blocked by the explicit guest-session security TBD; keep the business service tests separate from the unresolved authentication/session mechanism.

## 3. Critical catalog tests

- self-parent Category rejected;
- cycle rejected;
- Product cannot use non-leaf Category;
- cannot add child under Category containing Product until Product moved;
- Variant SizeValue from wrong SizeSystem rejected;
- duplicate Product+Size+Color rejected;
- referenced Variant identity cannot be repurposed;
- effective availability combines sale status + inventory.

## 4. Inventory ledger tests

For every stock-changing command, assert both current inventory and exactly one expected ledger movement. Never verify only final quantity.

## 5. Security tests

- public vs JWT routes;
- `/me` ownership isolation;
- admin/employee permission isolation;
- password_hash absent from responses/logs;
- invalid JWT/expired JWT behavior follows current security stack;
- audit actor always server-derived.

## 6. Phase gate

A phase is not complete merely because compilation passes. It must pass its relevant rule/contract/integration tests and leave no known speculative business behavior hidden behind defaults.

For backend PRs, the workflow runs H2 build and MySQL tests, then requires a separate independent Work review on the current PR head. The review assesses applicable architecture/design principles with code evidence and reports blocking findings; `.quality/validate_work_review.py` checks the review payload and SHA, not the truth of its findings. Passing tests does not imply a structural PASS. See `docs/13-codex-prompts.md` for the report contract.
