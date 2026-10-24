# P1 — Approved Target Invariant and Test Matrix

**Status: PARTIAL.** This file defines required tests; it does not claim they have run or passed. Historical schema/MySQL runs apply only to their recorded SHAs. The owner-approved behavior supersedes earlier rows that treated DB-03/DB-05 mechanics as unresolved.

| ID | Scenario | Required result | Verification |
|---|---|---|---|
| T-SCH-01 | Empty disposable MySQL target | Exactly 31 target logical tables plus migration metadata; all required seed data installed. | Fresh MySQL install and exact table inventory on candidate SHA. |
| T-SCH-02 | Physical SQL contract | SQL types, nullability, defaults, generated key, PK/FK/UK/CHECK/index and delete actions match canonical dictionary. | CSV parser + contract checker + information_schema assertions. |
| T-ACC-01 | Active phone collision / soft-delete reuse | Active duplicate rejected; phone reusable after soft delete; login errors are generic. | MySQL registration/auth tests including concurrent requests. |
| T-ACC-02 | JWT/public access | Public only for approved public routes; Cart/quote/order require authenticated ownership. | HTTP tests for anonymous, expired, invalid and cross-account cases. |
| T-RBAC-01 | Permission mutation / last SUPERADMIN | Authorized grants commit with audit; last administrator cannot be removed even under race. | Security and concurrent MySQL integration. |
| T-SEED-01 | System seed/bootstrap | Required roles/permissions are reproducible; demo fixture separate; no committed bootstrap credentials. | Fresh seed/repeatability checks, source scan and privilege matrix. |
| T-PROD-01 | Product parent/child | One level only; self-parent, cycles and invalid references rejected. Each Product has own SKU, required integer-VND selling price and stock. | Unit, API and concurrent hierarchy tests. |
| T-PROD-02 | NULL and field updates | NULL name/slug/description remain NULL; no implicit parent inheritance. | Create/update omitted-vs-null tests. |
| T-ATTR-01 | Typed attributes | OPTION/TEXT/NUMBER/BOOLEAN values match the declared Attribute type; exactly one compatible typed value. | Unit/API and database constraint tests. |
| T-ATTR-02 | Option ownership / variant metadata | Cross-Attribute option rejected; is_variant_defining does not create Products or generate sale identity. | MySQL FK/composite-check + service tests. |
| T-CART-01 | Authenticated Cart item CRUD | Lines use product_id; positive quantity; account/line ownership enforced; mutations never reserve stock. | API/integration tests, including multiple Cart rows if present. |
| T-CART-02 | Current Cart selection | The API/workflow contract explicitly defines and tests current-Cart selection if multiple Cart rows exist; do not infer one-active-Cart uniqueness or merge from the schema. | API contract review and service tests. |
| T-QUOTE-01 | Quote calculation | Stateless/advisory; no quote row/ID, stock reservation, voucher mutation or Order side effect. | Database write-set assertions around quote calls. |
| T-ORDER-01 | Order placement reprice | Reload current Product eligibility/price, stock, voucher and server-owned shipping inputs. | Price/stock/voucher race integration. |
| T-IDEM-01 | Same key and same semantic payload | Concurrent duplicate requests produce one committed Order and replay the same result. | Real MySQL multi-transaction/API retry test. |
| T-IDEM-02 | Changed payload / cross-account key | Changed payload conflicts; another Account cannot observe the result. | API/security integration. |
| T-MONEY-01 | Multi-line integer money | All money is whole VND; HALF-UP order discount and largest-remainder allocation reconcile exactly using ascending Product ID tie-break. | Property/boundary tests plus Order/report reconciliation. |
| T-VOUCH-01 | Global quota final-use race | Usage limit is not exceeded; usage_count increments atomically with placement. No catalog targeting or per-account usage ledger. | Real MySQL concurrency. |
| T-VOUCH-02 | Eligible cancellation/retry | Usage is restored at most once and rollback is complete if cancellation fails. | Sequential/concurrent cancellation and injected-failure tests. |
| T-STOCK-01 | Competing for final stock | No oversell/negative balance; losing command rolls back. | MySQL concurrent transaction and ledger reconciliation. |
| T-STOCK-02 | Receipt confirm retry/race | One stock increase and one logical GOODS_RECEIPT movement. | Concurrent receipt-confirm integration. |
| T-STOCK-03 | Duplicate semantic source under different request keys | One logical movement only; request-key uniqueness alone is not the only dedupe guard. | MySQL source-key and concurrency tests. |
| T-STOCK-04 | Cancellation / return / adjustment | Approved positive/negative movement, reason/source constraints, linked reversal and at-most-once restore. | Inventory/Order integration and audit assertions. |
| T-STOCK-05 | Missing balance read / negative movement | Read returns 0/version 0 with no writes; negative command fails and leaves no row, ledger or audit residue. | API/MySQL transaction test |
| T-STOCK-06 | Concurrent first positive movements on one missing balance | One balance row, no lost quantity/version update, one ledger row per accepted semantic source. | Real MySQL concurrency test |
| T-STOCK-07 | Quantity/version bounds and stale expected_version | Reject underflow, signed-INT overflow, version overflow and stale precondition without partial writes. | API/MySQL boundary tests |
| T-STOCK-08 | Same receipt item/OrderItem/reversal/return event replayed with different transport keys | Exactly one semantic movement; same source with changed canonical payload conflicts. | Real MySQL source-dedupe test |
| T-STOCK-09 | Adjustment source_operation_id reused under different transport keys | Same payload replays one result; source-operation key prevents a second movement. | API/integration test |
| T-STOCK-10 | Adjustment source_operation_id reused with a changed Product/delta/reason | Deterministic source/idempotency conflict and no second balance/ledger update. | API/integration test |
| T-STOCK-11 | Receipt edit/confirm/cancel race or empty receipt confirmation | One legal state transition wins; empty confirm fails; cancel posts no stock; confirmed data is immutable. | Real MySQL concurrency test |
| T-STOCK-12 | Inject failure after balance update, ledger insert or audit | Full rollback; source state, balance/version and ledger remain consistent. | Failure-injection integration test |
| T-STOCK-13 | Reconcile all warehouse/Product pairs | quantity_on_hand equals ledger delta sum; version equals committed balance-movement count from zero baseline. | MySQL reconciliation test |
| T-TX-01 | Inject failure midway through write set | No partial Order/items/Payment/Cart/stock/ledger/voucher/audit state. | Failure-injection rollback test on MySQL. |
| T-STATE-01 | Order/Payment/ShippingInfo/GoodsReceipt | Approved status/actor matrix only; invalid transitions and duplicate COD collection/refund rejected. | API authorization and state-machine tests. |
| T-SNAP-01 | Product/address/voucher/image changed after order | Order-time snapshots remain stable; image snapshot resolves immutable object/version content. | Persistence and storage-version integration. |
| T-REPORT-01 | Reporting and content | Approved money formulas/timezone apply; public reads expose published content only; audit excludes secrets/needless PII. | Query/API/time-boundary/redaction tests. |
| T-FE-01 | Frontend contract and responsive workflows | API client/types/screens use Product IDs, stateless quote, integer-VND values and target state literals. | Lint/type-check/build and smoke checks at 375/768/1024/1440. |

## Mandatory acceptance rules

- Run all schema and MySQL integration checks on a freshly created isolated disposable DB at the exact candidate SHA.
- Verify end-to-end account/RBAC, Product/typed-attribute, Cart, quote, Order, voucher, inventory/receiving, COD/shipping, snapshots, audit and frontend workflows.
- A static schema pass cannot prove API authorization, transaction rollback, idempotency, locking, concurrency, asset retention or user-flow behavior.
- A test not run on the reported SHA must not be marked PASS. Report skips/failures and their impact explicitly.
- Clean Schema Reset is prohibited on production, staging, shared integration and persistent business data. No reset is performed by maintaining this matrix.
