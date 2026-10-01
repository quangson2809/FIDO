package com.fido.modules.account;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fido.modules.account.service.AccountAccessService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AccountAccessServiceTests {

    @Autowired
    AccountAccessService access;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    ObjectMapper json;

    private void fixture() {
        jdbc.update(
                """
                INSERT INTO accounts (
                    account_id,
                    password_hash,
                    created_at,
                    updated_at
                )
                VALUES
                    (201, 'never-expose-this', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    (202, 'other-hash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    (203, 'admin-hash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
        );

        jdbc.update(
                """
                INSERT INTO roles (role_id, code, name)
                VALUES
                    (201, 'test-role-a', 'A'),
                    (202, 'test-role-b', 'B'),
                    (203, 'test-placeholder', 'Administrator')
                """
        );

        jdbc.update(
                """
                INSERT INTO permissions (permission_id, code, name)
                VALUES
                    (201, 'test.read', 'Read'),
                    (202, 'test.write', 'Write')
                """
        );

        jdbc.update(
                "INSERT INTO account_roles VALUES (201,201),(201,202)"
        );

        jdbc.update(
                """
                INSERT INTO account_roles
                SELECT 203, role_id
                FROM roles
                WHERE code = 'SUPERADMIN'
                """
        );

        jdbc.update(
                "INSERT INTO role_permissions VALUES (201,201),(202,201),(202,202)"
        );
    }

    @Test
    void combinesPermissionsWithoutDuplicatesAndIsolatesAccounts() {
        fixture();

        var detail = access.findAccess(201L)
                .orElseThrow();

        assertEquals(
                2,
                detail.roles().size()
        );

        assertEquals(
                2,
                detail.permissions().size()
        );


        assertTrue(
                access.findAccess(202L)
                        .orElseThrow()
                        .roles()
                        .isEmpty()
        );

        assertFalse(
                access.isSuperadmin(201L)
        );
    }

    @Test
    void recognizesSuperadminRoleWithoutInventingPermissionGrants() {
        fixture();

        assertTrue(
                access.isSuperadmin(203L)
        );


        assertTrue(
                access.findAccess(203L)
                        .orElseThrow()
                        .permissions()
                        .isEmpty()
        );

    }

    @Test
    void removedRoleAndPermissionGrantsTakeEffectWithoutCachedClaims() {
        fixture();

        assertEquals(
                2,
                access.findAccess(201L)
                        .orElseThrow()
                        .permissions()
                        .size()
        );

        jdbc.update(
                "DELETE FROM role_permissions WHERE permission_id = 202"
        );

        assertEquals(
                1,
                access.findAccess(201L)
                        .orElseThrow()
                        .permissions()
                        .size()
        );

        jdbc.update(
                "DELETE FROM account_roles WHERE account_id = 203"
        );

        assertFalse(
                access.isSuperadmin(203L)
        );

    }

    @Test
    void unknownAccountsAndMissingInputsFailClosed() {
        assertTrue(
                access.findAccess(null).isEmpty()
        );

        assertTrue(
                access.findAccess(-1L).isEmpty()
        );

        assertFalse(
                access.isSuperadmin(null)
        );

        assertFalse(
                access.isSuperadmin(-1L)
        );

    }

    @Test
    void serializesOnlyApprovedAccountAndRbacFields() throws Exception {
        fixture();

        var tree = json.readTree(
                json.writeValueAsString(
                        access.findAccess(201L)
                                .orElseThrow()
                )
        );

        assertEquals(
                3,
                tree.size()
        );

        assertEquals(
                5,
                tree.get("account").size()
        );

        assertEquals(
                201L,
                tree.get("account")
                        .get("account_id")
                        .asLong()
        );

        assertFalse(
                tree.toString().contains("password")
        );

        assertFalse(
                tree.toString().contains("never-expose-this")
        );

        assertTrue(
                tree.get("roles")
                        .get(0)
                        .has("role_id")
        );

        assertTrue(
                tree.get("permissions")
                        .get(0)
                        .has("permission_id")
        );
    }
}
