-- P1.2: public registration assigns the seeded CUSTOMER role server-side.
-- Idempotent so environments with a pre-existing role can migrate without duplicates.
INSERT INTO roles (code, name, description)
SELECT 'CUSTOMER', 'Khách hàng', 'Vai trò cơ bản của khách hàng'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'CUSTOMER');


-- The approved seed contract requires SUPERADMIN to receive every currently defined permission.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'SUPERADMIN'
  AND NOT EXISTS (
      SELECT 1
      FROM role_permissions rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
  );
