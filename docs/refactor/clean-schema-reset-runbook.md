# Clean Schema Reset — target baseline

> **Owner approval recorded (2026-10-23):** Clean Schema Reset is approved for a verified disposable local/development/test database. Discard all existing disposable development/test rows and recreate/seed from the approved 31-table ERD v2; do not migrate legacy test records. This is not an instruction to reset an unspecified database and does not authorize any production, staging, shared-integration or real/persistent data deletion. No reset was executed by recording this decision. P1 remains PARTIAL pending runtime mapping and acceptance evidence; numeric retention periods remain TBD under DB-12. Money is integer VND/BIGINT per DB-10.

## Scope

This directory holds the owner-confirmed 31-table target schema in a separate Flyway location while the application entity/API rewrite is in progress. It is intentionally not the default application migration location yet: activating it before JPA mappings and service contracts are aligned would make the current application fail schema validation.

- Logical authority: `docs/refactor/phase-1-erd-v2-approved.mmd`
- Target DDL: `backend/src/main/resources/db/clean-reset/V1__clean_schema.sql`
- Required non-secret RBAC seed: `backend/src/main/resources/db/clean-reset/V2__system_seed.sql`
- Development/test records: `backend/src/test/resources/clean-reset/dev-seed.sql`
- Verification: `com.fido.persistence.CleanResetSchemaTests`

## Working implementation defaults

1. Phone is the unique login identifier; email is nullable and non-unique.
2. New persisted carts/orders require an authenticated account.
3. Products use a shared parent/child table; Size and Color are option-backed, variant-defining attributes. Prevent self-parent/cycles in service validation: MySQL 8.4 rejects CHECK constraints that reference an AUTO_INCREMENT id.
4. Voucher behavior is limited to target fields; persisted checkout quote and voucher-scope join tables are not used.
5. Currency is VND. Order `discount_amount` represents all order discounts (including line discounts); total is `subtotal - discount_amount + shipping_fee`. A line's `line_total` equals `unit_price * quantity - line discount_amount`.
6. The initial payment method is COD; one payment aggregate per order.
7. Order address is an immutable snapshot copied at placement.
8. New order and inventory writes require unique idempotency keys; same key/same payload replays, same key/conflicting payload returns conflict.
9. BIGINT IDs, integer-VND/BIGINT monetary columns per DB-10 (DECIMAL is non-money only), TIMESTAMP(6) UTC. DB-12 approved RESTRICT as the default for business/history rows, with CASCADE limited to approved disposable dependent working data. Numeric retention durations/anonymization exceptions remain TBD; do not schedule purges until they are approved.
10. Required roles/permissions are Flyway-seeded; bootstrap SUPERADMIN is configured by an external secret/configuration path; demo data is a separate non-migration development/test fixture with no committed account credentials. The reset does not preserve old fixture rows; load the approved fixture again after creating the clean target baseline.

These defaults are owner-approved target behavior and do not expand the 31-table model. Implementation must still prove them through schema/application tests. Any business change must be recorded as an explicit contract/ERD amendment before implementation.

## Run the schema tests

From `backend/`:

```bash
./gradlew test --tests com.fido.persistence.CleanResetSchemaTests
```

**Default behavior:** with `CLEAN_RESET_TEST_DB_URL` unset, tests use unique in-memory H2 databases in MySQL compatibility mode and execute only `db/clean-reset`.

**MySQL integration behavior:** if `CLEAN_RESET_TEST_DB_URL` is set, the test switches to that MySQL URL and reads `CLEAN_RESET_TEST_DB_DRIVER`, `CLEAN_RESET_TEST_DB_USERNAME` and `CLEAN_RESET_TEST_DB_PASSWORD`. The test code restricts the URL host to `127.0.0.1` or `localhost`, but it calls `flyway.clean()` during cleanup and therefore can drop objects in the selected database. Use only an empty, dedicated, disposable test database; never point these variables at shared or production data. The GitHub Actions target-schema workflow supplies a disposable MySQL service through these test-specific variables.

## Demo fixture safety

Load the demo fixture only after the target baseline and target application mappings are ready, and only in a disposable local/development/test database. It creates catalog, options, warehouse, inventory and a voucher; it does not create demo accounts or credentials.

Before running a database command, verify host and database name. This decision does not authorize reset/drop operations against production/shared/staging.
