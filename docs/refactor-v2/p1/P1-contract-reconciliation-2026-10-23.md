# FIDO P1 — Final ERD v2 / Use-Case / API Contract Reconciliation

**Status: PARTIAL — owner decision gates closed except retention/anonymization values; implementation acceptance remains open.**

- Repository: https://github.com/quangson2809/FIDO
- Target branch: `demo1`
- Target logical authority: [owner-approved ERD v2](../target/erd-v2-approved.mmd), exactly 31 tables.
- Business/physical decisions: [P1 owner approval](P1-owner-approval-2026-10-23.md) and [P1 decision log](P1-decision-log.md).
- Physical contract: [P1 data dictionary](P1-data-dictionary.csv).
- Contract status: [API/DTO](../../04-api-contract.md), [DTO detail](../../05-dto-contract.md), [business rules](../../06-business-rules-state-machines.md), [transactions](../../07-transactions-concurrency-idempotency.md).

## 1. What is resolved

The approved target is one single-merchant v1 system with COD payment, one operational warehouse and manual shipping. It uses explicit parent/child Product rows; Product IDs are the sellable identity. Parent/child Products each own SKU, required price and stock; the Product hierarchy is limited to one level and no field implicitly inherits from NULL.

Target catalog metadata uses typed descriptive Attributes and Options. Types are OPTION, TEXT, NUMBER and BOOLEAN; option ownership is tied to the same Attribute. Attributes never auto-generate Products. No ProductVariant, SizeSystem, SizeValue or Color master tables are part of the target model.

Persisted Cart and order placement require authentication. Cart, OrderItem, goods receipt line, inventory balance and inventory transaction contracts use Product IDs. Quote is stateless/advisory, without a quote ID, stock reservation or voucher side effect. Order-time repricing and account-scoped idempotency with canonical SHA-256 fingerprint, replay for same key/payload and conflict for changed payload are approved.

Money is integer VND end-to-end. Round the order discount HALF-UP, then allocate with largest remainder and ascending Product ID tie-break. Inventory movements use the approved type/source/sign/deduplication/reversal/concurrency contract and append-only ledger. Source state, balance, ledger and required audit must be atomic. Voucher use is order-wide, non-stacking with one global usage limit and at-most-once release on eligible cancellation. One COD Payment aggregate is used per Order; at most one full refund is permitted in v1.

Clean Schema Reset is authorized only for a verified disposable local/development/test database. No database reset was executed by this reconciliation or owner approval. Production, staging, shared integration and persistent business data are excluded.

## 2. Current disposition of legacy artifacts

The active target contract no longer treats the existing implementation/schema/API as an alternative design. The following source-only concepts are excluded from the target model unless the owner explicitly amends the ERD/API:

- ProductVariant IDs, SizeSystem/SizeValue/Color master tables and variant-combination generation.
- Variant-keyed CartItems, OrderItems, GoodsReceiptItems, inventory balances and ledger.
- Decimal money as the application money contract; target money is integer VND.
- Persisted CheckoutQuote / quote_id and inventory reservations.
- Voucher Product/Category targeting, per-account quota ledger, and omitted payment/refund/shipping/return event tables.
- Guest Cart, guest checkout, guest order lookup and guest Cart merge.

The P1 API mapping preserves the old route inventory only for migration traceability. The old variant and size/color-master routes are marked retired from the target API. Their presence in legacy code/migrations does not authorize target tables/routes or override the current API/DTO files.

## 3. Runtime integration and acceptance still required

Owner approval closes design-choice gates; it is not evidence that implementation has passed. The P1 traceability/API mapping records the remaining work:

- Align Entity, composite keys, Repository, owning Service and transactions to the target DDL.
- Align public/admin request and response DTOs, controllers, validation and permissions with Product IDs, descriptive Attributes, integer-VND money and stateless quote behavior.
- Align frontend types, API client and cart/checkout/product/inventory/receiving flows to the same contract.
- Verify Product hierarchy/type constraints, active-phone uniqueness, authentication ownership and RBAC guards.
- Test order repricing, idempotency replay/conflict/cross-account isolation, voucher quota races, COD/state transitions, immutable snapshots and complete rollback.
- Test receipt confirmation, last-stock races, source-derived deduplication, append-only reversals, adjustments and ledger-to-balance reconciliation on MySQL.
- Validate a fresh isolated MySQL install against all 31 target tables and seed data on the exact candidate SHA.

No runtime refactor is claimed by this documentation reconciliation. The default active migration chain remains unchanged until target mappings are ready and separately approved for activation.

## 4. Remaining owner input

The numeric retention durations for audit logs, immutable image assets and personal/business data, and any legally required anonymization/deletion exceptions, remain TBD under DB-12. Do not introduce scheduled purging until approved. All other DB-01/02/03/05/06–11/API defaults recorded in the owner approval are frozen target behavior; discrepancies found in code are implementation issues, not new owner-choice questions.
