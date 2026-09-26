# 08 — Security, RBAC, Audit & Personal Data

## 1. Authentication

- Store only `password_hash`; never log or return it.
- Authenticated endpoints use Bearer JWT.
- Minimum claims: `sub=account_id`, `iat`, `exp`.
- Actor fields for commands come from authenticated context, never request body.
- Login identifier (phone/email/both), uniqueness and verification rules remain physical-design TBD.
- No refresh-token API is baseline.

## 2. Authorization

- Authorization is enforced in backend, not only through UI visibility.
- Business requirement: Administrator has highest privilege; Employee can perform only granted operations.
- Detailed employee permission matrix and technical permission-code catalog are not fully locked in Analyst sources.
- Do not invent permission codes or hard-code a role code such as `ADMIN` unless the existing repo/seed configuration has already locked it.
- Role/Permission mappings live in `account` module.

## 3. RBAC administration

Current API supports:

- staff account list/detail/create/update role set;
- read access-control view;
- create/update/delete Role;
- read/create/update/delete Permission.

Rules:

- account role update uses a full `role_ids` replacement when provided;
- role permission update uses full `permission_ids` replacement when provided;
- Role delete only when no Account references it;
- Permission delete only when no Role references it;
- schema has no account enabled/status lifecycle; do not implement disable endpoint.

## 4. Audit

Audit important operations including at least the Analyst-required categories:

- role/permission changes;
- product/price/catalog changes;
- inventory adjustments and receipt confirmation;
- Order state transitions;
- COD collection/refund;
- return/exchange outcomes.

Audit minimum data: actor, timestamp, action, target type/id, safe description.

Never include clear password, token, secret or unnecessary sensitive PII in AuditLog.

## 5. PII

Collect only necessary phone/email/address/profile data. Order receiver snapshots are preserved for transaction/history requirements. Retention/deletion periods are not numerically locked and must be decided before go-live rather than invented in code.

Sensitive traffic requires HTTPS in deployment. DB credentials/privileges must follow least privilege.

## 6. Guest lookup warning

Guest order lookup is a business requirement, but authentication mechanism (token/OTP/secret), TTL, rate limit and verification channel are explicitly TBD. Do not release a final endpoint that authorizes solely by easily guessed public data unless that mechanism becomes approved.

## 7. Security testing

- authentication/authorization negative tests for admin/me routes;
- ownership tests for `/me/addresses` and `/me/orders`;
- input validation and safe error tests;
- secret/PII logging checks;
- web security baseline aligned with the project's adopted OWASP ASVS testing scope.
