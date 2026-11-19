package com.fido.config.web;

import com.fido.common.exception.ApiExceptionHandler;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.boot.webmvc.error.ErrorController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

/** Không để phản hồi lỗi mặc định trả tiếng Anh hoặc chi tiết từ máy chủ. */
@RestController
public class PublicErrorController implements ErrorController {
    private final ApiExceptionHandler errors;

    public PublicErrorController(ApiExceptionHandler errors) {
        this.errors = errors;
    }

    @RequestMapping("/error")
    public void error(HttpServletRequest request, HttpServletResponse response) throws IOException {
        Object value = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        int status = value instanceof Integer code && code >= 400 && code <= 599 ? code : 500;
        errors.writeHttpError(request, response, status);
    }
}
