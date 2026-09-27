package com.fido.modules.account;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.fido.modules.account.service.SuperadminBootstrapService;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

class RbacHttpTests extends AccountHttpSupport {

    @Test
    void rolePermissionCrudReplacementAuditAndRollback() throws Exception {
        String token = root();
        String suffix = UUID.randomUUID().toString();

        assertEquals(
                400,
                call(
                        "PATCH",
                        "/api/v1/admin/roles/not-an-id",
                        token,
                        Map.of("name", "Bad")
                ).status()
        );

        assertEquals(
                400,
                call(
                        "POST",
                        "/api/v1/admin/permissions",
                        token,
                        Map.of(
                                "code", " ",
                                "name", "Bad"
                        )
                ).status()
        );

        var permissionResponse = call(
                "POST",
                "/api/v1/admin/permissions",
                token,
                Map.of(
                        "code", "test." + suffix,
                        "name", "Test permission"
                )
        );

        assertEquals(
                201,
                permissionResponse.status(),
                permissionResponse.body()
        );

        long permissionId = permissionResponse.data()
                .get("data")
                .get("permission_id")
                .asLong();

        permissionIds.add(permissionId);

        assertEquals(
                200,
                call(
                        "PATCH",
                        "/api/v1/admin/permissions/" + permissionId,
                        token,
                        Map.of("name", "Updated")
                ).status()
        );

        var permissionPage = call(
                "GET",
                "/api/v1/admin/permissions",
                token,
                null
        );

        assertEquals(
                200,
                permissionPage.status()
        );

        assertEquals(
                20,
                permissionPage.data()
                        .get("meta")
                        .get("page_size")
                        .asInt()
        );

        assertEquals(
                400,
                call(
                        "GET",
                        "/api/v1/admin/permissions?page_size=101",
                        token,
                        null
                ).status()
        );

        var roleResponse = call(
                "POST",
                "/api/v1/admin/roles",
                token,
                Map.of(
                        "code", "test." + suffix,
                        "name", "Role",
                        "permission_ids", List.of(permissionId)
                )
        );

        assertEquals(
                201,
                roleResponse.status(),
                roleResponse.body()
        );

        long roleId = roleResponse.data()
                .get("data")
                .get("role_id")
                .asLong();

        roleIds.add(roleId);

        assertEquals(
                409,
                call(
                        "DELETE",
                        "/api/v1/admin/permissions/" + permissionId,
                        token,
                        null
                ).status()
        );

        assertEquals(
                404,
                call(
                        "PATCH",
                        "/api/v1/admin/roles/" + roleId,
                        token,
                        Map.of(
                                "name", "Must rollback",
                                "permission_ids", List.of(Long.MAX_VALUE)
                        )
                ).status()
        );

        assertEquals(
                "Role",
                db.queryForObject(
                        "SELECT name FROM roles WHERE role_id=?",
                        String.class,
                        roleId
                )
        );

        assertEquals(
                1,
                db.queryForObject(
                        "SELECT COUNT(*) FROM role_permissions WHERE role_id=?",
                        Integer.class,
                        roleId
                )
        );

        var patch = new HashMap<String, Object>();
        patch.put("description", null);
        patch.put("permission_ids", List.of());

        assertEquals(
                200,
                call(
                        "PATCH",
                        "/api/v1/admin/roles/" + roleId,
                        token,
                        patch
                ).status()
        );

        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM role_permissions WHERE role_id=?",
                        Integer.class,
                        roleId
                )
        );

        assertEquals(
                204,
                call(
                        "DELETE",
                        "/api/v1/admin/permissions/" + permissionId,
                        token,
                        null
                ).status()
        );

        permissionIds.remove(permissionId);

        assertEquals(
                204,
                call(
                        "DELETE",
                        "/api/v1/admin/roles/" + roleId,
                        token,
                        null
                ).status()
        );

        roleIds.remove(roleId);

        assertTrue(
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM audit_logs
                        WHERE action='ROLE_CREATE'
                          AND target_id=?
                        """,
                        Integer.class,
                        Long.toString(roleId)
                ) > 0
        );
    }
}
