# Clean Schema Reset — target baseline

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
9. BIGINT IDs, DECIMAL(18,2), TIMESTAMP(6) UTC, restrictive foreign-key actions by default.
10. Required roles/permissions are Flyway-seeded; demo data is a separate non-migration fixture.

These are implementation defaults selected to make progress and still require review during implementation. They do not expand the 31-table model. Any business change should update the contract and tests before activating the target migration.

## Run the schema tests

From `backend/`:

```bash
./gradlew test --tests com.fido.persistence.CleanResetSchemaTests
```

Tests use unique in-memory H2 databases in MySQL compatibility mode and execute only `db/clean-reset`; they do not read runtime database environment variables or connect to an external DB.

## Demo fixture safety

Load the demo fixture only after the target baseline and target application mappings are ready, and only in a disposable local/development/test database. It creates catalog, options, warehouse, inventory and a voucher; it does not create demo accounts or credentials.

Before running a database command, verify host and database name. This decision does not authorize reset/drop operations against production/shared/staging.
