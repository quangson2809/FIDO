package com.fido.modules.content;
import com.fido.support.OperationsHttpSupport;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ContentPageApiTest extends OperationsHttpSupport {
    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean
    private com.fido.modules.audit.service.AuditService audit;
    private static final String ADMIN = "/api/v1/admin/content-pages";
    @Test
    void createPatchPublicProjectionAndTransactionalAudit() throws Exception {
        var root = user("SUPERADMIN");
        String code = UUID.randomUUID().toString();
        var created = call("POST", ADMIN, root.token(), Map.of("page_code", code, "title", "Policy", "content", "First"));
        assertEquals(201, created.status());
        var data = created.body().get("data");
        long id = data.get("page_id").asLong();
        assertEquals(root.id(), data.get("updated_by_account_id").asLong());
        assertFalse(data.get("updated_at").isNull());
        var patched = call("PATCH", ADMIN + "/" + id, root.token(), Map.of("title", "Updated"));
        assertEquals(200, patched.status());
        assertEquals("First", patched.body().get("data").get("content").asText());
        assertEquals(code, patched.body().get("data").get("page_code").asText());
        assertEquals(db.queryForObject("SELECT updated_at FROM content_pages WHERE page_id=?", java.sql.Timestamp.class, id).toLocalDateTime(),
                java.time.LocalDateTime.parse(patched.body().get("data").get("updated_at").asText()));
        var publicPage = call("GET", "/api/v1/content-pages/" + code, null, null);
        assertEquals(200, publicPage.status());
        assertEquals(4, publicPage.body().get("data").size());
        assertFalse(publicPage.body().get("data").has("updated_by_account_id"));
        assertEquals("Updated", publicPage.body().get("data").get("title").asText());
        assertEquals(2, db.queryForObject("SELECT count(*) FROM audit_logs WHERE target_type='CONTENT_PAGE' AND target_id=? AND actor_account_id=?", Integer.class, Long.toString(id), root.id()));
        assertEquals(409, call("POST", ADMIN, root.token(), Map.of("page_code", code, "title", "Duplicate", "content", "x")).status());
        var nullTitle = new HashMap<String,Object>(); nullTitle.put("title", null);
        assertEquals(400, call("PATCH", ADMIN + "/" + id, root.token(), nullTitle).status());
        assertEquals(400, call("PATCH", ADMIN + "/" + id, root.token(), Map.of("content", " ")).status());
        assertEquals(404, call("PATCH", ADMIN + "/9223372036854775807", root.token(), Map.of("title", "x")).status());
        assertEquals(2, db.queryForObject("SELECT count(*) FROM audit_logs WHERE target_type='CONTENT_PAGE' AND target_id=? AND actor_account_id=?", Integer.class, Long.toString(id), root.id()));
        assertEquals(200, call("GET", ADMIN, root.token(), null).status());
        assertEquals(404, call("GET", "/api/v1/content-pages/missing-" + code, null, null).status());
    }
    @Test
    void readAndWriteCapabilitiesAreIndependent() throws Exception {
        var employee = user("ADMIN");
        assertEquals(401, call("GET", ADMIN, null, null).status());
        assertEquals(403, call("GET", ADMIN, employee.token(), null).status());
        capability(employee, "CONTENT_READ");
        assertEquals(200, call("GET", ADMIN, employee.token(), null).status());
        var request = Map.of("page_code", UUID.randomUUID().toString(), "title", "Policy", "content", "Text");
        assertEquals(403, call("POST", ADMIN, employee.token(), request).status());
        capability(employee, "CONTENT_WRITE");
        assertEquals(201, call("POST", ADMIN, employee.token(), request).status());
    }
    @Test
    void auditFailureRollsBackContentMutation() throws Exception {
        var root = user("SUPERADMIN");
        String code = UUID.randomUUID().toString();
        var created = call("POST", ADMIN, root.token(), Map.of("page_code", code, "title", "Original", "content", "Text"));
        assertEquals(201, created.status());
        long id = created.body().get("data").get("page_id").asLong();
        org.mockito.Mockito.doThrow(new IllegalStateException("Audit unavailable"))
                .when(audit).record(root.id(), "CONTENT_UPDATE", "CONTENT_PAGE", id);
        assertEquals(500, call("PATCH", ADMIN + "/" + id, root.token(), Map.of("title", "Must rollback")).status());
        assertEquals("Original", db.queryForObject("SELECT title FROM content_pages WHERE page_id=?", String.class, id));
        assertEquals(1, db.queryForObject("SELECT count(*) FROM audit_logs WHERE actor_account_id=? AND target_type='CONTENT_PAGE' AND target_id=?", Integer.class, root.id(), Long.toString(id)));
    }

}
