package com.fido.common.exception;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Uses the existing Boot /error renderer; does not define a new public error DTO. */
@ControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(Exception.class)
    public void handle(Exception exception, HttpServletResponse response) throws IOException {
        if (exception instanceof org.springframework.http.converter.HttpMessageNotReadableException
                || exception instanceof org.springframework.beans.TypeMismatchException) {
            response.sendError(400); return;
        }
        if (exception instanceof org.springframework.dao.DataIntegrityViolationException) {
            response.sendError(409); return;
        }
        if (exception instanceof org.springframework.security.access.AccessDeniedException) {
            response.sendError(403); return;
        }
        if (exception instanceof ErrorResponse error) {
            response.sendError(error.getStatusCode().value());
            return;
        }
        ResponseStatus status = AnnotatedElementUtils.findMergedAnnotation(
                exception.getClass(), ResponseStatus.class);
        response.sendError(status == null ? 500 : status.code().value());
    }
}
