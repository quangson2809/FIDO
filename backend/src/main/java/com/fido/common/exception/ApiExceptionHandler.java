package com.fido.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.servlet.HandlerMapping;

/**
 * Keeps the existing Boot /error response while recording safe operational context.
 */
@ControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(Exception.class)
    public void handle(
            Exception exception,
            HttpServletRequest request,
            HttpServletResponse response
    ) throws IOException {
        int status = status(exception);
        logFailure(exception, request, status);
        response.sendError(status);
    }

    private int status(Exception exception) {
        if (exception instanceof InvalidPaginationException
                || exception instanceof HttpMessageNotReadableException
                || exception instanceof TypeMismatchException) {
            return 400;
        }
        if (exception instanceof DataIntegrityViolationException) {
            return 409;
        }
        if (exception instanceof AccessDeniedException) {
            return 403;
        }
        if (exception instanceof ErrorResponse error) {
            return error.getStatusCode().value();
        }

        ResponseStatus responseStatus = AnnotatedElementUtils.findMergedAnnotation(
                exception.getClass(),
                ResponseStatus.class
        );
        return responseStatus == null ? 500 : responseStatus.code().value();
    }

    private void logFailure(
            Exception exception,
            HttpServletRequest request,
            int status
    ) {
        String summary = summary(exception, status);
        String method = request.getMethod();
        String route = matchedRoute(request);
        String exceptionType = exception.getClass().getSimpleName();

        if (status >= 500) {
            log.error(
                    "Request failed: {} method={} route={} status={} exception={} origin={}",
                    summary,
                    method,
                    route,
                    status,
                    exceptionType,
                    origin(exception)
            );
            return;
        }

        log.warn(
                "Request rejected: {} method={} route={} status={} exception={}",
                summary,
                method,
                route,
                status,
                exceptionType
        );
    }

    private String summary(Exception exception, int status) {
        if (exception instanceof SafeLogMessage safeLogMessage) {
            String safeMessage = safeLogMessage.logMessage();
            if (safeMessage != null && !safeMessage.isBlank()) {
                return safeMessage.trim();
            }
        }
        if (exception instanceof InvalidPaginationException) {
            return "Invalid pagination bounds";
        }
        if (exception instanceof HttpMessageNotReadableException
                || exception instanceof TypeMismatchException) {
            return "Request body or parameter could not be parsed";
        }
        if (exception instanceof DataIntegrityViolationException) {
            return "Database constraint rejected the request";
        }
        if (exception instanceof AccessDeniedException || status == 403) {
            return "Access denied for the requested operation";
        }
        if (status == 404) {
            return "Requested resource was not found";
        }
        if (status == 409) {
            return "Request conflicts with the current state";
        }
        if (status == 400) {
            return "Invalid request";
        }
        if (status >= 500) {
            return "Unexpected server failure while handling request";
        }
        return "Request could not be completed";
    }

    private String matchedRoute(HttpServletRequest request) {
        Object route = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        if (route instanceof String pattern && !pattern.isBlank()) {
            return pattern;
        }
        return "unmapped";
    }

    private String origin(Exception exception) {
        StackTraceElement[] frames = exception.getStackTrace();
        for (StackTraceElement frame : frames) {
            if (frame.getClassName().startsWith("com.fido.")) {
                return frame.toString();
            }
        }
        return frames.length == 0 ? "unknown" : frames[0].toString();
    }
}
