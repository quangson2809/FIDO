# Implementation decisions — 2026-09-26

## Explicitly approved by project owner

- Preserve Java 17, Spring Boot 4.0.3, Gradle and MySQL from the repository.
- Use Flyway to version the schema. Hibernate validates mappings; it does not create or update the schema.
- Login uses the account phone number. Login does not require phone verification.
- A role whose code is `admin` identifies the Administrator.
- Bootstrap an initial administrative account (called superadmin by the owner). This is an account assigned the `admin` role, not a new `SUPERADMIN` role or lifecycle.

## Implementation conventions

- UTC timestamps, stored as TIMESTAMP(6). Entity lifecycle callbacks assign UTC creation/update times. No actor or timestamp is taken from request data.
- Flyway V1 maps the DD-DB-01 v1.3.0 data dictionary without adding account login constraints. Authentication-specific decisions belong to a subsequent migration when Phase 2 is implemented.
- Foreign references are scalar IDs in JPA; SQL FKs enforce integrity. This avoids foreign entities crossing module service contracts. Composite junction keys use explicit ID classes.
- History repositories expose no delete method. Audit, inventory ledger and order-item snapshots are immutable Hibernate entities. Later services must still enforce workflow invariants.
- The existing Spring Boot `/error` renderer remains in use. Common advice preserves framework error statuses and suppresses technical exception details. No new error DTO or business error-code catalog is established.
- CI tests both H2 in MySQL mode and a MySQL 8.4 service. Production MySQL must support enforced CHECK constraints (8.0.16 or newer); CI's version does not upgrade a deployed database.
- Do not baseline an unknown populated database automatically. V1 is for an empty schema; existing production data would require a separate reviewed migration plan.

## Canonical inputs

- `docs/00` through `docs/14` and `reference/*.csv` are the supplied FIDO BE Java Codex Kit, now tracked with the repository.
- Schema authority: `07_Thiet_ke_du_lieu_CSDL_Website_Ban_Quan_Ao_v1.3.0_catalog_final.docx`, DD-DB-01 v1.3.0, section 5 pp. 15–27 and section 6 constraints. The original is available in the owner's Library.
- API authority: `DANH MỤC API TINH GỌN THEO CSDL .pdf`, current consolidated contract, available in the owner's Library.

## Still out of scope / unresolved

- Employee permission-code matrix, guest session identity/TTL/merge, voucher rules and size-guide detail remain TBD.
- No account status lifecycle, refresh token, notification, order timeline, after-sales case, unit cost, shipping tracking or system-settings table.
- Administrative bootstrap credentials must come from external configuration; never hardcode or seed a shared password in SQL.
