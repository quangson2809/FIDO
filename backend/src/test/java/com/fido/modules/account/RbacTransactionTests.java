package com.fido.modules.account;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fido.modules.account.dto.request.PermissionCreateRequest;
import com.fido.modules.account.service.RbacCommandService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

@SpringBootTest
@ActiveProfiles("test")
class RbacTransactionTests {

    @Autowired RbacCommandService service;

    @Autowired JdbcTemplate jdbc;

    @Test
    @WithMockUser(authorities = "ROLE_SUPERADMIN")
    void failedAuditRollsBackPermissionAndSuperadminGrant() {
        String code = "test.rollback." + UUID.randomUUID();

        assertThrows(
                DataIntegrityViolationException.class,
                () ->
                        service.createPermission(
                                -999L, new PermissionCreateRequest(code, "Rollback test")));

        assertEquals(
                0,
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM permissions WHERE code=?", Integer.class, code));

        assertEquals(
                0,
                jdbc.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM role_permissions rp
                        JOIN permissions p ON p.permission_id=rp.permission_id
                        WHERE p.code=?
                        """,
                        Integer.class,
                        code));
    }

    @Test
    @WithMockUser(authorities = "ROLE_ADMIN")
    void serviceRejectsEmployeeEvenWhenBypassingHttp() {
        assertThrows(
                AccessDeniedException.class,
                () ->
                        service.createPermission(
                                1L, new PermissionCreateRequest("test.denied", "Denied")));
    }
}
