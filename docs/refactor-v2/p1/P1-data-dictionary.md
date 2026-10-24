# P1 Data Dictionary — Canonical Artifact and Status

**Status: PARTIAL — approved target field contract; runtime mappings and behavioral acceptance remain open.**

## Source of truth

- The canonical physical dictionary is [P1-data-dictionary.csv](P1-data-dictionary.csv), an RFC 4180 CSV with one row per target physical column.
- Logical model: [approved ERD v2](../../refactor/phase-1-erd-v2-approved.mmd).
- Owner decisions: [P1 approval record](P1-owner-approval-2026-10-23.md) and [decision log](P1-decision-log.md).
- Target DDL and system seed: `backend/src/main/resources/db/clean-reset/V1__clean_schema.sql` and `V2__system_seed.sql`.

Use a real CSV parser. The CSV records logical meaning, physical SQL proposal/nullability/default, generated fields, keys and constraints, owner module, transaction/use-case context, current implementation status and evidence. The current-runtime columns are a discrepancy inventory, not alternative target schema requirements.

## Approved contract interpretation

- Catalog-specific meanings and validation rules are detailed in [P1.3 Catalog Metadata Contract](P1.3-catalog-metadata-contract.md). The CSV remains the physical-column contract; P1.3 current-runtime statuses are evidence of migration work, not proof of runtime alignment.

- Target logical table count is 31. The physical DDL has a generated active-phone key that is not a separate logical table or owner-facing domain field.
- Money amounts use whole integer VND. DECIMAL is permitted only where the target dictionary explicitly defines a descriptive numeric attribute, not as the application money type.
- `product_id` is the item identity for Cart, OrderItems, GoodsReceiptItems, inventory balances and stock ledger.
- Typed descriptive attributes never auto-generate Products; `is_variant_defining` is informational only.
- Approved DB-03 and DB-05 behavior is no longer an owner-decision blocker. Runtime concurrency/idempotency/rollback tests are still required.
- Owner-approved status/defaults in the canonical contracts supersede older proposal wording and historical audit snapshots.

## Validation

Before accepting a change to this CSV:
1. Parse the full CSV and assert a consistent header/row column count.
2. Run `scripts/p1/check_contract_consistency.py` against the canonical ERD and target DDL.
3. Run the clean-reset schema suite on a fresh isolated MySQL instance at the exact candidate SHA.
4. Review Entity/API/DTO/frontend mappings as separate gates; the CSV alone does not prove they match.

Never run the reset against an unidentified or persistent database. Numeric retention and anonymization exceptions remain TBD under DB-12.
