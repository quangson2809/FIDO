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

class AddressHttpTests extends AccountHttpSupport {

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
}
