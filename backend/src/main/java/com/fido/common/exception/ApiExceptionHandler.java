package com.fido.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.servlet.HandlerMapping;

/** Uses Boot's existing /error renderer; diagnostic details remain internal. */
@ControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(Exception.class)
    public void handle(Exception exception, HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        int status = status(exception);
        String message = message(exception, status);
        Object route = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        String context = "method=" + request.getMethod() + " route="
                + (route == null ? "unmapped" : route) + " ids=" + numericPathIds(request)
                + " status=" + status;
        if (status >= 500) {
            log.error("{}; {}", message, context, diagnosticTrace(exception, 0));
        } else if (exception instanceof ConcurrencyFailureException
                || exception instanceof DataIntegrityViolationException) {
            log.warn("{}; {}", message, context, diagnosticTrace(exception, 0));
        } else {
            log.warn("{}; {}", message, context);
        }
        response.sendError(status);
    }

    private int status(Exception exception) {
        if (exception instanceof InvalidPaginationException
                || exception instanceof HttpMessageNotReadableException
                || exception instanceof TypeMismatchException) {
            return 400;
        }
        if (exception instanceof ConcurrencyFailureException
                || exception instanceof DataIntegrityViolationException) {
            return 409;
        }
        if (exception instanceof AccessDeniedException) {
            return 403;
        }
        if (exception instanceof ErrorResponse error) {
            return error.getStatusCode().value();
        }
        ResponseStatus annotation = AnnotatedElementUtils.findMergedAnnotation(
                exception.getClass(), ResponseStatus.class);
        return annotation == null ? 500 : annotation.code().value();
    }

    private String message(Exception exception, int status) {
        if (exception instanceof ConcurrencyFailureException) {
            return "Database concurrency conflict: transaction could not acquire or retain its lock";
        }
        if (exception instanceof DataIntegrityViolationException) {
            return "Database write rejected by an integrity constraint";
        }
        return switch (status) {
            case 400 -> "Request validation or format is invalid";
            case 403 -> "Access to the requested operation was denied";
            case 404 -> "Requested resource was not found";
            case 409 -> "Operation conflicts with the current resource state";
            case 501 -> "Requested operation is not implemented";
            case 502 -> "Upstream service rejected the request or returned invalid data";
            case 503 -> "Required service is unavailable or not configured";
            case 504 -> "Upstream service request timed out";
            default -> status >= 500 ? "Unexpected server failure while processing request"
                    : "Request was rejected";
        };
    }

    private String numericPathIds(HttpServletRequest request) {
        Object variables = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
        if (!(variables instanceof Map<?, ?> paths)) {
            return "{}";
        }
        return paths.entrySet().stream()
                .filter(entry -> entry.getValue() instanceof String value && value.matches("[0-9]{1,19}"))
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .collect(Collectors.joining(",", "{", "}"));
    }

    private Throwable diagnosticTrace(Throwable failure, int depth) {
        // Raw exception messages can contain SQL bind values, passwords or provider URLs/tokens.
        // Retain type, original stack frames and cause chain without logging those messages.
        Throwable safe = new Throwable(failure.getClass().getName());
        safe.setStackTrace(failure.getStackTrace());
        if (failure.getCause() != null && failure.getCause() != failure && depth < 8) {
            safe.initCause(diagnosticTrace(failure.getCause(), depth + 1));
        }
        return safe;
    }
}
