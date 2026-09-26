# Implementation decisions — 2026-09-26

## Explicitly approved by project owner

- Preserve Java 17, Spring Boot 4.0.3, Gradle and MySQL from the repository.
- Use Flyway to version the schema. Hibernate validates mappings; it does not create or update the schema.
- Login uses the account phone number. Login does not require phone verification.
- Owner update: `ADMIN` identifies employees; `SUPERADMIN` is the highest administrator. Lowercase `admin` is no longer privileged. Phone values must be unique.
- Bootstrap the initial account with role `SUPERADMIN`, from external credentials. The owner delegated JWT library selection: Spring Security Resource Server with Nimbus JOSE/JWT, versions managed by Boot.

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
- API detail source: `DANH MỤC API TINH GỌN THEO CSDL .pdf` is an available 73-endpoint snapshot. Use it only for unchanged DTO details. The kit and explicit owner instruction establish the 77-endpoint baseline; the older PDF does not override permission CRUD #66–69 or renumber the newer endpoints.

## Still out of scope / unresolved

- Employee permission-code matrix, guest session identity/TTL/merge, voucher rules and size-guide detail remain TBD.
- No account status lifecycle, refresh token, notification, order timeline, after-sales case, unit cost, shipping tracking or system-settings table.
- Administrative bootstrap credentials must come from external configuration; never hardcode or seed a shared password in SQL.

## Phase 2 implementation conventions

- Flyway V2 adds UNIQUE(phone) and seeds ADMIN/SUPERADMIN roles. It does not rewrite old role assignments or merge duplicate phones. Existing null phones remain for schema compatibility; register/staff-create require a phone. No country-code/format normalization policy is introduced.
- JWT: HS256 with a Base64 key of at least 32 random bytes, configured issuer (default fido), configurable TTL (default 900 seconds). Require numeric positive sub, iat, exp, valid signature/issuer/timestamps. Role/permission access is reloaded from DB, not trusted from token claims.
- System roles cannot be deleted; role codes are stable. A serialized RBAC write transaction protects the last SUPERADMIN assignment from removal. These safeguards preserve the owner-defined administrative boundary.
- Staff means current ADMIN or SUPERADMIN assignment. Staff create without role_ids assigns ADMIN. Explicit role_ids must include ADMIN or SUPERADMIN on creation. PATCH role_ids fully replaces assignments: removing both means the account no longer appears in staff views.
- Permission codes are data managed by SUPERADMIN; no employee operation-to-permission catalog is seeded. API #58–69 require SUPERADMIN. Future employee operations must use approved permission mappings.
- Mutations use one service transaction, including audit. RBAC writes serialize on the SUPERADMIN role row. Audit action strings identify commands, not new permission codes; no password/token/profile values are written into audit descriptions.
- HTTP validation=400, invalid/missing authentication=401, unauthorized=403, missing resource=404, uniqueness/reference conflict=409, using existing Boot error rendering. No custom error envelope.
- BCrypt's existing 72-byte input limit is enforced rather than silently truncating passwords; no extra password-complexity business policy is added.
- Unspecified routes deny access until implemented. Test-only HTTP fixture uses the public catalog prefix; it is absent from the production artifact.
- No refresh API, account lifecycle/status, guest identity, voucher rules or Phase 3 implementation.

## Run Phase 2

Set JWT_SECRET_BASE64 to a cryptographically random Base64 value containing at least 32 bytes; do not commit the value. Optional JWT_ISSUER and JWT_TTL_SECONDS override the technical defaults.
For the first startup, set SUPERADMIN_BOOTSTRAP_ENABLED=true, SUPERADMIN_PHONE and SUPERADMIN_PASSWORD. Disable bootstrap and remove its password from runtime configuration after successful initialization. The bootstrap is idempotent, does not reset an existing password, and refuses to promote an existing ordinary account with the same phone.

Sources: owner decisions in this session and current consolidated Google Doc 1WNaHu6g_-XINTVcUvGX9vSJnpSyLff-PebkkDk_9mMk, Appendix A.3.1 / A.4 APIs 1–7, 58–69 (read 2026-09-26). The 73-endpoint PDF is no longer needed for Phase 2 contract details.
