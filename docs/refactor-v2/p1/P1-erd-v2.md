# P1 — ERD v2 Target and Status

**Status: PARTIAL — owner-approved target contract; runtime alignment and acceptance remain open.**

## Canonical sources

- **P1.3 Product/catalog contract:** [P1.3 Catalog Metadata Contract](P1.3-catalog-metadata-contract.md) defines Product ID/parent-child/SKU/price ownership, typed attributes, metadata filters, image-primary semantics and the documented legacy call-site inventory. It does not alter or supersede the canonical ERD/physical dictionary.

- **Logical ERD:** [phase-1-erd-v2-approved.mmd](../target/erd-v2-approved.mmd)
- **Physical field contract:** [P1-data-dictionary.csv](P1-data-dictionary.csv)
- **Owner decisions:** [P1 owner approval](P1-owner-approval-2026-10-23.md) and [decision log](P1-decision-log.md)
- **Target SQL and system seed:** `backend/src/main/resources/db/migration/V1__fido_target_schema.sql` and `V2__system_seed.sql`
- **Active implementation contract:** [source of truth](../../00-source-of-truth.md), [data model](../../03-data-model.md), [API](../../04-api-contract.md), [DTO](../../05-dto-contract.md), [business rules](../../06-business-rules-state-machines.md), [transaction rules](../../07-transactions-concurrency-idempotency.md).

The canonical ERD contains exactly 31 logical tables. This file intentionally does not copy the entire diagram or list competing schemas: duplicated diagrams had become stale after approval. Change the canonical ERD and data dictionary together, then run the contract-consistency checker and fresh isolated MySQL schema workflow.

## Frozen target rules

- Parent/child Products are explicit, independently sellable Product rows. Each row owns SKU, required integer-VND selling price and stock. One parent-child level is allowed; no field implicitly inherits from NULL.
- Cart, OrderItems, GoodsReceiptItems, Inventories and InventoryTransactions identify the Product directly using `product_id`.
- OPTION/TEXT/NUMBER/BOOLEAN attributes are descriptive; they do not generate Products. Values must match the Attribute's type, and an OPTION must belong to the same Attribute. `is_variant_defining` is informational only.
- Cart/order placement require authentication. Checkout quote is stateless and advisory, without a persisted quote ID, stock reservation or voucher side effect.
- Money is integer VND. Apply order-level HALF-UP rounding, then largest-remainder line allocation with ascending Product ID tie-break.
- Inventory source changes, balance, append-only ledger and required audit commit atomically; use source-derived duplicate prevention and deterministic locking.
- v1 uses a global order-wide non-stacking voucher quota, COD, one operational warehouse and manual shipping. The approved state/actor matrix governs Order, Payment, ShippingInfo and GoodsReceipt.
- `ORDER_ITEMS.image_url_snapshot` is part of the approved target. Snapshot references must resolve to immutable object/version content. Numeric retention durations and legal anonymization/deletion exceptions remain TBD.
- Clean Schema Reset is permitted only against a verified disposable development/test database; no reset is implied or performed by this document.

## Current acceptance status

Owner/business decision gates are recorded, except numeric retention/anonymization values. The application remains PARTIAL until target Entities/Repositories/Services, API/DTOs, frontend, seed, security, transaction/concurrency behavior and acceptance tests are verified on the exact candidate SHA. A passing schema check alone is not runtime acceptance.


> Current database installation authority (2026-10-26): `backend/src/main/resources/db/migration/V1__fido_target_schema.sql` is the only schema/seed SQL. Do not create per-phase SQL migrations; update the approved baseline and Data Dictionary together, then verify on a fresh disposable database.
