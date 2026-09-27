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

class AccountAuthorizationHttpTests extends AccountHttpSupport {

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
                    ).status()
            );

            assertEquals(
                    403,
                    call(
                            "GET",
                            path,
                            token,
                            null
                    ).status()
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
                ).status()
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
                ).status()
        );
    }
}
