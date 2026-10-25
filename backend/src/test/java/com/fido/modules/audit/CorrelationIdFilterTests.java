package com.fido.modules.audit;

import static org.junit.jupiter.api.Assertions.*;

import com.fido.config.web.CorrelationIdFilter;
import com.fido.config.web.CorrelationIdContext;

import jakarta.servlet.FilterChain;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.atomic.AtomicReference;

class CorrelationIdFilterTests {

    @AfterEach
    void clearContext() {
        CorrelationIdContext.clear();
    }

    @Test
    void trimsValidHeaderAndClearsThreadContextAfterRequest() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(CorrelationIdContext.HEADER_NAME, " request:trace-1 ");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<String> seenInsideRequest = new AtomicReference<>();

        FilterChain chain =
                (ignoredRequest, ignoredResponse) ->
                        seenInsideRequest.set(CorrelationIdContext.current());

        new CorrelationIdFilter().doFilter(request, response, chain);

        assertEquals("request:trace-1", seenInsideRequest.get());
        assertNull(CorrelationIdContext.current());
        assertNull(response.getHeader(CorrelationIdContext.HEADER_NAME));
    }

    @Test
    void invalidHeaderIsReplacedWithOpaqueServerGeneratedId() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(CorrelationIdContext.HEADER_NAME, "forged\ntrace");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<String> seenInsideRequest = new AtomicReference<>();

        FilterChain chain =
                (ignoredRequest, ignoredResponse) ->
                        seenInsideRequest.set(CorrelationIdContext.current());

        new CorrelationIdFilter().doFilter(request, response, chain);

        String id = seenInsideRequest.get();
        assertNotNull(id);
        assertTrue(id.matches("[A-Za-z0-9._:-]{1,120}"));
        assertFalse(id.contains("forged"));
        assertNull(CorrelationIdContext.current());
    }
}
