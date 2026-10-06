package com.fido.common.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fido.modules.product.service.ProductImageStorageException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.HandlerMapping;

@ExtendWith(OutputCaptureExtension.class)
class ApiExceptionHandlerTests {

    private final ApiExceptionHandler handler = new ApiExceptionHandler();

    @Test
    void imageConfigurationFailureLogsActionableSummaryAndRoute(CapturedOutput output)
            throws Exception {
        MockHttpServletRequest request = request(
                "POST",
                "/api/v1/admin/products/960003/images"
        );
        request.setQueryString("key=private");
        request.setAttribute(
                HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE,
                "/api/v1/admin/products/{productId}/images"
        );
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.handle(
                new ProductImageStorageException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Image storage is not configured"
                ),
                request,
                response
        );

        String logs = output.getOut();
        assertEquals(503, response.getStatus());
        assertTrue(logs.contains("Request failed: Image storage is not configured"));
        assertTrue(logs.contains("method=POST"));
        assertTrue(logs.contains("route=/api/v1/admin/products/{productId}/images"));
        assertTrue(logs.contains("status=503"));
        assertFalse(logs.contains("key=private"));
    }

    @Test
    void unexpectedFailureUsesSafeSummaryInsteadOfRawExceptionMessage(CapturedOutput output)
            throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.handle(
                new IllegalStateException("password=private"),
                request("GET", "/api/v1/catalog/products"),
                response
        );

        String logs = output.getOut();
        assertEquals(500, response.getStatus());
        assertTrue(logs.contains("Unexpected server failure while handling request"));
        assertTrue(logs.contains("exception=IllegalStateException"));
        assertTrue(logs.contains("origin="));
        assertFalse(logs.contains("password=private"));
    }

    @Test
    void databaseConflictKeepsStatusWithoutLoggingSqlDetails(CapturedOutput output)
            throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.handle(
                new DataIntegrityViolationException("SQL: secret column value"),
                request("POST", "/api/v1/admin/products"),
                response
        );

        String logs = output.getOut();
        assertEquals(409, response.getStatus());
        assertTrue(logs.contains("Database constraint rejected the request"));
        assertTrue(logs.contains("status=409"));
        assertFalse(logs.contains("secret column value"));
    }

    @Test
    void blankSafeMessageFallsBackToNonBlankServerSummary(CapturedOutput output)
            throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.handle(
                new BlankSafeException(),
                request("GET", "/api/v1/catalog/products"),
                response
        );

        String logs = output.getOut();
        assertEquals(500, response.getStatus());
        assertTrue(logs.contains("Unexpected server failure while handling request"));
        assertFalse(logs.contains("Request failed:  method="));
    }

    private MockHttpServletRequest request(String method, String uri) {
        return new MockHttpServletRequest(method, uri);
    }

    private static final class BlankSafeException extends RuntimeException
            implements SafeLogMessage {

        @Override
        public String logMessage() {
            return "   ";
        }
    }
}
