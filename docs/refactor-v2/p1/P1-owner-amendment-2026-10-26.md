# P1 Owner Amendment — 2026-10-26: Unique Constraints and Order Numbers

**Status:** Implemented as the current target decision in the canonical ERD, Data Dictionary, single SQL baseline, implementation checks and focused tests. This amendment supersedes only the specific physical constraints and Order-number format described below; other approved invariants remain unchanged.

## 1. Account phone uniqueness

- Use the direct database constraint `UNIQUE(phone)`; remove the generated `phone_active_key` column and `uq_accounts_phone_active`.
- Phone remains unique across all retained Account rows, including soft-deleted rows. Soft deletion does not make a phone number reusable while the old row remains.
- Registration and staff-account create/update validation checks canonical phone variants across all rows. Login and protected-account resolution continue to exclude soft-deleted Accounts.
- Email remains optional and non-unique.

## 2. Product image ordering

- Replace database `UNIQUE(product_id, sort_order)` with ordinary index `ix_product_images_product_order(product_id, sort_order)`.
- Keep the business invariant: a non-empty gallery has one primary image at position zero, and positions are unique and contiguous from zero.
- The Product service must enforce the invariant within a transaction and serialize mutations per Product. A raw database insert is no longer rejected solely because two rows share a position; service/API tests must prove invalid gallery mutations are rejected and valid reorder/remove/upload operations preserve the invariant.

## 3. Order number generation

- Keep `orders.id` as the internal auto-generated primary key and `order_number` as a database-unique business identifier.
- Insert the Order with a temporary unique placeholder, obtain the database-generated ID, then replace the placeholder in the same transaction with `<account_id>-<UTC yyyyMMddHHmmss>-<order_id>`.
- The internal Order ID differentiates multiple Orders by the same Account created during the same second. The maximum formatted length for signed BIGINT Account and Order IDs is 54 characters, so the target column is `VARCHAR(64)`.
- The temporary value is internal only. If the final update or any later Order-placement step fails, the transaction rolls back; the caller receives only the final number after successful commit.
- Keep `UNIQUE(order_number)` and the separate Order idempotency constraint. Order-number uniqueness and create-request idempotency serve different purposes.

## 4. Updated canonical artifacts

- `docs/refactor-v2/target/erd-v2-approved.mmd`
- `docs/refactor-v2/p1/P1-data-dictionary.csv`
- `docs/refactor-v2/p1/P1-schema-constraints.md`
- `docs/refactor-v2/p1/P1-domain-invariants.md`
- `docs/refactor-v2/p1/P1.3-catalog-metadata-contract.md`
- `docs/15-technical-decisions.md`
- `backend/src/main/resources/db/migration/V1__fido_target_schema.sql`
- Corresponding repository/service mappings and tests

This is a fresh-install target-baseline change. It does not authorize resetting, altering or migrating any persistent/shared database. Runtime and clean-MySQL checks must be assessed on the exact resulting commit.
