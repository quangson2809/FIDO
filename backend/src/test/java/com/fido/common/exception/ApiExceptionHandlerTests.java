package com.fido.common.exception;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.HandlerMapping;

import tools.jackson.databind.ObjectMapper;

import java.util.Map;

@ExtendWith(OutputCaptureExtension.class)
class ApiExceptionHandlerTests {
    @ParameterizedTest
    @CsvSource({
        "INVALID_INPUT, VOUCHER_CONFIGURATION_INVALID, 400",
        "CONFLICT, SYSTEM_ROLE_PROTECTED, 409",
        "CONFLICT, VOUCHER_NOT_ELIGIBLE, 409"
    })
    void businessRejectionsKeepTheExistingHttpEnvelope(
            BusinessRuleException.Kind kind, String code, int status) throws Exception {
        var request = new MockHttpServletRequest("PATCH", "/api/v1/admin/vouchers/5");
        var before = new MockHttpServletResponse();
        var after = new MockHttpServletResponse();
        var handler = new ApiExceptionHandler();
        handler.handle(
                new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.valueOf(status), code),
                request,
                before);
        handler.handle(
                kind == BusinessRuleException.Kind.INVALID_INPUT
                        ? BusinessRuleException.invalid(code)
                        : BusinessRuleException.conflict(code),
                request,
                after);
        assertEquals(before.getStatus(), after.getStatus());
        var json = new ObjectMapper();
        var beforeBody = json.readTree(before.getContentAsString());
        var afterBody = json.readTree(after.getContentAsString());
        for (String field : new String[] {"status", "error", "code", "message", "path"}) {
            assertEquals(beforeBody.get(field), afterBody.get(field));
        }
    }

    @Test
    void lockConflictHasSafeMessageContextAndOriginalStack(CapturedOutput output) throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/v1/admin/orders/42/actions");
        request.setAttribute(
                HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE,
                "/api/v1/admin/orders/{orderId}/actions");
        request.setAttribute(
                HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE, Map.of("orderId", "42"));
        request.addHeader("Authorization", "Bearer secret-token");
        request.setQueryString("phone=secret-phone");
        var response = new MockHttpServletResponse();
        new ApiExceptionHandler()
                .handle(
                        new CannotAcquireLockException(
                                "password=secret-password",
                                new IllegalStateException("secret-provider-key")),
                        request,
                        response);
        assertEquals(409, response.getStatus());
        assertTrue(output.getAll().contains("Database concurrency conflict"));
        assertTrue(output.getAll().contains("orderId=42"));
        assertTrue(output.getAll().contains("lockConflictHasSafeMessageContextAndOriginalStack"));
        for (String secret :
                new String[] {
                    "secret-token", "secret-phone", "secret-password", "secret-provider-key"
                }) {
            assertFalse(output.getAll().contains(secret));
        }
        var body = new ObjectMapper().readTree(response.getContentAsString());
        assertEquals("CONFLICT", body.get("code").asText());
        assertEquals(409, body.get("status").asInt());
        for (String secret :
                new String[] {
                    "secret-token", "secret-phone", "secret-password", "secret-provider-key"
                }) {
            assertFalse(response.getContentAsString().contains(secret));
        }
    }

    @Test
    void unexpectedFailureRemains500(CapturedOutput output) throws Exception {
        var response = new MockHttpServletResponse();
        new ApiExceptionHandler()
                .handle(
                        new IllegalStateException("private data"),
                        new MockHttpServletRequest("GET", "/test"),
                        response);
        assertEquals(500, response.getStatus());
        assertTrue(output.getAll().contains("Unexpected server failure"));
        assertFalse(output.getAll().contains("private data"));
        var body = new ObjectMapper().readTree(response.getContentAsString());
        assertEquals("INTERNAL_ERROR", body.get("code").asText());
        assertFalse(response.getContentAsString().contains("private data"));
    }

    @ParameterizedTest
    @CsvSource({
        "400, VALIDATION_ERROR", "404, RESOURCE_NOT_FOUND", "409, CONFLICT",
        "413, UPLOAD_TOO_LARGE", "415, UNSUPPORTED_CONTENT", "429, TOO_MANY_REQUESTS",
        "500, INTERNAL_ERROR", "502, INTERNAL_ERROR"
    })
    void unknownReasonsNeverEscapeForAnyApi(int status, String expectedCode) throws Exception {
        for (String path :
                new String[] {
                    "/api/v1/checkout/quote",
                    "/api/v1/orders",
                    "/api/v1/admin/vouchers",
                    "/api/v1/admin/products"
                }) {
            var response = new MockHttpServletResponse();
            new ApiExceptionHandler()
                    .handle(
                            new org.springframework.web.server.ResponseStatusException(
                                    org.springframework.http.HttpStatus.valueOf(status),
                                    "java.sql.SQLException SELECT password_hash FROM accounts secret-value"),
                            new MockHttpServletRequest("POST", path),
                            response);
            var body = new ObjectMapper().readTree(response.getContentAsString());
            assertEquals(status, response.getStatus());
            assertEquals(expectedCode, body.get("code").asText());
            assertTrue(body.get("message").asText().matches(".*[À-ỹ].*"));
            assertEquals(body.get("message"), body.get("error"));
            assertFalse(response.getContentAsString().contains("SELECT"));
            assertFalse(response.getContentAsString().contains("secret-value"));
        }
    }

    @Test
    void businessCodeSurvivesTranslationWithVietnameseGuidance() throws Exception {
        var response = new MockHttpServletResponse();
        new ApiExceptionHandler()
                .handle(
                        BusinessRuleException.invalid("VOUCHER_PERCENT_BPS_OUT_OF_RANGE"),
                        new MockHttpServletRequest("POST", "/api/v1/admin/vouchers"),
                        response);
        var body = new ObjectMapper().readTree(response.getContentAsString());
        assertEquals(400, response.getStatus());
        assertEquals("VOUCHER_PERCENT_BPS_OUT_OF_RANGE", body.get("code").asText());
        assertEquals(
                "Tỷ lệ giảm giá phải lớn hơn 0% và không vượt quá 100%.",
                body.get("message").asText());
    }

    @Test
    void databaseAndFallbackErrorsDoNotExposePrivateDetails() throws Exception {
        var response = new MockHttpServletResponse();
        var request = new MockHttpServletRequest("POST", "/api/v1/orders");
        new ApiExceptionHandler()
                .handle(
                        new org.springframework.dao.DataIntegrityViolationException(
                                "INSERT INTO orders private-value",
                                new java.sql.SQLException("password_hash private-value")),
                        request,
                        response);
        assertEquals(409, response.getStatus());
        assertFalse(response.getContentAsString().contains("private-value"));
        request.setAttribute(jakarta.servlet.RequestDispatcher.ERROR_STATUS_CODE, 500);
        request.setAttribute(jakarta.servlet.RequestDispatcher.ERROR_MESSAGE, "private-value");
        var fallback = new MockHttpServletResponse();
        new com.fido.config.web.PublicErrorController(new ApiExceptionHandler())
                .error(request, fallback);
        assertEquals(500, fallback.getStatus());
        assertFalse(fallback.getContentAsString().contains("private-value"));
        assertTrue(fallback.getContentAsString().contains("Chưa thể hoàn tất thao tác"));
    }
}
