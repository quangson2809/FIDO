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

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT
)
@ActiveProfiles("test")
class AccountPhase2HttpTests {

    static final String PASSWORD = "Test-password-123";

    @LocalServerPort
    int port;

    @Autowired
    ObjectMapper json;

    @Autowired
    JdbcTemplate db;

    @Autowired
    JwtEncoder encoder;

    @Autowired
    PasswordEncoder passwords;

    @Autowired
    SuperadminBootstrapService bootstrap;

    final HttpClient client = HttpClient.newHttpClient();

    final List<Long> created = new ArrayList<>();
    final List<Long> roleIds = new ArrayList<>();
    final List<Long> permissionIds = new ArrayList<>();

    record Result(
            int status,
            JsonNode data,
            String body
    ) {
    }

    Result call(
            String method,
            String path,
            String token,
            Object body
    ) throws Exception {
        var request = HttpRequest.newBuilder(
                URI.create("http://localhost:" + port + path)
        );

        request.header(
                "Accept",
                "application/json"
        );

        if (token != null) {
            request.header(
                    "Authorization",
                    "Bearer " + token
            );
        }

        request.header(
                "Content-Type",
                "application/json"
        );

        request.method(
                method,
                body == null
                        ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(
                                json.writeValueAsString(body)
                        )
        );

        var response = client.send(
                request.build(),
                HttpResponse.BodyHandlers.ofString()
        );

        return new Result(
                response.statusCode(),
                response.body().isBlank()
                        ? null
                        : json.readTree(response.body()),
                response.body()
        );
    }

    String phone() {
        return "09"
                + UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        .substring(0, 16);
    }

    long register(String phone) throws Exception {
        var response = call(
                "POST",
                "/api/v1/auth/register",
                null,
                Map.of(
                        "phone", phone,
                        "password", PASSWORD
                )
        );

        assertEquals(
                201,
                response.status,
                response.body
        );

        long accountId = response.data
                .get("data")
                .get("account_id")
                .asLong();

        created.add(accountId);

        return accountId;
    }

    String login(String phone) throws Exception {
        var response = call(
                "POST",
                "/api/v1/auth/login",
                null,
                Map.of(
                        "identifier", phone,
                        "password", PASSWORD
                )
        );

        assertEquals(
                200,
                response.status,
                response.body
        );

        return response.data
                .get("data")
                .get("access_token")
                .asText();
    }

    void grant(
            long accountId,
            String role
    ) {
        db.update(
                """
                INSERT INTO account_roles
                SELECT ?, role_id
                FROM roles
                WHERE code = ?
                """,
                accountId,
                role
        );
    }

    String root() throws Exception {
        String phone = phone();
        long accountId = register(phone);

        grant(
                accountId,
                "SUPERADMIN"
        );

        return login(phone);
    }

    @AfterEach
    void clean() {
        for (Long accountId : created) {
            db.update(
                    "DELETE FROM audit_logs WHERE actor_account_id=?",
                    accountId
            );

            db.update(
                    "DELETE FROM addresses WHERE account_id=?",
                    accountId
            );

            db.update(
                    "DELETE FROM account_roles WHERE account_id=?",
                    accountId
            );

            db.update(
                    "DELETE FROM accounts WHERE account_id=?",
                    accountId
            );
        }

        for (Long roleId : roleIds) {
            db.update(
                    "DELETE FROM role_permissions WHERE role_id=?",
                    roleId
            );

            db.update(
                    "DELETE FROM roles WHERE role_id=?",
                    roleId
            );
        }

        for (Long permissionId : permissionIds) {
            db.update(
                    "DELETE FROM permissions WHERE permission_id=?",
                    permissionId
            );
        }
    }

    @Test
    void registrationLoginAndProfileContract() throws Exception {
        String phone = phone();
        long accountId = register(phone);
        String token = login(phone);

        String storedHash = db.queryForObject(
                "SELECT password_hash FROM accounts WHERE account_id=?",
                String.class,
                accountId
        );

        assertNotEquals(
                PASSWORD,
                storedHash
        );

        assertTrue(
                passwords.matches(PASSWORD, storedHash)
        );

        var me = call(
                "GET",
                "/api/v1/me",
                token,
                null
        );

        assertEquals(
                200,
                me.status
        );

        assertEquals(
                accountId,
                me.data
                        .get("data")
                        .get("account")
                        .get("account_id")
                        .asLong()
        );

        assertEquals(
                0,
                me.data
                        .get("data")
                        .get("roles")
                        .size()
        );

        assertFalse(
                me.body.contains("password")
        );

        assertEquals(
                200,
                call(
                        "PATCH",
                        "/api/v1/me",
                        token,
                        Map.of("email", "person@example.test")
                ).status
        );

        assertEquals(
                phone,
                db.queryForObject(
                        "SELECT phone FROM accounts WHERE account_id=?",
                        String.class,
                        accountId
                )
        );

        assertEquals(
                200,
                call(
                        "PATCH",
                        "/api/v1/me",
                        token,
                        Map.of()
                ).status
        );

        assertEquals(
                400,
                call(
                        "POST",
                        "/api/v1/auth/register",
                        null,
                        Map.of(
                                "phone", phone(),
                                "password", "x".repeat(73)
                        )
                ).status
        );

        assertEquals(
                400,
                call(
                        "POST",
                        "/api/v1/auth/register",
                        null,
                        Map.of(
                                "phone", phone(),
                                "password", " "
                        )
                ).status
        );

        assertEquals(
                400,
                call(
                        "POST",
                        "/api/v1/auth/register",
                        null,
                        Map.of(
                                "phone", phone(),
                                "password", PASSWORD,
                                "role", "SUPERADMIN"
                        )
                ).status
        );

        assertEquals(
                400,
                call(
                        "PATCH",
                        "/api/v1/me",
                        token,
                        Collections.singletonMap("phone", null)
                ).status
        );

        assertEquals(
                401,
                call(
                        "POST",
                        "/api/v1/auth/login",
                        null,
                        Map.of(
                                "identifier", phone,
                                "password", "wrong"
                        )
                ).status
        );

        assertEquals(
                401,
                call(
                        "POST",
                        "/api/v1/auth/login",
                        null,
                        Map.of(
                                "identifier", phone(),
                                "password", "wrong"
                        )
                ).status
        );
    }

    @Test
    void uniquePhoneAndConcurrentRegistration() throws Exception {
        String phone = phone();
        register(phone);

        assertEquals(
                409,
                call(
                        "POST",
                        "/api/v1/auth/register",
                        null,
                        Map.of(
                                "phone", phone,
                                "password", PASSWORD
                        )
                ).status
        );

        String otherPhone = phone();
        register(otherPhone);

        assertEquals(
                409,
                call(
                        "PATCH",
                        "/api/v1/me",
                        login(otherPhone),
                        Map.of("phone", phone)
                ).status
        );

        String concurrentPhone = phone();
        var executor = Executors.newFixedThreadPool(2);

        try {
            var gate = new CountDownLatch(1);

            Callable<Result> task = () -> {
                gate.await();

                return call(
                        "POST",
                        "/api/v1/auth/register",
                        null,
                        Map.of(
                                "phone", concurrentPhone,
                                "password", PASSWORD
                        )
                );
            };

            var first = executor.submit(task);
            var second = executor.submit(task);

            gate.countDown();

            var results = List.of(
                    first.get(30, TimeUnit.SECONDS),
                    second.get(30, TimeUnit.SECONDS)
            );

            assertEquals(
                    List.of(201, 409),
                    results.stream()
                            .map(Result::status)
                            .sorted()
                            .toList()
            );

            for (var result : results) {
                if (result.status == 201) {
                    created.add(
                            result.data
                                    .get("data")
                                    .get("account_id")
                                    .asLong()
                    );
                }
            }

            assertEquals(
                    1,
                    db.queryForObject(
                            "SELECT COUNT(*) FROM accounts WHERE phone=?",
                            Integer.class,
                            concurrentPhone
                    )
            );
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void addressesAreOwnedAndNeverAcceptActorFromClient() throws Exception {
        String firstPhone = phone();
        register(firstPhone);
        String firstToken = login(firstPhone);

        String secondPhone = phone();
        register(secondPhone);
        String secondToken = login(secondPhone);

        var added = call(
                "POST",
                "/api/v1/me/addresses",
                firstToken,
                Map.of("address_text", "Test address")
        );

        assertEquals(
                201,
                added.status
        );

        long addressId = added.data
                .get("data")
                .get("address_id")
                .asLong();

        String path = "/api/v1/me/addresses/" + addressId;

        assertEquals(
                404,
                call(
                        "PATCH",
                        path,
                        secondToken,
                        Map.of("address_text", "Other")
                ).status
        );

        assertEquals(
                404,
                call(
                        "DELETE",
                        path,
                        secondToken,
                        null
                ).status
        );

        assertEquals(
                400,
                call(
                        "POST",
                        "/api/v1/me/addresses",
                        firstToken,
                        Map.of(
                                "address_text", "Test",
                                "account_id", 999
                        )
                ).status
        );

        assertEquals(
                200,
                call(
                        "PATCH",
                        path,
                        firstToken,
                        Map.of("address_text", "Updated")
                ).status
        );

        assertEquals(
                204,
                call(
                        "DELETE",
                        path,
                        firstToken,
                        null
                ).status
        );
    }

    @Test
    void adminDoesNotInheritSuperadminAndRevocationAppliesImmediately()
            throws Exception {
        String phone = phone();
        long accountId = register(phone);

        grant(
                accountId,
                "ADMIN"
        );

        String token = login(phone);

        for (String path : List.of(
                "/api/v1/admin/staff-accounts",
                "/api/v1/admin/permissions",
                "/api/v1/admin/access-control"
        )) {
            assertEquals(
                    401,
                    call(
                            "GET",
                            path,
                            null,
                            null
                    ).status
            );

            assertEquals(
                    403,
                    call(
                            "GET",
                            path,
                            token,
                            null
                    ).status
            );
        }

        grant(
                accountId,
                "SUPERADMIN"
        );

        assertEquals(
                200,
                call(
                        "GET",
                        "/api/v1/admin/access-control",
                        token,
                        null
                ).status
        );

        db.update(
                """
                DELETE FROM account_roles
                WHERE account_id=?
                  AND role_id=(
                      SELECT role_id
                      FROM roles
                      WHERE code='SUPERADMIN'
                  )
                """,
                accountId
        );

        assertEquals(
                403,
                call(
                        "GET",
                        "/api/v1/admin/access-control",
                        token,
                        null
                ).status
        );
    }

    @Test
    void invalidExpiredAndIncompleteTokensAreRejected() throws Exception {
        String phone = phone();
        long accountId = register(phone);
        String token = login(phone);

        assertEquals(
                401,
                call(
                        "GET",
                        "/api/v1/me",
                        null,
                        null
                ).status
        );

        assertEquals(
                401,
                call(
                        "GET",
                        "/api/v1/me",
                        "not-a-jwt",
                        null
                ).status
        );

        String[] parts = token.split("\\.");

        parts[2] = (parts[2].startsWith("A") ? "B" : "A")
                + parts[2].substring(1);

        assertEquals(
                401,
                call(
                        "GET",
                        "/api/v1/me",
                        String.join(".", parts),
                        null
                ).status
        );

        for (String mode : List.of(
                "expired",
                "missing_exp",
                "missing_iat",
                "invalid_sub",
                "wrong_issuer"
        )) {
            var claims = JwtClaimsSet.builder()
                    .issuer(
                            mode.equals("wrong_issuer")
                                    ? "other"
                                    : "fido"
                    )
                    .subject(
                            mode.equals("invalid_sub")
                                    ? "abc"
                                    : Long.toString(accountId)
                    );

            if (!mode.equals("missing_iat")) {
                claims.issuedAt(
                        Instant.now().minusSeconds(600)
                );
            }

            if (!mode.equals("missing_exp")) {
                claims.expiresAt(
                        Instant.now().plusSeconds(
                                mode.equals("expired")
                                        ? -300
                                        : 300
                        )
                );
            }

            String invalidToken = encoder.encode(
                    JwtEncoderParameters.from(
                            JwsHeader.with(MacAlgorithm.HS256).build(),
                            claims.build()
                    )
            ).getTokenValue();

            assertEquals(
                    401,
                    call(
                            "GET",
                            "/api/v1/me",
                            invalidToken,
                            null
                    ).status,
                    mode
            );
        }
    }

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
                ).status
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
                ).status
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
                permissionResponse.status,
                permissionResponse.body
        );

        long permissionId = permissionResponse.data
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
                ).status
        );

        var permissionPage = call(
                "GET",
                "/api/v1/admin/permissions",
                token,
                null
        );

        assertEquals(
                200,
                permissionPage.status
        );

        assertEquals(
                20,
                permissionPage.data
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
                ).status
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
                roleResponse.status,
                roleResponse.body
        );

        long roleId = roleResponse.data
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
                ).status
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
                ).status
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
                ).status
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
                ).status
        );

        permissionIds.remove(permissionId);

        assertEquals(
                204,
                call(
                        "DELETE",
                        "/api/v1/admin/roles/" + roleId,
                        token,
                        null
                ).status
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

    @Test
    void staffQueriesRoleReplacementAndSystemRoleProtection()
            throws Exception {
        String token = root();
        String phone = phone();

        var added = call(
                "POST",
                "/api/v1/admin/staff-accounts",
                token,
                Map.of(
                        "phone", phone,
                        "password", PASSWORD
                )
        );

        assertEquals(
                201,
                added.status,
                added.body
        );

        long accountId = added.data
                .get("data")
                .get("account")
                .get("account_id")
                .asLong();

        created.add(accountId);

        long adminRoleId = db.queryForObject(
                "SELECT role_id FROM roles WHERE code='ADMIN'",
                Long.class
        );

        assertEquals(
                "ADMIN",
                added.data
                        .get("data")
                        .get("roles")
                        .get(0)
                        .get("code")
                        .asText()
        );

        assertEquals(
                200,
                call(
                        "GET",
                        "/api/v1/admin/staff-accounts/" + accountId,
                        token,
                        null
                ).status
        );

        var page = call(
                "GET",
                "/api/v1/admin/staff-accounts?q="
                        + phone
                        + "&role_id="
                        + adminRoleId,
                token,
                null
        );

        assertEquals(
                200,
                page.status
        );

        assertEquals(
                1,
                page.data
                        .get("meta")
                        .get("total")
                        .asInt()
        );

        assertEquals(
                20,
                page.data
                        .get("meta")
                        .get("page_size")
                        .asInt()
        );

        assertEquals(
                400,
                call(
                        "GET",
                        "/api/v1/admin/staff-accounts?page_size=101",
                        token,
                        null
                ).status
        );

        assertEquals(
                409,
                call(
                        "DELETE",
                        "/api/v1/admin/roles/" + adminRoleId,
                        token,
                        null
                ).status
        );

        assertEquals(
                200,
                call(
                        "PATCH",
                        "/api/v1/admin/staff-accounts/" + accountId,
                        token,
                        Map.of(
                                "email", "staff@example.test",
                                "role_ids", List.of()
                        )
                ).status
        );

        assertEquals(
                404,
                call(
                        "GET",
                        "/api/v1/admin/staff-accounts/" + accountId,
                        token,
                        null
                ).status
        );

        var me = call(
                "GET",
                "/api/v1/me",
                token,
                null
        );

        long rootId = me.data
                .get("data")
                .get("account")
                .get("account_id")
                .asLong();

        assertEquals(
                409,
                call(
                        "PATCH",
                        "/api/v1/admin/staff-accounts/" + rootId,
                        token,
                        Map.of("role_ids", List.of(adminRoleId))
                ).status
        );
    }

    @Test
    void bootstrapIsIdempotentAndDoesNotElevateExistingCustomer()
            throws Exception {
        String phone = phone();

        bootstrap.initialize(
                phone,
                PASSWORD
        );

        long accountId = db.queryForObject(
                "SELECT account_id FROM accounts WHERE phone=?",
                Long.class,
                phone
        );

        created.add(accountId);

        String hash = db.queryForObject(
                "SELECT password_hash FROM accounts WHERE account_id=?",
                String.class,
                accountId
        );

        bootstrap.initialize(
                phone,
                "Different-password"
        );

        assertEquals(
                hash,
                db.queryForObject(
                        "SELECT password_hash FROM accounts WHERE account_id=?",
                        String.class,
                        accountId
                )
        );

        assertEquals(
                1,
                db.queryForObject(
                        "SELECT COUNT(*) FROM account_roles WHERE account_id=?",
                        Integer.class,
                        accountId
                )
        );

        String customerPhone = phone();
        register(customerPhone);

        assertThrows(
                IllegalStateException.class,
                () -> bootstrap.initialize(
                        customerPhone,
                        PASSWORD
                )
        );
    }
}
