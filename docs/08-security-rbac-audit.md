# 08 — Security, RBAC, Audit and Personal Data

## 1. Authentication and Account lifecycle

- Protected routes use Bearer JWT. The authenticated Account/actor ID is derived from the security principal, never trusted from the request body.
- Phone is the login identifier. Enforce uniqueness among active Accounts; the phone may be reused after soft deletion through the approved active-phone key/index. Do not impose email uniqueness absent an approved constraint.
- Account statuses are ACTIVE, PENDING_APPROVAL, LOCKED and SUSPENDED. Soft deletion is represented separately by the approved lifecycle field.
- Store only a password hash. Never log or return password hashes, tokens, OTP values, secrets or raw Authorization headers.
- Public routes are limited to approved registration/login and public catalog/content reads. Persisted Cart operations and order placement require authentication. Guest Cart, guest checkout, phone-only order lookup and guest-Cart merging are out of target scope.
- Do not create a refresh-token, OTP or other authentication API unless it is included in the current approved API contract.

## 2. Authorization and RBAC

- Enforce permission checks in backend services, not only through UI visibility.
- The target uses ACCOUNTS, ROLES, PERMISSIONS, ACCOUNT_ROLES and ROLE_PERMISSIONS relationships.
- Required system roles/permissions are seeded through Flyway. SUPERADMIN bootstrap credentials come from external secret/configuration, never committed source or demo seed.
- Protect the last-SUPERADMIN invariant under concurrent role updates. Privileged role/permission changes are audited in the same transaction as the owning mutation.
- SUPERADMIN is the highest technical administrator. Do not silently grant business capabilities to ADMIN or employee roles; role grants must follow approved configuration.
- Catalog capabilities include CATALOG_READ and CATALOG_WRITE. Define permissions in the target role/permission model and test each protected route; a permission code is not itself a grant.

## 3. Account and data ownership

- Every /me resource is scoped to the authenticated Account. Reject cross-account reads and writes.
- Account addresses are mutable Account-owned records. Placed ORDER_ADDRESSES are immutable snapshots and must not change when an Account address is edited.
- Staff/customer administration uses actual Accounts and linked Orders; do not create synthetic guest identities.
- Do not hard-delete Accounts, placed Orders, COD Payment facts, inventory ledger rows or audit history through ordinary CRUD operations. Apply the approved FK defaults: RESTRICT for business/history references; CASCADE only for explicitly disposable dependent data.

## 4. Audit

Audit important privileged and transactional operations, including role/permission changes, Product/catalog changes, stock adjustments/receipt confirmation, Order transitions, COD collection/refund and eligible returns.

The target audit record captures actor, action, entity identity, before/after data and correlation information as approved by the data dictionary. Redact password/hash, tokens, OTP, cookies/session IDs, secrets, raw Authorization headers and unnecessary PII.

## 5. Personal data, retention and transport

- Collect only necessary phone/email/address/profile information.
- Order recipient and other approved order-time snapshots remain stable for transaction/history needs.
- Numeric retention periods for audit, images and personal/business data, and legal anonymization/deletion exceptions, remain TBD under DB-12. Do not run scheduled purging until approved.
- Use HTTPS in deployed environments, least-privilege database access and safe typed errors. Never return SQL details, stack traces or secrets.

## 6. Acceptance requirements

Test generic credential failures, each Account lifecycle status, active-phone uniqueness and reuse after soft delete, JWT expiry/invalidity, /me ownership, permission isolation, last-SUPERADMIN concurrent changes, audit atomicity and sensitive-data redaction. A schema-only or documentation check does not prove these runtime guarantees.
