-- Minimal non-secret system seed for the clean target baseline.
-- Demo accounts, passwords, catalog and orders are deliberately excluded.

INSERT INTO roles (code, name, description, status) VALUES
 ('CUSTOMER', 'Khách hàng', 'Vai trò cơ bản của khách hàng', 'ACTIVE'),
 ('ADMIN', 'Nhân viên quản trị', 'Quyền theo phân công; không tự động có mọi quyền', 'ACTIVE'),
 ('SUPERADMIN', 'Quản trị cao nhất', 'Quản trị RBAC và vận hành hệ thống', 'ACTIVE');

INSERT INTO permissions (code, name, description) VALUES
 ('CATALOG_READ', 'Đọc danh mục sản phẩm', 'Đọc sản phẩm, danh mục và thương hiệu'),
 ('CATALOG_WRITE', 'Sửa danh mục sản phẩm', 'Tạo, cập nhật và ẩn dữ liệu catalog'),
 ('INVENTORY_READ', 'Đọc tồn kho', 'Đọc kho, tồn kho và phiếu nhập'),
 ('INVENTORY_WRITE', 'Sửa tồn kho', 'Điều chỉnh tồn kho và phiếu nhập kho'),
 ('ORDER_READ', 'Đọc đơn hàng', 'Đọc thông tin đơn hàng'),
 ('ORDER_EDIT', 'Sửa và xử lý đơn hàng', 'Thực hiện các chỉnh sửa và chuyển trạng thái Order được P1.7 cho phép'),
 ('ORDER_PAYMENT', 'Xử lý thanh toán', 'Ghi nhận trạng thái thanh toán COD'),
 ('ORDER_AFTER_SALES', 'Xử lý sau bán', 'Xử lý yêu cầu sau bán được hỗ trợ'),
 ('AUDIT_READ', 'Đọc audit log', 'Tra cứu nhật ký kiểm toán'),
 ('CONTENT_READ', 'Đọc nội dung', 'Đọc trang nội dung quản trị'),
 ('CONTENT_WRITE', 'Sửa nội dung', 'Tạo và cập nhật trang nội dung'),
 ('CUSTOMER_READ', 'Đọc khách hàng', 'Đọc dữ liệu khách hàng trong back-office'),
 ('REPORT_READ', 'Đọc báo cáo', 'Xem báo cáo và phân tích kinh doanh');

-- Superadmin has all current permissions. Admin gets no implicit business permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.code = 'SUPERADMIN';
