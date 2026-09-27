package com.fido.support;
import static org.junit.jupiter.api.Assertions.assertEquals;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public abstract class OperationsHttpSupport {
    @LocalServerPort private int port;
    @Autowired protected ObjectMapper json;
    @Autowired protected JdbcTemplate db;
    protected final List<Long> accounts = new ArrayList<>();
    private final List<Long> roles = new ArrayList<>();
    private final List<Long> permissions = new ArrayList<>();
    protected record Result(int status, JsonNode body) {}
    protected record User(long id, String token, String phone) {}
    protected Result call(String method, String path, String token, Object body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Content-Type", "application/json");
        if (token != null) request.header("Authorization", "Bearer " + token);
        request.method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        var response = HttpClient.newHttpClient().send(request.build(), HttpResponse.BodyHandlers.ofString());
        return new Result(response.statusCode(), response.body().isBlank() ? null : json.readTree(response.body()));
    }
    protected User user(String role) throws Exception {
        String phone = "09" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        var created = call("POST", "/api/v1/auth/register", null, Map.of("phone", phone, "password", "Test-password-123"));
        assertEquals(201, created.status());
        long id = created.body().get("data").get("account_id").asLong();
        accounts.add(id);
        if (role != null) db.update("INSERT INTO account_roles SELECT ?,role_id FROM roles WHERE code=?", id, role);
        var login = call("POST", "/api/v1/auth/login", null, Map.of("identifier", phone, "password", "Test-password-123"));
        assertEquals(200, login.status());
        return new User(id, login.body().get("data").get("access_token").asText(), phone);
    }
    protected void capability(User user, String code) {
        Long permission = db.query("SELECT permission_id FROM permissions WHERE code=?",
                rs -> rs.next() ? rs.getLong(1) : null, code);
        if (permission == null) {
            db.update("INSERT INTO permissions(code,name) VALUES (?,?)", code, code);
            permission = db.queryForObject("SELECT permission_id FROM permissions WHERE code=?", Long.class, code);
            permissions.add(permission);
        }
        String roleCode = "T" + UUID.randomUUID().toString().replace("-", "");
        db.update("INSERT INTO roles(code,name) VALUES (?,?)", roleCode, roleCode);
        long role = db.queryForObject("SELECT role_id FROM roles WHERE code=?", Long.class, roleCode);
        roles.add(role);
        db.update("INSERT INTO role_permissions(role_id,permission_id) VALUES (?,?)", role, permission);
        db.update("INSERT INTO account_roles(account_id,role_id) VALUES (?,?)", user.id(), role);
    }
    @AfterEach
    void cleanupOperations() {
        for (long id : accounts) {
            db.update("DELETE FROM content_pages WHERE updated_by_account_id=?", id);
            db.update("DELETE FROM audit_logs WHERE actor_account_id=?", id);
            db.update("DELETE FROM addresses WHERE account_id=?", id);
            db.update("DELETE FROM account_roles WHERE account_id=?", id);
            db.update("DELETE FROM accounts WHERE account_id=?", id);
        }
        for (long role : roles) {
            db.update("DELETE FROM role_permissions WHERE role_id=?", role);
            db.update("DELETE FROM roles WHERE role_id=?", role);
        }
        for (long permission : permissions) db.update("DELETE FROM permissions WHERE permission_id=?", permission);
    }
}
