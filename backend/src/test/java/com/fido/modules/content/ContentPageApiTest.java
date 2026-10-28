package com.fido.modules.content;

import static org.junit.jupiter.api.Assertions.*;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.support.OperationsHttpSupport;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.util.AopTestUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

class ContentPageApiTest extends OperationsHttpSupport {
    private static final String ADMIN = "/api/v1/admin/content-pages";

    @MockitoSpyBean
    private AuditWriteService auditWriter;

    @Test
    void createPatchPublicProjectionAndTransactionalAudit() throws Exception {
        var root = user("SUPERADMIN");
        String slug = "policy-" + UUID.randomUUID().toString().replace("-", "");
        var created = call("POST", ADMIN, root.token(),
                Map.of("slug", slug, "title", "Policy", "content", "First"));
        assertEquals(201, created.status(), String.valueOf(created.body()));
        var data = created.body().get("data");
        long id = data.get("id").asLong();
        assertEquals(slug, data.get("slug").asText());
        assertEquals(root.id(), data.get("updated_by_account_id").asLong());
        assertFalse(data.get("updated_at").isNull());

        var patched = call("PATCH", ADMIN + "/" + id, root.token(),
                Map.of("title", "Updated", "status", "PUBLISHED"));
        assertEquals(200, patched.status(), String.valueOf(patched.body()));
        assertEquals("First", patched.body().get("data").get("content").asText());
        assertEquals(slug, patched.body().get("data").get("slug").asText());
        assertEquals("PUBLISHED", patched.body().get("data").get("status").asText());
        assertEquals(
                db.queryForObject("SELECT updated_at FROM content_pages WHERE id=?",
                        java.sql.Timestamp.class, id).toLocalDateTime(),
                java.time.LocalDateTime.parse(patched.body().get("data").get("updated_at").asText()));

        var publicPage = call("GET", "/api/v1/content-pages/" + slug, null, null);
        assertEquals(200, publicPage.status());
        assertEquals(4, publicPage.body().get("data").size());
        assertFalse(publicPage.body().get("data").has("updated_by_account_id"));
        assertEquals("Updated", publicPage.body().get("data").get("title").asText());
        assertEquals(slug, publicPage.body().get("data").get("slug").asText());

        assertEquals(2, db.queryForObject(
                "SELECT COUNT(*) FROM audit_logs WHERE entity_type='CONTENT_PAGE' AND entity_id=? AND actor_account_id=?",
                Integer.class, Long.toString(id), root.id()));

        var duplicate = call("POST", ADMIN, root.token(),
                Map.of("slug", slug, "title", "Duplicate", "content", "x"));
        assertEquals(409, duplicate.status(), String.valueOf(duplicate.body()));

        var nullTitle = new HashMap<String, Object>();
        nullTitle.put("title", null);
        assertEquals(400, call("PATCH", ADMIN + "/" + id, root.token(), nullTitle).status());
        assertEquals(400, call("PATCH", ADMIN + "/" + id, root.token(),
                Map.of("content", " ")).status());
        assertEquals(404, call("PATCH", ADMIN + "/9223372036854775807", root.token(),
                Map.of("title", "x")).status());

        assertEquals(2, db.queryForObject(
                "SELECT COUNT(*) FROM audit_logs WHERE entity_type='CONTENT_PAGE' AND entity_id=? AND actor_account_id=?",
                Integer.class, Long.toString(id), root.id()));
        assertEquals(200, call("GET", ADMIN, root.token(), null).status());
        assertEquals(404, call("GET", "/api/v1/content-pages/missing-" + slug, null, null).status());
    }

    @Test
    void readAndWriteCapabilitiesAreIndependent() throws Exception {
        var employee = user("ADMIN");
        assertEquals(401, call("GET", ADMIN, null, null).status());
        assertEquals(403, call("GET", ADMIN, employee.token(), null).status());
        capability(employee, "CONTENT_READ");
        assertEquals(200, call("GET", ADMIN, employee.token(), null).status());
        var request = Map.of(
                "slug", "policy-" + UUID.randomUUID().toString().replace("-", ""),
                "title", "Policy", "content", "Text");
        assertEquals(403, call("POST", ADMIN, employee.token(), request).status());
        capability(employee, "CONTENT_WRITE");
        assertEquals(201, call("POST", ADMIN, employee.token(), request).status());
    }

    @Test
    void auditFailureRollsBackContentMutation() throws Exception {
        var root = user("SUPERADMIN");
        String slug = "rollback-" + UUID.randomUUID().toString().replace("-", "");
        var created = call("POST", ADMIN, root.token(),
                Map.of("slug", slug, "title", "Original", "content", "Text"));
        assertEquals(201, created.status(), String.valueOf(created.body()));
        long id = created.body().get("data").get("id").asLong();

        AuditWriteService auditTarget = AopTestUtils.getUltimateTargetObject(auditWriter);
        Mockito.doThrow(new IllegalStateException("Audit unavailable"))
                .when(auditTarget)
                .record(Mockito.argThat(event -> event.action() == AuditAction.CONTENT_UPDATE));

        var failed = call("PATCH", ADMIN + "/" + id, root.token(), Map.of("title", "Must rollback"));
        assertEquals(500, failed.status(), String.valueOf(failed.body()));
        assertEquals("Original", db.queryForObject(
                "SELECT title FROM content_pages WHERE id=?", String.class, id));
        assertEquals(1, db.queryForObject(
                "SELECT COUNT(*) FROM audit_logs WHERE actor_account_id=? AND entity_type='CONTENT_PAGE' AND entity_id=?",
                Integer.class, root.id(), Long.toString(id)));
    }
}
