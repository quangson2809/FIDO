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

/** Keeps the existing Boot /error response and records a safe operational diagnosis. */
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
                exception.getClass(), ResponseStatus.class
        );
        return responseStatus == null ? 500 : responseStatus.code().value();
    }

    private void logFailure(Exception exception, HttpServletRequest request, int status) {
        Object matchedRoute = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        String route = matchedRoute instanceof String pattern ? pattern : "unmapped";
        String summary = summary(exception, status);
        String type = exception.getClass().getSimpleName();

        if (status >= 500) {
            StackTraceElement[] frames = exception.getStackTrace();
            String origin = frames.length == 0 ? "unknown" : frames[0].toString();
            log.error(
                    "Request failed: {} method={} route={} status={} exception={} origin={}",
                    summary, request.getMethod(), route, status, type, origin
            );
        } else {
            log.warn(
                    "Request rejected: {} method={} route={} status={} exception={}",
                    summary, request.getMethod(), route, status, type
            );
        }
    }

    private String summary(Exception exception, int status) {
        if (exception instanceof SafeLogMessage safe) {
            return safe.logMessage();
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
}
