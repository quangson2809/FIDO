package com.fido.modules.account;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

class RbacHttpTests extends AccountHttpSupport {

    @Test
    void rolePermissionCrudReplacementAuditAndRollback() throws Exception {
        String token = root();
        var unknown =
                call(
                        "POST",
                        "/api/v1/admin/permissions",
                        token,
                        Map.of("code", "ARBITRARY_" + UUID.randomUUID(), "name", "Unsupported"));
        assertEquals(400, unknown.status(), unknown.body());
        assertEquals("PERMISSION_UNSUPPORTED", unknown.data().get("code").asText());
        long read =
                db.queryForObject(
                        "SELECT id FROM permissions WHERE code='CATALOG_READ'", Long.class);
        long write =
                db.queryForObject(
                        "SELECT id FROM permissions WHERE code='CATALOG_WRITE'", Long.class);
        var created =
                call(
                        "POST",
                        "/api/v1/admin/roles",
                        token,
                        Map.of(
                                "code",
                                "ops." + UUID.randomUUID(),
                                "name",
                                "Role",
                                "permission_ids",
                                List.of(read)));
        assertEquals(201, created.status(), created.body());
        long id = created.data().get("data").get("id").asLong();
        roleIds.add(id);
        var changed =
                call(
                        "PATCH",
                        "/api/v1/admin/roles/" + id,
                        token,
                        Map.of("permission_ids", List.of(write)));
        assertEquals(200, changed.status(), changed.body());
        assertEquals(
                write, changed.data().get("data").get("permissions").get(0).get("id").asLong());
        var audit =
                db.queryForMap(
                        "SELECT CAST(before_data AS CHAR) b,CAST(after_data AS CHAR) a FROM audit_logs WHERE action='ROLE_UPDATE' AND entity_id=? ORDER BY id DESC LIMIT 1",
                        Long.toString(id));
        assertTrue(audit.get("b").toString().contains("permission_ids"));
        assertTrue(audit.get("a").toString().contains("permission_ids"));
        assertFalse(
                audit.get("b").equals(audit.get("a")),
                "same count must preserve the changed grant IDs");
        assertEquals(
                404,
                call(
                                "PATCH",
                                "/api/v1/admin/roles/" + id,
                                token,
                                Map.of(
                                        "name",
                                        "Must rollback",
                                        "permission_ids",
                                        List.of(Long.MAX_VALUE)))
                        .status());
        assertEquals(
                "Role", db.queryForObject("SELECT name FROM roles WHERE id=?", String.class, id));
        assertEquals(
                write,
                db.queryForObject(
                        "SELECT permission_id FROM role_permissions WHERE role_id=?",
                        Long.class,
                        id));
        assertEquals(
                409, call("DELETE", "/api/v1/admin/permissions/" + read, token, null).status());
        assertEquals(
                200,
                call(
                                "PATCH",
                                "/api/v1/admin/roles/" + id,
                                token,
                                Map.of("permission_ids", List.of()))
                        .status());
        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM role_permissions WHERE role_id=?",
                        Integer.class,
                        id));
        assertEquals(204, call("DELETE", "/api/v1/admin/roles/" + id, token, null).status());
        roleIds.remove(id);
    }
}
