# P1 Architecture Review — Target vs Current Runtime

**Verdict: PARTIAL — architectural direction remains suitable; target runtime integration and acceptance are not complete.**

This review uses owner-approved ERD v2 and DB-01–DB-12 defaults recorded on 2026-10-23. Earlier draft/proposal language in the source review is superseded by the owner decision record. Legacy code/schema findings below remain implementation evidence, not target requirements.

## 1. Architecture fit

- Modular Monolith + Package by Feature is appropriate for the current project evidence; retain the existing Java/Spring/Gradle stack.
- Keep Controller → owning Service → Repository. A module owns its persistence and writes; cross-module writes go through the owning module’s service.
- Current architecture does not justify adding GoF patterns or a new abstraction hierarchy as ceremony. Add an abstraction only when a concrete duplicated rule, policy variation or dependency boundary requires it.
- Use Flyway for target schema and system seed; ORM-generated schema is not the source of truth.
- DTOs must be explicit and independent of persistence entities. Do not expose JPA entities as REST response bodies.

## 2. Confirmed target compatibility findings

| Severity | Finding | Target correction |
|---|---|---|
| MAJOR | Current persistence model still maps Account to legacy identity/deletion semantics. | Map ACCOUNTS.id, soft-delete lifecycle and generated active-phone uniqueness; verify phone reuse after soft deletion. |
| MAJOR | Current Product/Cart/Order/receipt/inventory paths use ProductVariant/variant identifiers and legacy Size/Color models. | Use explicit Product rows and product_id throughout the approved target; typed attributes are descriptive, not Product generators. |
| MAJOR | Current checkout persists/consumes quote_id and Order flow lacks target idempotency/fingerprint mapping. | Stateless quote; order-time reprice; authenticated account-scoped idempotency with replay/conflict and full rollback. |
| MAJOR | Current money path uses legacy BigDecimal/two-decimal calculations. | Integer-VND end-to-end and the approved HALF-UP/largest-remainder allocation rule. |
| MAJOR | Current voucher path supports catalog targeting and legacy usage structures. | Global order-wide non-stacking limit, atomic usage_count consumption/release; no per-account usage ledger or catalog-targeting persistence. |
| MAJOR | Current payment/shipping/state transitions do not fully map to the approved target. | COD-only, one Payment per Order, at most one full refund, manual shipping and approved state/actor matrix. |
| MAJOR | Current image/order snapshot path does not prove target immutable content-version semantics. | Write ORDER_ITEMS.image_url_snapshot and verify its immutable object/version remains resolvable; numeric retention duration remains TBD. |
| MINOR | Generated `accounts.phone_active_key` is physical enforcement rather than a writable domain field. | Keep Entity/write DTO free of a client-controlled generated value; test against MySQL. |

## 3. Transaction and concurrency review

Target runtime acceptance must prove the following on MySQL, not mocks alone:

- Order placement atomically writes Order, item/address/voucher/image snapshots, COD Payment, Cart mutation, voucher usage, stock balance/ledger and audit.
- Inventory movement source/sign/dedupe and source state, stock, append-only ledger and audit commit or roll back together.
- Deterministic Product-ID lock ordering and guarded balance/version updates prevent negative stock and duplicate semantic movements.
- Same account-scoped order key/payload replays; changed payload conflicts; cross-account results are isolated. Concurrent duplicate submissions create one Order.
- Concurrent voucher final-use requests respect the global limit; eligible cancellation restores usage at most once.
- The last-SUPERADMIN guard and all required permission checks hold under concurrent changes.

## 4. Status and next gate

**P1/P2 remains PARTIAL** until Entity/Repository/Service/API/DTO/frontend, target seed, authorization, transaction/rollback/concurrency and responsive client tests pass on the exact candidate SHA.

The owner decision gates for DB-03 and DB-05 are closed. Their implementation and acceptance evidence is not. Numeric audit/image/personal-data retention and anonymization exceptions remain TBD under DB-12. Do not block unrelated implementation work on ordinary technical naming choices, but stop any slice whose required API contract is genuinely unspecified (including the exact HTTP transport for the order idempotency key and Attribute/Option write routes).

Do not activate the clean-reset schema against a shared/persistent database. No database reset or runtime implementation is claimed by this review.
