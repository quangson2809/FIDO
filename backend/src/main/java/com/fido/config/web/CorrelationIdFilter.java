package com.fido.config.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/** Normalizes or generates one correlation ID at the HTTP boundary without echoing it to clients. */
@Component
public class CorrelationIdFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {
        try (CorrelationIdContext.Scope ignored =
                CorrelationIdContext.open(
                        request.getHeader(CorrelationIdContext.HEADER_NAME))) {
            filterChain.doFilter(request, response);
        }
    }
}
