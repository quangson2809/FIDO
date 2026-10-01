package com.fido.modules.cart;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

class CartAccessHttpTests extends CartHttpSupport {

    @Test
    void cartAndQuoteRequireAuthenticationAndCartStartsEmpty()
            throws Exception {
        User owner = user();

        assertEquals(
                401,
                call(
                        "GET",
                        "/api/v1/cart",
                        null,
                        null
                ).status()
        );

        assertEquals(
                401,
                call(
                        "POST",
                        "/api/v1/checkout/quote",
                        null,
                        Map.of(
                                "recipient_phone", "0900000000",
                                "recipient_address", "Hanoi"
                        )
                ).status()
        );

        var initial = call(
                "GET",
                "/api/v1/cart",
                owner.token(),
                null
        );

        assertEquals(
                200,
                initial.status(),
                initial.body()
        );

        assertEquals(
                owner.accountId(),
                initial.data()
                        .get("data")
                        .get("account_id")
                        .asLong()
        );

        assertEquals(
                0,
                initial.data()
                        .get("data")
                        .get("items")
                        .size()
        );

        assertEquals(
                0,
                initial.data()
                        .get("data")
                        .get("subtotal")
                        .asInt()
        );

        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM carts WHERE account_id=?",
                        Integer.class,
                        owner.accountId()
                )
        );
    }
}
