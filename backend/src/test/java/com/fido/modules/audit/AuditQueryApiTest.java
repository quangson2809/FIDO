package com.fido.modules.audit;

import static org.junit.jupiter.api.Assertions.*;

import com.fido.support.OperationsHttpSupport;

import org.junit.jupiter.api.Test;

class AuditQueryApiTest extends OperationsHttpSupport {
    @Test
    void authorizationFiltersStablePaginationAndRangeValidation() throws Exception {
        var employee = user("ADMIN");
        String path = "/api/v1/admin/audit-logs";
        assertEquals(401, call("GET", path, null, null).status());
        assertEquals(403, call("GET", path, employee.token(), null).status());
        capability(employee, "AUDIT_READ");
        for (int i = 0; i < 2; i++)
            db.update(
                    "INSERT INTO"
                        + " audit_logs(actor_account_id,action,entity_type,entity_id,before_data,after_data,created_at)"
                        + " VALUES (?,'TEST','CONTENT_PAGE','abc',NULL,NULL,'2026-09-20 12:00:00')",
                    employee.id());
        String query =
                path
                        + "?actor_account_id="
                        + employee.id()
                        + "&action=TEST&entity_type=CONTENT_PAGE&entity_id=abc&from=2026-09-20T12:00:00Z&to=2026-09-20T12:00:00Z&page_size=1";
        var first = call("GET", query, employee.token(), null);
        assertEquals(200, first.status());
        assertEquals(2, first.body().get("meta").get("total").asInt());
        assertEquals(2, first.body().get("meta").get("total_pages").asInt());
        var second = call("GET", query + "&page=2", employee.token(), null);
        assertTrue(
                first.body().get("data").get(0).get("id").asLong()
                        > second.body().get("data").get(0).get("id").asLong());
        assertEquals(9, first.body().get("data").get(0).size());
        for (String filter :
                new String[] {
                    "action=NO",
                    "entity_type=NO",
                    "entity_id=NO",
                    "actor_account_id=9223372036854775807",
                    "from=2099-01-01T00:00:00Z",
                    "to=1900-01-01T00:00:00Z"
                }) {
            var empty = call("GET", path + "?" + filter, employee.token(), null);
            assertEquals(200, empty.status());
            assertEquals(0, empty.body().get("meta").get("total").asInt());
        }
        for (String invalid :
                new String[] {
                    "page=0",
                    "page_size=101",
                    "from=2026-10-01T00:00:00Z&to=2026-09-01T00:00:00Z",
                    "from=bad"
                })
            assertEquals(400, call("GET", path + "?" + invalid, employee.token(), null).status());
    }
}
