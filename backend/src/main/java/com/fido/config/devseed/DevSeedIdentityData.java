package com.fido.config.devseed;

import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Profile({"dev", "test"})
public class DevSeedIdentityData {

    private static final List<ReservedNaturalKey> RESERVED_NATURAL_KEYS =
            List.of(
                    reserved("accounts", "id", 900001L, "phone", "0909000001"),
                    reserved("accounts", "id", 900002L, "phone", "0909000002"),
                    reserved("accounts", "id", 900003L, "phone", "0909000003"),
                    reserved("accounts", "id", 900004L, "phone", "0909000004"),
                    reserved("accounts", "id", 900005L, "phone", "0909000005"),
                    reserved("accounts", "id", 900006L, "phone", "0909000006"),
                    reserved("accounts", "id", 900007L, "phone", "0909000007"),
                    reserved("accounts", "id", 900008L, "phone", "0909000008"),
                    reserved("roles", "id", 900101L, "code", "FIDO_SEED_CATALOG"),
                    reserved("roles", "id", 900102L, "code", "FIDO_SEED_INVENTORY"),
                    reserved("roles", "id", 900103L, "code", "FIDO_SEED_ORDER"),
                    reserved("roles", "id", 900104L, "code", "FIDO_SEED_OPS"),
                    reserved("permissions", "id", 900201L, "code", "CATALOG_READ"),
                    reserved("permissions", "id", 900202L, "code", "CATALOG_WRITE"),
                    reserved("permissions", "id", 900203L, "code", "INVENTORY_READ"),
                    reserved("permissions", "id", 900204L, "code", "INVENTORY_WRITE"),
                    reserved("permissions", "id", 900205L, "code", "ORDER_READ"),
                    reserved("permissions", "id", 900206L, "code", "ORDER_EDIT"),
                    reserved("permissions", "id", 900210L, "code", "ORDER_PAYMENT"),
                    reserved("permissions", "id", 900211L, "code", "ORDER_AFTER_SALES"),
                    reserved("permissions", "id", 900212L, "code", "AUDIT_READ"),
                    reserved("permissions", "id", 900213L, "code", "CONTENT_READ"),
                    reserved("permissions", "id", 900214L, "code", "CONTENT_WRITE"),
                    reserved("permissions", "id", 900215L, "code", "CUSTOMER_READ"));

    private final JdbcTemplate jdbc;

    public DevSeedIdentityData(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void seed(String passwordHash) {
        assertReservedNaturalKeysAvailable();
        seedPermissions();
        seedRoles();
        seedRolePermissions();
        seedAccounts(passwordHash);
        seedAddresses();
        seedAccountRoles();
    }

    private void assertReservedNaturalKeysAvailable() {
        for (ReservedNaturalKey key : RESERVED_NATURAL_KEYS) {
            List<Long> existingIds =
                    jdbc.queryForList(
                            "SELECT "
                                    + key.idColumn()
                                    + " FROM "
                                    + key.table()
                                    + " WHERE "
                                    + key.keyColumn()
                                    + "=?",
                            Long.class,
                            key.keyValue());

            if (existingIds.isEmpty()) {
                continue;
            }

            Long actualId = existingIds.get(0);
            if (!Long.valueOf(key.expectedId()).equals(actualId)) {
                throw new IllegalStateException(
                        "Development seed conflict: "
                                + key.table()
                                + "."
                                + key.keyColumn()
                                + "="
                                + key.keyValue()
                                + " belongs to "
                                + key.idColumn()
                                + "="
                                + actualId
                                + "; expected seed "
                                + key.idColumn()
                                + "="
                                + key.expectedId());
            }
        }
    }

    private void seedPermissions() {
        jdbc.update(
                """
                INSERT INTO permissions(id, code, name) VALUES
                (900201,'CATALOG_READ','Đọc catalog quản trị'),
                (900202,'CATALOG_WRITE','Ghi catalog quản trị'),
                (900203,'INVENTORY_READ','Đọc tồn kho và phiếu nhập'),
                (900204,'INVENTORY_WRITE','Ghi tồn kho và phiếu nhập'),
                (900205,'ORDER_READ','Đọc đơn hàng quản trị'),
                (900206,'ORDER_EDIT','Cập nhật thông tin đơn'),
                (900210,'ORDER_PAYMENT','Thu COD và hoàn tiền'),
                (900211,'ORDER_AFTER_SALES','Xử lý sau bán'),
                (900212,'AUDIT_READ','Đọc audit log'),
                (900213,'CONTENT_READ','Đọc nội dung quản trị'),
                (900214,'CONTENT_WRITE','Ghi nội dung quản trị'),
                (900215,'CUSTOMER_READ','Đọc khách hàng back-office')
                """);
    }

    private void seedRoles() {
        jdbc.update(
                """
                INSERT INTO roles(id, code, name, description) VALUES
                (900101,'FIDO_SEED_CATALOG','Seed Catalog Staff',
                    'Dev-only: CATALOG_READ + CATALOG_WRITE'),
                (900102,'FIDO_SEED_INVENTORY','Seed Inventory Staff',
                    'Dev-only: INVENTORY_READ + INVENTORY_WRITE'),
                (900103,'FIDO_SEED_ORDER','Seed Order Staff',
                    'Dev-only: current ORDER_* capabilities'),
                (900104,'FIDO_SEED_OPS','Seed Ops Staff',
                    'Dev-only: AUDIT_READ + CONTENT_READ/WRITE + CUSTOMER_READ')
                """);
    }

    private void seedRolePermissions() {
        jdbc.update(
                """
                INSERT INTO role_permissions(role_id, permission_id) VALUES
                (900101,900201),(900101,900202),
                (900102,900203),(900102,900204),
                (900103,900205),(900103,900206),(900103,900210),(900103,900211),
                (900104,900212),(900104,900213),(900104,900214),(900104,900215)
                """);

        // Seeded Permission rows are added after Flyway. Reconcile every one to SUPERADMIN as well.
        jdbc.update(
                """
                INSERT INTO role_permissions(role_id, permission_id)
                SELECT r.id, p.id
                FROM roles r CROSS JOIN permissions p
                WHERE r.code='SUPERADMIN'
                  AND NOT EXISTS (
                      SELECT 1 FROM role_permissions rp
                      WHERE rp.role_id=r.id AND rp.permission_id=p.id
                  )
                """);
    }

    private void seedAccounts(String passwordHash) {
        jdbc.update(
                """
                INSERT INTO accounts(
                    id,password_hash,phone,email,created_at,updated_at
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
                passwordHash);
    }

    private void seedAddresses() {
        jdbc.update(
                """
                INSERT INTO addresses(
                    id,account_id,address_text,recipient_name,recipient_phone,province,district,ward,
                    address_line,is_default,created_at,updated_at
                ) VALUES
                (910001,900002,'123 Cầu Giấy, Dịch Vọng, Cầu Giấy, Hà Nội','Test Customer','0909000002',
                    'Hà Nội','Cầu Giấy','Dịch Vọng','123 Cầu Giấy',TRUE,'2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (910002,900002,'45 Xuân Thủy, Dịch Vọng, Cầu Giấy, Hà Nội','Test Customer','0909000002',
                    'Hà Nội','Cầu Giấy','Dịch Vọng','45 Xuân Thủy',FALSE,'2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (910003,900008,'88 Hồ Tùng Mậu, Mai Dịch, Nam Từ Liêm, Hà Nội','Test Customer 2','0909000008',
                    'Hà Nội','Nam Từ Liêm','Mai Dịch','88 Hồ Tùng Mậu',TRUE,'2026-09-01 00:00:00','2026-09-01 00:00:00')
                """);
    }

    private void seedAccountRoles() {
        assignSystemRole(900001L, "SUPERADMIN");
        assignSystemRole(900002L, "CUSTOMER");

        assignSystemRole(900003L, "ADMIN");
        assignSeedRole(900003L, 900101L);

        assignSystemRole(900004L, "ADMIN");
        assignSeedRole(900004L, 900102L);

        assignSystemRole(900005L, "ADMIN");
        assignSeedRole(900005L, 900103L);

        assignSystemRole(900006L, "ADMIN");
        assignSeedRole(900006L, 900104L);

        assignSystemRole(900007L, "ADMIN");
        assignSystemRole(900008L, "CUSTOMER");
    }

    private void assignSystemRole(long accountId, String roleCode) {
        int inserted =
                jdbc.update(
                        """
                        INSERT INTO account_roles(account_id,role_id)
                        SELECT ?, id FROM roles
                        WHERE code=?
                        """,
                        accountId,
                        roleCode);

        if (inserted != 1) {
            throw new IllegalStateException("Required system role is missing: " + roleCode);
        }
    }

    private void assignSeedRole(long accountId, long roleId) {
        jdbc.update(
                "INSERT INTO account_roles(account_id,role_id) VALUES (?,?)", accountId, roleId);
    }

    private static ReservedNaturalKey reserved(
            String table, String idColumn, long expectedId, String keyColumn, String keyValue) {
        return new ReservedNaturalKey(table, idColumn, expectedId, keyColumn, keyValue);
    }

    private record ReservedNaturalKey(
            String table, String idColumn, long expectedId, String keyColumn, String keyValue) {}
}
