# P1 — Invariant and Test Matrix

**Status: PARTIAL.** These are acceptance requirements, not tests executed in this P1 documentation pass. Historical P0 baseline recorded 196 H2 tests, 3 failures and 1 skipped. The MySQL target schema workflow passed on SHA 5801dbd for 31-table/229-column metadata and clean-reset seed checks; the subsequent commit dbd7cb6 adds soft-delete phone reuse and negative constraint tests, whose result is pending at the time of this document draft. DB-03/DB-05 mechanics remain unapproved proposals; documenting test cases does not mean they have been executed or passed.

| Test | Condition | Allowed | Forbidden | Protection | Acceptance evidence | Decision |
|---|---|---|---|---|---|---|
| T-SCH-01 | Fresh disposable MySQL 8.4 target | Exactly 31 application tables + Flyway metadata | DDL failure, extra or missing app table | Flyway/DB | Clean install and exact table-set assertion | A-01/DB-09 |
| T-SCH-02 | Physical metadata | Match approved dictionary | Unapproved/missing PK/FK/UK/CHECK/index/nullability | DB | Compare information_schema to frozen contract | DB-09 |
| T-ACC-01 | Duplicate phone/register/login | Approved login identity remains unambiguous | Duplicate or ambiguous login behavior | DB/service | MySQL and authentication HTTP tests | DB-09 |
| T-ACC-02 | Anonymous Cart/Quote/Order | Reject unauthenticated calls | Persistent guest Cart/Order | Security | Tests for API #14–20 | A-03 |
| T-RBAC-01 | Permission change/last SUPERADMIN | Authorized atomic change | Privilege escalation or partial assignment | Service/security | RBAC integration + architecture suite | TD-01 |
| T-SEED-01 | Fresh target installation/system bootstrap | Deterministic required roles/permissions exist; demo fixtures stay separate | Missing grants, duplicate seed, hard-coded credentials or demo account in system seed | Flyway/bootstrap/auth | Fresh MySQL install, repeatable seed check, privilege matrix, source scan for credentials and no-account demo fixture check | DB-11 |
| T-PROD-01 | Missing parent/self-parent/cycle | Reject invalid tree atomically | Dangling or circular hierarchy | FK/service | Unit + MySQL + concurrent reparent tests | DB-01 |
| T-PROD-02 | Null inherited fields | Only approved fields inherit | Implicit category/brand/status/SKU/image inheritance | Product service | PATCH omitted-vs-clear contract tests | DB-01 |
| T-PROD-03 | Duplicate SKU/option set under race | One unique combination per approved policy | Concurrent duplicates | Unique guard/service | MySQL concurrent Product create | DB-01/02 |
| T-ATTR-01 | Option from another Attribute/multiple values | Reject invalid data | Wrong option/type or multiple typed columns | CHECK/FK proposal/service | MySQL constraint + unit/HTTP tests | DB-02 |
| T-ATTR-02 | Missing required child attribute | Reject incomplete sellable child | Invalid child published/sold | Product service | Attribute matrix integration | DB-02 |
| T-IMG-01 | Upload/delete/reorder | Owned, consistent gallery | Cross-product access or historical image drift | Product/audit | Storage fault, auth, ordering and history tests | DB-01/07 |
| T-CART-01 | Add/replace/delete/clear | Account scoped, quantity >0, no stock write | Cross-account access or Cart deduction | DB/Cart service | Unit/integration/concurrency | A-03/DB-01 |
| T-PRICE-01 | Product price changes after quote | Reprice at Order commit | Trust client quote total | Order transaction | Price-race integration | DB-05/06/07 |
| T-IDEM-01 | Same key/payload after response loss | Replay committed Order | Duplicate Order/items/payment/stock/usage | Unique key/transaction | Concurrent MySQL HTTP retry | DB-05 |
| T-IDEM-02 | Same key/different payload or account | Deterministic conflict and account isolation | Payload mutation or cross-account leak | Service/security | API contract security tests | DB-05 |
| T-MONEY-01 | Integer VND multi-line discount/shipping calculation | Every stored amount is integer VND and order totals reconcile exactly under the owner-approved rounding/allocation rule; current formula is only proposed | Fractional VND, negative/inconsistent totals or undocumented rounding | Integer-money domain/service | Property and boundary tests + MySQL: fractional input rejection, discount allocation, quote/order/report reconciliation | DB-06/07/10 |
| T-VOUCH-01 | Date/min/max/type/scope/stacking | Only owner-approved, schema-representable voucher rules redeem; usage caps remain blocked until persistence/concurrency semantics are approved | Legacy scope silently dropped/invented | Voucher service | Parameterized eligibility tests | DB-06 |
| T-VOUCH-02 | Concurrent final-use/cancel retry | Respect approved cap/restoration | Over-redemption/double restoration | Lock/conditional update | Real MySQL concurrency | DB-06 |
| T-VOUCH-03 | Legacy voucher-management DTO against target ERD | Only explicitly approved target-representable behavior is exposed | Silent scope/usage feature loss or implicit voucher_products/voucher_categories/voucher_usages tables | Voucher contract + schema | DTO-to-target metadata comparison; contract tests for scope/limits/active_usage and owner-approved reduced-vs-amended schema behavior | DB-06 |
| T-STOCK-01 | Confirm order with enough/insufficient stock | One deduction at approved transition | Pending deduction/negative/double deduction | Lock/version + transaction | MySQL concurrency; balance=ledger | DB-03 |
| T-STOCK-02 | Confirm receipt twice | One inbound movement | Retry increments twice | State guard + ledger | MySQL concurrent receipt confirm | DB-03 |
| T-STOCK-03 | Same source movement with different keys | No duplicate semantic movement | Duplicate source event | Source guard/unique movement | Concurrent transaction test | DB-03 |
| T-STOCK-04 | Manual adjustment | Authorized actor/reason/key/audit | Empty reason, wrong Product/Warehouse, partial commit | DB/service/audit | API security + rollback | DB-03 |
| T-STOCK-05 | Cancel/restock/reversal | Approved type/source/sign exactly once | Double restock/ambiguous delta | Inventory + Order transition | MySQL transaction test | DB-03/08 |
| T-ORDER-01 | Order state transition | Approved state graph only | Arbitrary status patch or partial side effect | Order service/auth | State-machine contract tests | DB-08 |
| T-ADDR-01 | Address changed after order | Approved Order snapshot policy | History silently shows latest saved address | OrderAddress/service | Order detail regression | DB-07 |
| T-PAY-01 | COD collection/refund retry | Approved amount/actor/time/state | Duplicate collection or unsupported refund | Payment/audit | Security + concurrent integration | DB-08 |
| T-SHIP-01 | Shipping state/recipient | Approved manual transition | Assume carrier integration or diverging receiver | Shipping/Order service | State/DTO integration | DB-08 |
| T-SNAP-01 | Product/image/attribute changes after sale | Historical fields remain snapshots | Rebuild Order from live catalog | OrderItem snapshots | Integration/contract regression | DB-07 |
| T-AUD-01 | Audit sensitive command | Allowlisted JSON | Password/hash/token/OTP/session/secret/raw header | Audit service | Assert prohibited fields absent | DB-09 |
| T-CONT-01 | Public content lookup | Published only | Draft/archived exposure or duplicate slug | DB/content service | API/DB integration | DB-09 |
| T-REPORT-01 | Sales/return/status date range | Approved formula/timezone | Wrong return period/status grouping date | Report query | Fixed fixtures/timezone tests | DB-09/docs15 |
| T-ARCH-01 | Cross-module persistence | Owner service contract; report aggregate-read exception | Cross-module Repository dependency | Architecture tests | Gradle boundary suite | TD-01 |

## Additional mandatory acceptance cases for DB-03/DB-05 and dependent contracts

| ID | Scenario | Required observable result | Verification | Gate |
|---|---|---|---|---|
| T-INV-01 | Two orders compete for final available units | No oversell; one fails atomically; balance equals ledger | MySQL integration test with concurrent transactions | DB-03 |
| T-INV-02 | Goods receipt confirmation retried concurrently/sequentially | One stock increase and one logical ledger posting | MySQL integration test + unique/state guard evidence | DB-03 |
| T-INV-03 | Cancellation retried after committed deduction | At most one restoration; original ledger entry remains immutable | Order/Inventory integration test | DB-03/08 |
| T-INV-04 | Failure on one order line after earlier lines validate | No partial Order, item, payment, inventory or ledger effects | Transaction rollback test | DB-03/05 |
| T-QUOTE-01 | Price, stock, voucher validity or shipping changes after quote | Placement revalidates; material change returns conflict/requote; no Order is created | API integration test | DB-05 |
| T-QUOTE-02 | Same idempotency key and same canonical payload concurrently | One committed Order; other request replays same result | MySQL multi-transaction test and schema unique-key evidence | DB-05 |
| T-QUOTE-03 | Same key but changed payload / another account | Changed payload conflicts; cross-account key never exposes Order | API/security integration tests | DB-05 |
| T-MONEY-01 | Percentage discount and multiple line items | Integer VND only; allocated line discounts sum exactly to order discount; total reconciles | Deterministic unit/property tests with edge vectors | DB-10 |
| T-VOUCHER-01 | Voucher redemption repeated/concurrent | No unsupported usage-limit guarantee; if a limit is promised, storage and atomic enforcement are proven | Contract + MySQL concurrency test | DB-06 |
| T-SNAPSHOT-01 | Product gallery image changes/deletes after Order | Historical image is immutable only if the approved schema and retention strategy prove it; otherwise contract explicitly reports limitation | Persistence/asset-retention test | DB-07 |
| T-PHONE-01 | Soft-delete account then register same normalized phone | Reuse succeeds; concurrent active duplicates fail | MySQL 8.4 integration test, not H2-only | DB-09 |

These are acceptance requirements, not executed-test evidence. P1 documentation review does not imply P0 runtime/MySQL verification has passed.


## Additional target-contract gates

| ID | Scenario | Required observable result | Verification | Gate |
|---|---|---|---|---|
| T-WH-01 | Create/confirm a goods receipt | Receipt persists a real WAREHOUSES FK; v1 service resolves the active single warehouse and rejects an unavailable destination | MySQL schema and receipt API/service tests | DB-04 |
| T-DICT-01 | ERD/SQL/CSV static consistency | Exactly 31 tables; all SQL columns/types/nullability/defaults and generated fields match the dictionary; only documented generated physical fields may be SQL-only | scripts/p1/check_contract_consistency.py | P1 static consistency |
| T-PHONE-02 | Active-only phone uniqueness | Two active accounts cannot share the phone; deleted account releases it; old deleted accounts may retain same phone with NULL generated key | MySQL 8.4 integration, not H2-only | DB-09 |
| T-REFUND-01 | Partial/full refund and retry | Amount/actor/time/reason and state stay consistent; retry cannot refund twice; actor must be authorized | API security and concurrent MySQL tests | DB-08 |

These rows are acceptance requirements, not completed test evidence.
