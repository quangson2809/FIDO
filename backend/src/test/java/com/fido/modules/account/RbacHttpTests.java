package com.fido.modules.account;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

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

        var permissionList = call(
                "GET",
                "/api/v1/admin/permissions",
                token,
                null
        );

        assertEquals(
                200,
                permissionList.status()
        );

        assertTrue(permissionList.data().get("data").isArray());

        boolean permissionFound = false;
        for (var permissionNode : permissionList.data().get("data")) {
            if (permissionNode.get("permission_id").asLong() == permissionId) {
                permissionFound = true;
                break;
            }
        }

        assertTrue(permissionFound);
        assertFalse(permissionList.data().has("meta"));

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

        var accessControl = call(
                "GET",
                "/api/v1/admin/access-control",
                token,
                null
        );

        assertEquals(
                200,
                accessControl.status(),
                accessControl.body()
        );

        boolean roleFound = false;

        for (var roleNode :
                accessControl.data().get("data").get("roles")) {
            if (roleNode.get("role_id").asLong() != roleId) {
                continue;
            }

            roleFound = true;

            assertEquals(
                    1,
                    roleNode.get("permissions").size()
            );

            assertEquals(
                    permissionId,
                    roleNode.get("permissions")
                            .get(0)
                            .get("permission_id")
                            .asLong()
            );
        }

        assertTrue(roleFound);

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
