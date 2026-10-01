package com.fido.config.devseed;

import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Profile({"dev", "test"})
public class DevSeedIdentityData {

    private final JdbcTemplate jdbc;

    public DevSeedIdentityData(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void seed(String passwordHash) {
        seedPermissions();
        seedRoles();
        seedRolePermissions();
        seedAccounts(passwordHash);
        seedAddresses();
        seedAccountRoles();
    }

    private void seedPermissions() {
        jdbc.update("""
                INSERT INTO permissions(permission_id, code, name) VALUES
                (900201,'CATALOG_READ','Đọc catalog quản trị'),
                (900202,'CATALOG_WRITE','Ghi catalog quản trị'),
                (900203,'INVENTORY_READ','Đọc tồn kho và phiếu nhập'),
                (900204,'INVENTORY_WRITE','Ghi tồn kho và phiếu nhập'),
                (900205,'ORDER_READ','Đọc đơn hàng quản trị'),
                (900206,'ORDER_EDIT','Cập nhật thông tin đơn'),
                (900207,'ORDER_PROCESS','Xác nhận và chuẩn bị đơn'),
                (900208,'ORDER_FULFILLMENT','Xuất/giao/hoàn tất đơn'),
                (900209,'ORDER_EXCEPTION','Hủy/giao thất bại/hàng giao quay lại'),
                (900210,'ORDER_PAYMENT','Thu COD và hoàn tiền'),
                (900211,'ORDER_AFTER_SALES','Xử lý sau bán'),
                (900212,'AUDIT_READ','Đọc audit log'),
                (900213,'CONTENT_READ','Đọc nội dung quản trị'),
                (900214,'CONTENT_WRITE','Ghi nội dung quản trị'),
                (900215,'CUSTOMER_READ','Đọc khách hàng back-office')
                """);
    }

    private void seedRoles() {
        jdbc.update("""
                INSERT INTO roles(role_id, code, name, description) VALUES
                (900101,'FIDO_SEED_CATALOG','Seed Catalog Staff',
                    'Role kỹ thuật phục vụ Postman - Catalog'),
                (900102,'FIDO_SEED_INVENTORY','Seed Inventory Staff',
                    'Role kỹ thuật phục vụ Postman - Inventory'),
                (900103,'FIDO_SEED_ORDER','Seed Order Staff',
                    'Role kỹ thuật phục vụ Postman - Order/COD/After-sales'),
                (900104,'FIDO_SEED_OPS','Seed Ops Staff',
                    'Role kỹ thuật phục vụ Postman - Audit/Content/Customer')
                """);
    }

    private void seedRolePermissions() {
        jdbc.update("""
                INSERT INTO role_permissions(role_id, permission_id) VALUES
                (900101,900201),(900101,900202),
                (900102,900203),(900102,900204),
                (900103,900205),(900103,900206),(900103,900207),
                (900103,900208),(900103,900209),(900103,900210),(900103,900211),
                (900104,900212),(900104,900213),(900104,900214),(900104,900215)
                """);
    }

    private void seedAccounts(String passwordHash) {
        jdbc.update("""
                INSERT INTO accounts(
                    account_id,password_hash,phone,email,created_at,updated_at
                ) VALUES
                (900001,?,'0909000001','superadmin@fido.local',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900002,?,'0909000002','customer@fido.local',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900003,?,'0909000003','catalog@fido.local',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900004,?,'0909000004','inventory@fido.local',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900005,?,'0909000005','order@fido.local',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900006,?,'0909000006','ops@fido.local',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900007,?,'0909000007','admin.noperm@fido.local',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900008,?,'0909000008','customer2@fido.local',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00')
                """,
                passwordHash,
                passwordHash,
                passwordHash,
                passwordHash,
                passwordHash,
                passwordHash,
                passwordHash,
                passwordHash
        );
    }

    private void seedAddresses() {
        jdbc.update("""
                INSERT INTO addresses(
                    address_id,account_id,address_text,created_at
                ) VALUES
                (910001,900002,'123 Cầu Giấy, Hà Nội','2026-09-01 00:00:00'),
                (910002,900002,'45 Xuân Thủy, Cầu Giấy, Hà Nội','2026-09-01 00:00:00'),
                (910003,900008,'88 Hồ Tùng Mậu, Hà Nội','2026-09-01 00:00:00')
                """);
    }

    private void seedAccountRoles() {
        assignSystemRole(900001L, "SUPERADMIN");

        assignSystemRole(900003L, "ADMIN");
        assignSeedRole(900003L, 900101L);

        assignSystemRole(900004L, "ADMIN");
        assignSeedRole(900004L, 900102L);

        assignSystemRole(900005L, "ADMIN");
        assignSeedRole(900005L, 900103L);

        assignSystemRole(900006L, "ADMIN");
        assignSeedRole(900006L, 900104L);

        assignSystemRole(900007L, "ADMIN");
    }

    private void assignSystemRole(
            long accountId,
            String roleCode
    ) {
        int inserted = jdbc.update("""
                INSERT INTO account_roles(account_id,role_id)
                SELECT ?, role_id
                FROM roles
                WHERE code=?
                """, accountId, roleCode);

        if (inserted != 1) {
            throw new IllegalStateException(
                    "Required system role is missing: " + roleCode
            );
        }
    }

    private void assignSeedRole(
            long accountId,
            long roleId
    ) {
        jdbc.update(
                "INSERT INTO account_roles(account_id,role_id) VALUES (?,?)",
                accountId,
                roleId
        );
    }
}
