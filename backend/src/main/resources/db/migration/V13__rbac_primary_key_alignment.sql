-- Align RBAC parent primary keys with the approved Account/RBAC target schema.
-- Child relation columns remain account_roles.role_id and role_permissions.role_id/permission_id;
-- the database updates their referenced-column metadata with these renames.
ALTER TABLE roles RENAME COLUMN role_id TO id;
ALTER TABLE permissions RENAME COLUMN permission_id TO id;
