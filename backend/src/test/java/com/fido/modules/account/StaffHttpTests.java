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

class StaffHttpTests extends AccountHttpSupport {

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
                added.status(),
                added.body()
        );

        long accountId = added.data()
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
                added.data()
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
                ).status()
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
                page.status()
        );

        assertEquals(
                1,
                page.data()
                        .get("meta")
                        .get("total")
                        .asInt()
        );

        assertEquals(
                20,
                page.data()
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
                ).status()
        );

        assertEquals(
                409,
                call(
                        "DELETE",
                        "/api/v1/admin/roles/" + adminRoleId,
                        token,
                        null
                ).status()
        );

        assertEquals(400, call("PATCH", "/api/v1/admin/staff-accounts/" + accountId,
                token, Map.of("email", "staff@example.test", "role_ids", List.of())).status());
        String customCode = "NON_STAFF_" + UUID.randomUUID();
        db.update("INSERT INTO roles (code, name) VALUES (?, ?)", customCode, "Non-staff test role");
        long customerRoleId = db.queryForObject("SELECT role_id FROM roles WHERE code=?", Long.class, customCode);
        roleIds.add(customerRoleId);
        assertEquals(400, call("PATCH", "/api/v1/admin/staff-accounts/" + accountId,
                token, Map.of("role_ids", List.of(customerRoleId))).status());
        var unchanged = call("GET", "/api/v1/admin/staff-accounts/" + accountId, token, null);
        assertEquals(200, unchanged.status());
        assertEquals("ADMIN", unchanged.data().get("data").get("roles").get(0).get("code").asText());
        assertEquals(0, db.queryForObject("SELECT COUNT(*) FROM accounts WHERE account_id=? AND email='staff@example.test'", Integer.class, accountId));

        var me = call(
                "GET",
                "/api/v1/me",
                token,
                null
        );

        long rootId = me.data()
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
                ).status()
        );
    }
}
