# 08 — Security, RBAC, Audit and Personal Data

## 1. Authentication and Account lifecycle

- Protected routes use Bearer JWT. The authenticated Account/actor ID is derived from the security principal, never trusted from the request body.
- Phone is the login identifier. Normalize Vietnamese input (`0` + 9 digits or `+84` + 9 digits; optional whitespace/`-()` separators) to canonical `+84` + 9 digits before lookup and uniqueness checks. Enforce uniqueness among active Accounts; reuse is allowed only after soft deletion. Do not impose email uniqueness absent an approved constraint.
- Account registration and staff-account creation begin at `ACTIVE`. Only `ACTIVE` Accounts receive tokens or use protected APIs. Wrong credentials return generic `401 INVALID_CREDENTIALS`; valid credentials for any non-ACTIVE Account receive the same `403 ACCOUNT_NOT_ACTIVE` without disclosing exact status. Protected requests re-check status; soft deletion remains separate through `deleted_at`.
- Store only a password hash. Never log or return password hashes, tokens, OTP values, secrets or raw Authorization headers.
- Public routes are limited to approved registration/login and public catalog/content reads. Persisted Cart operations and order placement require authentication. Guest Cart, guest checkout, phone-only order lookup and guest-Cart merging are out of target scope.
- Do not create a refresh-token, OTP or other authentication API unless it is included in the current approved API contract.

## 2. Authorization and RBAC

- Enforce permission checks in backend services, not only through UI visibility.
- The target uses ACCOUNTS, ROLES, PERMISSIONS, ACCOUNT_ROLES and ROLE_PERMISSIONS relationships.
- Required system roles/permissions are seeded through Flyway. SUPERADMIN bootstrap credentials come from external secret/configuration, never committed source or demo seed.
- Protect the last-SUPERADMIN invariant under concurrent role/account updates: at least one non-soft-deleted ACTIVE Account must retain the ACTIVE `SUPERADMIN` Role. The `SUPERADMIN` Role cannot be deactivated or stripped of Permission grants; its grant set equals the full Permission catalogue. Creating a Permission adds its grant to SUPERADMIN atomically. Privileged changes and audit share one transaction. For other Roles, `PATCH /admin/roles/{roleId}` uses full replacement: omitted `permission_ids` retains, `[]` clears, non-empty replaces; duplicate/missing IDs are rejected. Role/Permission codes are immutable.
- SUPERADMIN is the highest technical administrator. Do not silently grant business capabilities to ADMIN or employee roles; role grants must follow approved configuration.
- Catalog capabilities include CATALOG_READ and CATALOG_WRITE. Define permissions in the target role/permission model and test each protected route; a permission code is not itself a grant.

## 3. Account and data ownership

- Every /me resource is scoped to the authenticated Account. Reject cross-account reads and writes.
- Account addresses are mutable Account-owned records. Placed `ORDER_ADDRESSES` are immutable snapshots and must not change when an Account address is edited. If an Account has saved addresses, exactly one must be default; the first address defaults automatically and switching/deleting/unsetting the current default atomically promotes the most recently updated remaining address, tie-break descending ID. This cross-row invariant is enforced in the service transaction; the non-unique index is not sufficient.
- Staff/customer administration uses actual Accounts and linked Orders; do not create synthetic guest identities.
- Do not hard-delete Accounts, placed Orders, COD Payment facts, inventory ledger rows or audit history through ordinary CRUD operations. Apply the approved FK defaults: RESTRICT for business/history references; CASCADE only for explicitly disposable dependent data.

## 4. Audit

The normative audit schema, actor/correlation policy, allowlisted before/after payloads, redaction rules, minimum required events, transaction boundary and admin audit-read behavior are owned by [P1.8 Operations, Audit, Content/Report and Seed Contract](refactor-v2/p1/P1.8-operations-seed-contract.md).

At minimum, audit successful privileged and transactional mutations including role/permission changes, Product/catalog/image changes, stock adjustments/receipt confirmation, Order transitions, COD collection/refund and eligible returns. Each domain owns its exact business event vocabulary. Derive human actor identity from the authenticated principal; NULL actor is allowed only for a trusted system event. When audit is required, the audit insert commits with the business write set or the whole command rolls back. Redact secrets and minimize PII before persistence and before audit-log DTO serialization.

## 5. Personal data, retention and transport

- Collect only necessary phone/email/address/profile information.
- Order recipient and other approved order-time snapshots remain stable for transaction/history needs.
- Numeric retention periods for audit, images and personal/business data, and legal anonymization/deletion exceptions, remain TBD under DB-12. Do not run scheduled purging until approved.
- Use HTTPS in deployed environments, least-privilege database access and safe typed errors. Never return SQL details, stack traces or secrets.

## 6. Acceptance requirements

Test generic credential failures; `ACTIVE` versus non-ACTIVE login/session behavior; canonical phone uniqueness and reuse after soft delete; JWT expiry/invalidity; `/me` ownership; permission isolation; full-replacement grant semantics; last-SUPERADMIN concurrent changes; atomic address default switching/deletion; audit atomicity/failure rollback, actor provenance, correlation propagation and secret/PII redaction. Content/report and audit operation acceptance is defined in [P1.8](refactor-v2/p1/P1.8-operations-seed-contract.md); runtime acceptance remains pending until code/tests exercise it.
