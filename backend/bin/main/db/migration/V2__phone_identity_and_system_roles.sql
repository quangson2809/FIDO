-- Owner decisions: phone is unique; ADMIN=employee; SUPERADMIN=highest privilege.
-- Existing duplicate phones stop this migration; never merge accounts automatically.
ALTER TABLE accounts ADD CONSTRAINT uq_accounts_phone UNIQUE (phone);
INSERT INTO roles (code, name, description) VALUES ('ADMIN', 'Nhân viên', 'Chỉ thao tác theo quyền được cấp');
INSERT INTO roles (code, name, description) VALUES ('SUPERADMIN', 'Quản trị cao nhất', 'Toàn quyền quản trị');
