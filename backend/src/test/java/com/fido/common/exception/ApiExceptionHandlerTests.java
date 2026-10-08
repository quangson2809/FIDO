package com.fido.common.exception;

import static org.junit.jupiter.api.Assertions.*;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.HandlerMapping;

@ExtendWith(OutputCaptureExtension.class)
class ApiExceptionHandlerTests {
    @Test
    void lockConflictHasSafeMessageContextAndOriginalStack(CapturedOutput output) throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/v1/admin/orders/42/actions");
        request.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, "/api/v1/admin/orders/{orderId}/actions");
        request.setAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE, Map.of("orderId", "42"));
        request.addHeader("Authorization", "Bearer secret-token");
        request.setQueryString("phone=secret-phone");
        var response = new MockHttpServletResponse();
        new ApiExceptionHandler().handle(new CannotAcquireLockException("password=secret-password", new IllegalStateException("secret-provider-key")), request, response);
        assertEquals(409, response.getStatus());
        assertTrue(output.getAll().contains("Database concurrency conflict"));
        assertTrue(output.getAll().contains("orderId=42"));
        assertTrue(output.getAll().contains("lockConflictHasSafeMessageContextAndOriginalStack"));
        for (String secret : new String[]{"secret-token", "secret-phone", "secret-password", "secret-provider-key"}) {
            assertFalse(output.getAll().contains(secret));
        }
        assertEquals("", response.getContentAsString());
    }

    @Test
    void unexpectedFailureRemains500(CapturedOutput output) throws Exception {
        var response = new MockHttpServletResponse();
        new ApiExceptionHandler().handle(new IllegalStateException("private data"), new MockHttpServletRequest("GET", "/test"), response);
        assertEquals(500, response.getStatus());
        assertTrue(output.getAll().contains("Unexpected server failure"));
        assertFalse(output.getAll().contains("private data"));
    }
}
