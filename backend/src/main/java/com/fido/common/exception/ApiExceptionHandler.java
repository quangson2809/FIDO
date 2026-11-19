package com.fido.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatusCode;
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
import java.util.stream.Collectors;

/** Giữ cấu trúc lỗi HTTP thống nhất; chỉ trả mã công khai, giữ thông tin chẩn đoán ở máy chủ. */
@ControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);
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
                "method="
                        + request.getMethod()
                        + " route="
                        + (route == null ? "unmapped" : route)
                        + " ids="
                        + numericPathIds(request)
                        + " status="
                        + status;
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

    /** Bộ lọc bảo mật chạy trước MVC nên cần ghi phản hồi lỗi trực tiếp tại đây. */
    public void writeSecurityError(
            HttpServletRequest request, HttpServletResponse response, int status, String code)
            throws IOException {
        writeError(request, response, status, code);
    }

    /** Lỗi do bộ lọc hoặc máy chủ chuyển tiếp cũng dùng cùng thông báo công khai. */
    public void writeHttpError(HttpServletRequest request, HttpServletResponse response, int status)
            throws IOException {
        writeError(
                request,
                response,
                status,
                errorCode(
                        new ResponseStatusException(HttpStatusCode.valueOf(status)),
                        request,
                        status));
    }

    private void writeError(
            HttpServletRequest request, HttpServletResponse response, int status, String code)
            throws IOException {
        if (response.isCommitted()) {
            return;
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status);
        body.put("error", PublicErrorMessages.message(code));
        body.put("code", code);
        body.put("message", PublicErrorMessages.message(code));
        body.put("path", request.getRequestURI());
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        json.writeValue(response.getOutputStream(), body);
    }

    private int status(Exception exception) {
        if (exception instanceof BusinessRuleException business) {
            return business.kind() == BusinessRuleException.Kind.INVALID_INPUT ? 400 : 409;
        }
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
                AnnotatedElementUtils.findMergedAnnotation(
                        exception.getClass(), ResponseStatus.class);
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
        if (status < 500) {
            String code =
                    exception instanceof BusinessRuleException business
                            ? business.getMessage()
                            : exception instanceof ResponseStatusException responseStatus
                                    ? responseStatus.getReason()
                                    : null;
            if (PublicErrorMessages.contains(code)) return code;
        }
        if (status == 400 || status == 422) return "VALIDATION_ERROR";
        if (status == 404) return "RESOURCE_NOT_FOUND";
        if (status == 405) return "METHOD_NOT_ALLOWED";
        if (status == 413) return "UPLOAD_TOO_LARGE";
        if (status == 415) return "UNSUPPORTED_CONTENT";
        if (status == 429) return "TOO_MANY_REQUESTS";
        if (status == 409) return "CONFLICT";
        if (status >= 500) return "INTERNAL_ERROR";
        return "REQUEST_REJECTED";
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
            default ->
                    status >= 500
                            ? "Unexpected server failure while processing request"
                            : "Request was rejected";
        };
    }

    private String numericPathIds(HttpServletRequest request) {
        Object variables = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
        if (!(variables instanceof Map<?, ?> paths)) return "{}";
        return paths.entrySet().stream()
                .filter(
                        entry ->
                                entry.getValue() instanceof String value
                                        && value.matches("[0-9]{1,19}"))
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .collect(Collectors.joining(",", "{", "}"));
    }

    private Throwable diagnosticTrace(Throwable failure, int depth) {
        // Thông báo lỗi gốc có thể chứa tham số SQL, mật khẩu hoặc URL/token của dịch vụ ngoài.
        Throwable safe = new Throwable(failure.getClass().getName());
        safe.setStackTrace(failure.getStackTrace());
        if (failure.getCause() != null && failure.getCause() != failure && depth < 8) {
            safe.initCause(diagnosticTrace(failure.getCause(), depth + 1));
        }
        return safe;
    }
}
