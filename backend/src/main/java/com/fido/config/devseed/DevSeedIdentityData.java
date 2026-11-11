package com.fido.config.devseed;

import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Creates local-only identities and their links to the system roles seeded by Flyway.
 * It deliberately does not duplicate or modify the system role/permission catalogue.
 */
@Component
@Profile({"dev", "test"})
public class DevSeedIdentityData {

    private static final List<ReservedNaturalKey> RESERVED_NATURAL_KEYS =
            List.of(
                    reserved(900001L, "+84909000001"),
                    reserved(900002L, "+84909000002"),
                    reserved(900003L, "+84909000003"),
                    reserved(900004L, "+84909000004"),
                    reserved(900005L, "+84909000005"),
                    reserved(900006L, "+84909000006"),
                    reserved(900007L, "+84909000007"),
                    reserved(900008L, "+84909000008"));

    private final JdbcTemplate jdbc;

    public DevSeedIdentityData(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void seed(String passwordHash) {
        assertReservedNaturalKeysAvailable();
        seedAccounts(passwordHash);
        seedAddresses();
        seedAccountRoles();
    }

    private void assertReservedNaturalKeysAvailable() {
        for (ReservedNaturalKey key : RESERVED_NATURAL_KEYS) {
            List<Long> existingIds =
                    jdbc.queryForList(
                            "SELECT id FROM accounts WHERE phone = ? AND deleted_at IS NULL",
                            Long.class,
                            key.phone());

            if (existingIds.isEmpty()) {
                continue;
            }

            Long actualId = existingIds.get(0);
            if (!Long.valueOf(key.expectedId()).equals(actualId)) {
                throw new IllegalStateException(
                        "Development seed conflict: accounts.phone="
                                + key.phone()
                                + " belongs to accounts.id="
                                + actualId
                                + "; expected seed accounts.id="
                                + key.expectedId());
            }
        }

        for (String roleCode : List.of("CUSTOMER", "ADMIN", "SUPERADMIN")) {
            Integer count =
                    jdbc.queryForObject(
                            "SELECT COUNT(*) FROM roles WHERE code = ?",
                            Integer.class,
                            roleCode);
            if (count == null || count != 1) {
                throw new IllegalStateException(
                        "Required Flyway system role is missing or ambiguous: " + roleCode);
            }
        }
    }

    private void seedAccounts(String passwordHash) {
        jdbc.update(
                """
                INSERT INTO accounts(
                    id, full_name, password_hash, phone, email, status, created_at, updated_at
                ) VALUES
                (900001,'FIDO Superadmin',?,'+84909000001','superadmin@fido.local','ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900002,'Demo Customer',?,'+84909000002','customer@fido.local','ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900003,'Demo Admin Catalog',?,'+84909000003','catalog@fido.local','ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900004,'Demo Admin Inventory',?,'+84909000004','inventory@fido.local','ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900005,'Demo Admin Orders',?,'+84909000005','order@fido.local','ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900006,'Demo Admin Operations',?,'+84909000006','ops@fido.local','ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900007,'Demo Admin No Grants',?,'+84909000007','admin.noperm@fido.local','ACTIVE',
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (900008,'Demo Customer Two',?,'+84909000008','customer2@fido.local','ACTIVE',
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
                    id, account_id, recipient_name, recipient_phone,
                    province, district, ward, address_line, is_default, created_at, updated_at
                ) VALUES
                (910001,900002,'Demo Customer','+84909000002',
                    'Hà Nội','Cầu Giấy','Dịch Vọng','123 Cầu Giấy',TRUE,
                    '2026-09-01 00:00:00','2026-09-01 00:00:00'),
                (910002,900002,'Demo Customer','+84909000002',
                    'Hà Nội','Cầu Giấy','Dịch Vọng','45 Xuân Thủy',FALSE,
                    '2026-09-02 00:00:00','2026-09-02 00:00:00'),
                (910003,900008,'Demo Customer Two','+84909000008',
                    'Hà Nội','Nam Từ Liêm','Mai Dịch','88 Hồ Tùng Mậu',TRUE,
                    '2026-09-01 00:00:00','2026-09-01 00:00:00')
                """);
    }

    private void seedAccountRoles() {
        assignSystemRole(900001L, "SUPERADMIN");
        assignSystemRole(900002L, "CUSTOMER");
        assignSystemRole(900003L, "ADMIN");
        assignSystemRole(900004L, "ADMIN");
        assignSystemRole(900005L, "ADMIN");
        assignSystemRole(900006L, "ADMIN");
        assignSystemRole(900007L, "ADMIN");
        assignSystemRole(900008L, "CUSTOMER");
    }

    private void assignSystemRole(long accountId, String roleCode) {
        int inserted =
                jdbc.update(
                        """
                        INSERT INTO account_roles(account_id, role_id)
                        SELECT ?, id FROM roles WHERE code = ?
                        """,
                        accountId,
                        roleCode);

        if (inserted != 1) {
            throw new IllegalStateException("Required system role could not be assigned: " + roleCode);
        }
    }

    private static ReservedNaturalKey reserved(long expectedId, String phone) {
        return new ReservedNaturalKey(expectedId, phone);
    }

    private record ReservedNaturalKey(long expectedId, String phone) {}
}
