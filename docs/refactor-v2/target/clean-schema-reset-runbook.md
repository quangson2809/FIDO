# FIDO — Single Canonical Database Baseline

## Authority

The only database-installation SQL is `backend/src/main/resources/db/migration/V1__fido_target_schema.sql`. It creates exactly the 31 tables in the approved ERD v2, including all primary keys, foreign keys, composite relationships, unique constraints, checks and indexes, and seeds the approved three system roles, thirteen permissions and SUPERADMIN grants.

The logical model is [approved ERD v2](erd-v2-approved.mmd); the physical columns, types, nullability and key/index evidence are defined in the [P1 Data Dictionary](../p1/P1-data-dictionary.csv). Business and seed rules remain governed by the approved P1 contracts and decision log.

## Fresh installation

1. Use MySQL 8.0.16+.
2. Create a **new, empty** database using `utf8mb4` and `utf8mb4_0900_ai_ci`.
3. Configure the application/Flyway to connect to that database. Flyway applies the single V1 baseline.
4. Run `python scripts/p1/check_contract_consistency.py` and the database-baseline verification workflow against the exact commit.
5. Verify the table count is 31 and the roles/permissions/role-permission seed matches the approved manifest.
6. Configure the initial SUPERADMIN account through deployment secrets/bootstrap separately; the SQL file deliberately contains no user credentials.

## Versioning rule — no per-phase SQL

This repository is using a **single pre-release baseline**, not a forward-migration chain. Do not add `V2__...`, `V3__...` or another SQL file for a feature phase. If an ERD/schema change is approved before release, update the same baseline and Data Dictionary, then rebuild and verify a fresh disposable database. Each feature phase should implement its Java/API behavior against that baseline and the relevant feature contract.

This baseline is for a fresh, empty database only. It is not an upgrade script and must not be applied to a populated database. Existing databases created from the removed V1–V14 migration chain require an explicitly approved migration/rollout plan; do not delete, reset or overwrite production, staging, shared integration or persistent business data.

## Acceptance boundary

A passing schema checker and fresh-MySQL test prove the baseline's structural/seed consistency only. They do not establish that every JPA entity, repository, service, API contract, authorization rule or concurrency behavior already passes. Those remain implementation and acceptance gates for P3.1 and later phases.
