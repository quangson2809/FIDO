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

class SuperadminBootstrapHttpTests extends AccountHttpSupport {

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
