package com.fido.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.TypeMismatchException;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerMapping;

import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Extends the existing top-level HTTP error shape with stable public codes; diagnostics stay internal. */
@ControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private static final Set<String> PUBLIC_CODES = Set.of(
            "INVALID_CREDENTIALS", "UNAUTHENTICATED", "FORBIDDEN", "ACCOUNT_NOT_ACTIVE",
            "VALIDATION_ERROR", "RESOURCE_NOT_FOUND", "PHONE_ALREADY_IN_USE",
            "ROLE_CODE_ALREADY_EXISTS", "PERMISSION_CODE_ALREADY_EXISTS",
            "LAST_SUPERADMIN_REQUIRED", "ROLE_IN_USE", "PERMISSION_IN_USE",
            "SYSTEM_ROLE_PROTECTED", "SYSTEM_PERMISSION_PROTECTED", "ACCOUNT_STATE_CONFLICT",
            "CART_SELECTION_AMBIGUOUS", "CART_ITEM_NOT_FOUND", "PRODUCT_NOT_AVAILABLE");

    private final ObjectMapper json;

    public ApiExceptionHandler() {
        this(new ObjectMapper());
    }

    @Autowired
    public ApiExceptionHandler(ObjectMapper json) {
        this.json = json;
    }

    @ExceptionHandler(Exception.class)
    public void handle(
            Exception exception, HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        int status = status(exception);
        String diagnosticMessage = diagnosticMessage(exception, status);
        Object route = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        String context =
                "method=" + request.getMethod()
                        + " route=" + (route == null ? "unmapped" : route)
                        + " ids=" + numericPathIds(request)
                        + " status=" + status;
        if (status >= 500) {
            log.error("{}; {}", diagnosticMessage, context, diagnosticTrace(exception, 0));
        } else if (exception instanceof ConcurrencyFailureException
                || exception instanceof DataIntegrityViolationException) {
            log.warn("{}; {}", diagnosticMessage, context, diagnosticTrace(exception, 0));
        } else {
            log.warn("{}; {}", diagnosticMessage, context);
        }
        writeError(request, response, status, errorCode(exception, request, status));
    }

    /** Used by the security filter chain, where MVC exception advice is not invoked. */
    public void writeSecurityError(
            HttpServletRequest request, HttpServletResponse response, int status, String code)
            throws IOException {
        writeError(request, response, status, code);
    }

    private void writeError(
            HttpServletRequest request, HttpServletResponse response, int status, String code)
            throws IOException {
        if (response.isCommitted()) {
            return;
        }
        HttpStatus httpStatus = HttpStatus.resolve(status);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status);
        body.put("error", httpStatus == null ? "Request Rejected" : httpStatus.getReasonPhrase());
        body.put("code", code);
        body.put("message", publicMessage(code, status));
        body.put("path", request.getRequestURI());
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        json.writeValue(response.getOutputStream(), body);
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
        ResponseStatus annotation =
                AnnotatedElementUtils.findMergedAnnotation(exception.getClass(), ResponseStatus.class);
        return annotation == null ? 500 : annotation.code().value();
    }

    private String errorCode(Exception exception, HttpServletRequest request, int status) {
        String path = request.getRequestURI();
        if (status == 401) {
            return path.equals("/api/v1/auth/login") ? "INVALID_CREDENTIALS" : "UNAUTHENTICATED";
        }
        if (status == 403) {
            if (exception instanceof ResponseStatusException responseStatus
                    && "ACCOUNT_NOT_ACTIVE".equals(responseStatus.getReason())) {
                return "ACCOUNT_NOT_ACTIVE";
            }
            return "FORBIDDEN";
        }
        if (status == 400) return "VALIDATION_ERROR";
        if (status == 404) {
            if (exception instanceof ResponseStatusException responseStatus) {
                String reason = responseStatus.getReason();
                if (reason != null && PUBLIC_CODES.contains(reason)) return reason;
            }
            return "RESOURCE_NOT_FOUND";
        }
        if (status == 409) {
            if (exception instanceof ResponseStatusException responseStatus) {
                String reason = responseStatus.getReason();
                if (reason != null && PUBLIC_CODES.contains(reason)) return reason;
            }
            if (path.equals("/api/v1/auth/register")) return "PHONE_ALREADY_IN_USE";
            if (request.getMethod().equals("POST") && path.equals("/api/v1/admin/roles")) {
                return "ROLE_CODE_ALREADY_EXISTS";
            }
            if (request.getMethod().equals("POST") && path.equals("/api/v1/admin/permissions")) {
                return "PERMISSION_CODE_ALREADY_EXISTS";
            }
            return "CONFLICT";
        }
        if (status >= 500) return "INTERNAL_ERROR";
        return "REQUEST_REJECTED";
    }

    private String publicMessage(String code, int status) {
        return switch (code) {
            case "INVALID_CREDENTIALS" -> "Phone or password is invalid.";
            case "UNAUTHENTICATED" -> "Authentication is required or the access token is invalid.";
            case "FORBIDDEN" -> "Access to the requested operation was denied.";
            case "ACCOUNT_NOT_ACTIVE" -> "Account is not active.";
            case "VALIDATION_ERROR" -> "Request validation or format is invalid.";
            case "RESOURCE_NOT_FOUND" -> "Requested resource was not found.";
            case "PHONE_ALREADY_IN_USE" -> "Phone number is already in use.";
            case "ROLE_CODE_ALREADY_EXISTS" -> "Role code already exists.";
            case "PERMISSION_CODE_ALREADY_EXISTS" -> "Permission code already exists.";
            case "LAST_SUPERADMIN_REQUIRED" -> "At least one active SUPERADMIN must remain.";
            case "ROLE_IN_USE" -> "Role is still assigned to an account.";
            case "PERMISSION_IN_USE" -> "Permission is still granted to a business role.";
            case "SYSTEM_ROLE_PROTECTED" -> "The requested system role mutation is protected.";
            case "SYSTEM_PERMISSION_PROTECTED" -> "The requested system permission is protected.";
            case "ACCOUNT_STATE_CONFLICT" -> "The account state transition conflicts with current state.";
            case "CART_SELECTION_AMBIGUOUS" -> "Exactly one OPEN cart is required for this operation.";
            case "CART_ITEM_NOT_FOUND" -> "Cart item was not found in the current OPEN cart.";
            case "PRODUCT_NOT_AVAILABLE" -> "Product is not available for sale.";
            case "CONFLICT" -> "Operation conflicts with the current resource state.";
            case "INTERNAL_ERROR" -> "Unexpected server failure while processing request.";
            case "NOT_IMPLEMENTED" -> "Requested operation is not implemented.";
            default -> status >= 500
                    ? "Unexpected server failure while processing request."
                    : "Request was rejected.";
        };
    }

    private String diagnosticMessage(Exception exception, int status) {
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
            default -> status >= 500
                    ? "Unexpected server failure while processing request"
                    : "Request was rejected";
        };
    }

    private String numericPathIds(HttpServletRequest request) {
        Object variables = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
        if (!(variables instanceof Map<?, ?> paths)) return "{}";
        return paths.entrySet().stream()
                .filter(entry -> entry.getValue() instanceof String value
                        && value.matches("[0-9]{1,19}"))
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .collect(Collectors.joining(",", "{", "}"));
    }

    private Throwable diagnosticTrace(Throwable failure, int depth) {
        // Raw exception messages can contain SQL bind values, passwords or provider URLs/tokens.
        Throwable safe = new Throwable(failure.getClass().getName());
        safe.setStackTrace(failure.getStackTrace());
        if (failure.getCause() != null && failure.getCause() != failure && depth < 8) {
            safe.initCause(diagnosticTrace(failure.getCause(), depth + 1));
        }
        return safe;
    }
}
