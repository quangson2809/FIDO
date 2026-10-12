# 08 — Security, RBAC, Audit & Personal Data

## 1. Authentication

- Store only `password_hash`; never log or return it.
- Authenticated endpoints use Bearer JWT.
- Minimum claims: `sub=account_id`, `iat`, `exp`.
- Actor fields for commands come from authenticated context, never request body.
- Repository decision: phone is the current login identifier.
- No refresh-token API is baseline.

## 2. Authorization

- Authorization is enforced in backend, not only through UI visibility.
- Business requirement: highest administrator has highest privilege; employees can perform only granted operations.
- Repository decision: `SUPERADMIN` is the highest technical administrator; `ADMIN` identifies employees but does not automatically inherit business capabilities.
- The detailed employee role/group -> capability matrix remains business TBD.
- Technical capability identifiers needed to encode already-required endpoint authorization may be defined in `docs/15-technical-decisions.md`; defining a code is not the same as granting it to a role.
- Role/Permission mappings live in the `account` module.

## 3. RBAC administration

Current API supports staff account list/detail/create/update role set, access-control view, Role CRUD and Permission CRUD.

Rules:
- account role update uses full `role_ids` replacement when provided; staff updates must retain ADMIN or SUPERADMIN, and cannot remove the last SUPERADMIN;
- role permission update uses full `permission_ids` replacement when provided;
- Role delete only when no Account references it;
- Permission delete only when no Role references it;
- schema has no account enabled/status lifecycle; do not implement disable endpoint.

## 4. Catalog capabilities

Phase 3 technical identifiers:
- `CATALOG_READ`: admin Catalog read APIs #27, #28, #33;
- `CATALOG_WRITE`: Catalog mutation APIs #29–32 and #34–45.

`SUPERADMIN` may perform both. Do not automatically assign either permission to `ADMIN` or any employee role.

## 5. Audit

Audit important operations including role/permission changes, product/price/catalog changes, inventory adjustments/receipt confirmation, Order transitions, COD/refund and return/exchange outcomes.

Audit minimum: actor, timestamp, action, target type/id, safe description. Never log clear password, token, secret or unnecessary PII.

## 6. PII

Collect only necessary phone/email/address/profile data. Order receiver snapshots are preserved for transaction/history requirements. Retention/deletion periods are not numerically locked.

Sensitive traffic requires HTTPS in deployment. DB access follows least privilege.

## 7. Guest lookup warning

Guest order lookup is required, but token/OTP/secret, TTL, rate limit, masking and verification channel remain TBD. Do not release a final phone-only authorization mechanism.

## 8. Security testing

- negative authentication/authorization tests;
- ownership tests for `/me/**`;
- input validation and safe errors;
- secret/PII logging checks;
- capability revocation/reload tests;
- OWASP ASVS-aligned checks within project scope.
