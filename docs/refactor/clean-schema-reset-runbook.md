# Clean Schema Reset — Target Baseline Runbook

> **Authorization boundary:** The owner approved a clean reset only for a verified disposable local/development/test database. Discard disposable test data and create/reseed from the approved 31-table ERD v2. This does not authorize resetting production, staging, shared integration or any database with persistent business data. No database reset was performed by this documentation change.

## 1. Target authority

- Logical schema: [owner-approved ERD v2](phase-1-erd-v2-approved.mmd).
- Physical schema: [canonical P1 data dictionary](../refactor-v2/p1/P1-data-dictionary.csv).
- Required system seed: `backend/src/main/resources/db/clean-reset/V2__system_seed.sql`.
- Approved rules: [P1 owner approval](../refactor-v2/p1/P1-owner-approval-2026-10-23.md), [decision log](../refactor-v2/p1/P1-decision-log.md), [P1.8 seed/audit/deletion contract](../refactor-v2/p1/P1.8-operations-seed-contract.md) and [P1.8 operator requirements](../refactor-v2/p1/P1.8-operations-seed-runbook.md).

The clean-reset Flyway location is isolated from the active default migration path until application mappings and acceptance gates are ready. Do not activate it merely to make a schema reset happen.

## 2. Preflight — mandatory

Before any destructive action:

1. Identify the exact host, port, database name and active application profile.
2. Verify that the target is a disposable local/development/test database and contains no persistent, shared or real business data.
3. Confirm the candidate commit and that the target DDL/system seed passed the required exact-SHA static checker and fresh MySQL tests.
4. Review the actual reset command and database credentials; do not derive a reset target from an unspecified environment variable.
5. Stop if the database identity or disposability cannot be proven. Never attempt an exploratory reset against an unknown database.

## 3. Target model invariants

- The target contains exactly the 31 logical tables in the canonical ERD.
- Parent/child Products share `PRODUCTS`, with one parent-child level. Children are explicit Product records; each owns its Product ID, SKU, required integer-VND selling price and stock. No implicit NULL inheritance exists.
- Attributes `OPTION`, `TEXT`, `NUMBER` and `BOOLEAN` are descriptive only. They do not generate child Products. Every option belongs to its owning Attribute.
- Cart, order lines, receiving lines and inventory balances/transactions refer to `product_id`, never a variant identifier.
- Stock is keyed by `(warehouse_id, product_id)`. The v1 server resolves one operational warehouse. Stock ledger changes are append-only and atomic with source state/balance/audit.
- Quote is stateless/advisory. No persisted quote ID, stock reservation or voucher side effect is part of the target.
- Money is integer VND. Order placement re-prices current data and uses authenticated account-scoped idempotency.
- One COD Payment aggregate per Order and manual shipping. Preserve placed-order snapshots, payment facts, stock ledger and audit according to the approved lifecycle/FK rules.

## 4. Schema and seed sequence

1. Validate the canonical ERD, target SQL, dictionary and consistency checker agree on the same table/column/key set.
2. Apply the target baseline to a newly created empty isolated MySQL database, not to a database whose history or contents are unknown.
3. Apply required system roles/permissions through the approved migration seed and compare it with the exact P1.8 manifest. Resolve IDs by immutable codes; the seed must contain no Accounts or credentials. External-secret SUPERADMIN bootstrap is a separate provisioning step, not V2 SQL.
4. Load demo fixtures only through an explicit development/test mechanism after target mappings are ready. Demo seed must not contain secrets or reusable plaintext passwords. Verify SUPERADMIN grants all current permissions; do not implicitly grant business permissions to ADMIN or CUSTOMER.
5. Start the application only after JPA/entity mappings are aligned to the target schema; validate startup and module-level behavior.
6. Verify the installed table set, keys, foreign keys, checks, defaults, indexes and seed contents. Run API, security, transaction, concurrency and frontend acceptance tests on the exact candidate SHA.

Do not preserve, migrate or crosswalk disposable legacy test records solely for the reset.

## 5. Verification and status

The reset is not complete until a fresh install and its schema/seed checks are evidenced. Runtime acceptance remains separate: Entity/Repository/Service/API/DTO/frontend, auth/RBAC, Product attributes, Cart/order, integer-VND math, inventory/ledger, voucher quota, Payment/shipping and snapshot behavior must be verified.

**Retention caveat:** numeric audit/image/personal/business-data retention periods and anonymization exceptions remain TBD. Do not schedule a purge of audit/history/content data or image assets until those decisions are approved. The current clean-reset DDL does not explicitly encode CartItems CASCADE; follow P1.8/P1.9 and delete dependent working rows explicitly until the FK policy is reconciled.

**Current state:** the clean-reset DDL and system seed remain isolated; this runbook is not an execution log. No database was reset by this documentation work.
