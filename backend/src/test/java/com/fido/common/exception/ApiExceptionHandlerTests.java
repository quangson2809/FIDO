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
        var request = request("POST", "/api/v1/admin/products/960003/images?key=private");
        request.setAttribute(
                HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE,
                "/api/v1/admin/products/{productId}/images"
        );
        var response = new MockHttpServletResponse();

        handler.handle(
                new ProductImageStorageException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Image storage is not configured"
                ),
                request,
                response
        );

        assertEquals(503, response.getStatus());
        assertTrue(output.getOut().contains("Image storage is not configured"));
        assertTrue(output.getOut().contains("method=POST"));
        assertTrue(output.getOut().contains(
                "route=/api/v1/admin/products/{productId}/images"
        ));
        assertTrue(output.getOut().contains("status=503"));
        assertFalse(output.getOut().contains("key=private"));
    }

    @Test
    void unexpectedFailureLogsLocationButNotRawExceptionMessage(CapturedOutput output)
            throws Exception {
        var response = new MockHttpServletResponse();

        handler.handle(
                new IllegalStateException("password=private"),
                request("GET", "/api/v1/catalog/products?q=secret"),
                response
        );

        assertEquals(500, response.getStatus());
        assertTrue(output.getOut().contains("Unexpected server failure while handling request"));
        assertTrue(output.getOut().contains("exception=IllegalStateException"));
        assertTrue(output.getOut().contains("origin="));
        assertFalse(output.getOut().contains("password=private"));
        assertFalse(output.getOut().contains("q=secret"));
    }

    @Test
    void databaseConflictKeepsStatusWithoutLoggingSqlDetails(CapturedOutput output)
            throws Exception {
        var response = new MockHttpServletResponse();

        handler.handle(
                new DataIntegrityViolationException("SQL: secret column value"),
                request("POST", "/api/v1/admin/products"),
                response
        );

        assertEquals(409, response.getStatus());
        assertTrue(output.getOut().contains("Database constraint rejected the request"));
        assertTrue(output.getOut().contains("status=409"));
        assertFalse(output.getOut().contains("secret column value"));
    }

    private MockHttpServletRequest request(String method, String uri) {
        var request = new MockHttpServletRequest(method, uri);
        return request;
    }
}
