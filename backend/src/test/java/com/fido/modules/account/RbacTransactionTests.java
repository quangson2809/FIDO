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
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import java.time.Instant;
import java.util.List;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

@SpringBootTest
@ActiveProfiles("test")
class RbacTransactionTests {

    @Autowired RbacCommandService service;

    @Autowired JdbcTemplate jdbc;

    @Test
    void failedAuditRollsBackPermissionAndSuperadminGrant() {
        Jwt jwt = Jwt.withTokenValue("test-token").header("alg", "HS256")
                .subject("999999999").issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60)).build();
        SecurityContextHolder.getContext().setAuthentication(
                new JwtAuthenticationToken(jwt, List.of(new SimpleGrantedAuthority("ROLE_SUPERADMIN"))));
        try {
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
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(authorities = "ROLE_ADMIN")
    void serviceRejectsEmployeeEvenWhenBypassingHttp() {
        assertThrows(
                AccessDeniedException.class,
                () ->
                        service.createPermission(
                                1L, new PermissionCreateRequest("test.denied", "Denied")));
    }
}
