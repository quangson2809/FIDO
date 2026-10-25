-- P1.2: public registration assigns the seeded CUSTOMER role server-side.
-- Idempotent so environments with a pre-existing role can migrate without duplicates.
INSERT INTO roles (code, name, description)
SELECT 'CUSTOMER', 'Khách hàng', 'Vai trò cơ bản của khách hàng'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'CUSTOMER');
