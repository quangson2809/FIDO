package com.fido.common;

import com.fido.common.response.ApiResponse;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(ApiFoundationHttpTests.Fixture.class)
class ApiFoundationHttpTests {
    @LocalServerPort int port;
    private final HttpClient client = HttpClient.newHttpClient();

    private HttpResponse<String> get(String path) throws Exception {
        return client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Accept", "application/json").GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void httpSerializationUsesSnakeCaseAndDataEnvelope() throws Exception {
        var response = get("/api/v1/catalog/__test/object");
        assertEquals(200, response.statusCode());
        assertEquals("{\"data\":{\"account_id\":7}}", response.body());
    }

    @Test
    void centralizedErrorsKeepFrameworkStatusAndHideInternals() throws Exception {
        for (String route : new String[]{"failure", "missing"}) {
            var response = get("/api/v1/catalog/__test/" + route + "?trace=true&message=true");
            assertEquals(route.equals("failure") ? 500 : 404, response.statusCode());
            assertFalse(response.body().contains("PRIVATE_SQL_DETAIL"));
            assertFalse(response.body().contains("IllegalStateException"));
            assertFalse(response.body().contains("\"trace\""));
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class Fixture {
        @Bean SampleController sampleController() { return new SampleController(); }
    }

    @RestController
    static class SampleController {
        record Sample(long accountId) {}

        @GetMapping("/api/v1/catalog/__test/object")
        ApiResponse<Sample> object() { return ApiResponse.of(new Sample(7)); }

        @GetMapping("/api/v1/catalog/__test/failure")
        void failure() { throw new IllegalStateException("PRIVATE_SQL_DETAIL"); }

        @GetMapping("/api/v1/catalog/__test/missing")
        void missing() { throw new ResponseStatusException(HttpStatus.NOT_FOUND, "PRIVATE_SQL_DETAIL"); }
    }
}
