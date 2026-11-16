package com.fido.config.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/** Chuẩn hóa/tạo mã liên kết tại đầu request để nối log; không trả mã này lại client. */
@Component
public class CorrelationIdFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        // Header chỉ dùng nếu hợp lệ; phạm vi tự đóng để luồng được tái sử dụng không mang mã của
        // request trước.
        try (CorrelationIdContext.Scope ignored =
                CorrelationIdContext.open(request.getHeader(CorrelationIdContext.HEADER_NAME))) {
            filterChain.doFilter(request, response);
        }
    }
}
