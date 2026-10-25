package com.fido.modules.account;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fido.modules.account.service.SuperadminBootstrapService;

import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.test.context.ActiveProfiles;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
abstract class AccountHttpSupport {

    static final String PASSWORD = "Test-password-123";

    @LocalServerPort int port;

    @Autowired ObjectMapper json;

    @Autowired JdbcTemplate db;

    @Autowired JwtEncoder encoder;

    @Autowired PasswordEncoder passwords;

    @Autowired SuperadminBootstrapService bootstrap;

    final HttpClient client = HttpClient.newHttpClient();

    final List<Long> created = new ArrayList<>();
    final List<Long> roleIds = new ArrayList<>();
    final List<Long> permissionIds = new ArrayList<>();

    record Result(int status, JsonNode data, String body) {}

    Result call(String method, String path, String token, Object body) throws Exception {
        var request = java.net.http.HttpRequest.newBuilder(URI.create("http://localhost:" + port + path));

        request.header("Accept", "application/json");

        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }

        request.header("Content-Type", "application/json");

        request.method(
                method,
                body == null
                        ? java.net.http.HttpRequest.BodyPublishers.noBody()
                        : java.net.http.HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));

        var response =
                client.send(request.build(), java.net.http.HttpResponse.BodyHandlers.ofString());

        return new Result(
                response.statusCode(),
                response.body().isBlank() ? null : json.readTree(response.body()),
                response.body());
    }

    String phone() {
        return "+84" + String.format(
                Locale.ROOT,
                "%09d",
                ThreadLocalRandom.current().nextLong(100_000_000L, 1_000_000_000L));
    }

    long register(String phone) throws Exception {
        var response =
                call(
                        "POST",
                        "/api/v1/auth/register",
                        null,
                        Map.of("phone", phone, "full_name", "Test Account", "password", PASSWORD));

        assertEquals(201, response.status, response.body);

        long accountId = response.data.get("data").get("account").get("account_id").asLong();

        created.add(accountId);
        return accountId;
    }

    String login(String phone) throws Exception {
        var response =
                call(
                        "POST",
                        "/api/v1/auth/login",
                        null,
                        Map.of("identifier", phone, "password", PASSWORD));

        assertEquals(200, response.status, response.body);
        return response.data.get("data").get("access_token").asText();
    }

    void grant(long accountId, String role) {
        db.update(
                """
                INSERT INTO account_roles
                SELECT ?, role_id
                FROM roles
                WHERE code = ?
                """,
                accountId,
                role);
    }

    String root() throws Exception {
        String phone = phone();
        long accountId = register(phone);
        grant(accountId, "SUPERADMIN");
        return login(phone);
    }

    @AfterEach
    void clean() {
        for (Long accountId : created) {
            db.update("DELETE FROM audit_logs WHERE actor_account_id=?", accountId);
            db.update("DELETE FROM addresses WHERE account_id=?", accountId);
            db.update("DELETE FROM account_roles WHERE account_id=?", accountId);
            db.update("DELETE FROM accounts WHERE id=?", accountId);
        }

        for (Long roleId : roleIds) {
            db.update("DELETE FROM role_permissions WHERE role_id=?", roleId);
            db.update("DELETE FROM roles WHERE id=?", roleId);
        }

        for (Long permissionId : permissionIds) {
            db.update("DELETE FROM role_permissions WHERE permission_id=?", permissionId);
            db.update("DELETE FROM permissions WHERE id=?", permissionId);
        }
    }
}
