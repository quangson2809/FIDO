package com.fido.modules.audit.service;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

@Component
public class AuditActorResolver {

    /** Chặn ghi sự kiện hệ thống với actor null nếu request đang có người dùng đăng nhập. */
    public void requireSystemContext() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)) {
            throw new IllegalStateException(
                    "A system audit event cannot be emitted with an authenticated principal");
        }
    }

    /** Chỉ lấy người thực hiện từ JWT đã xác thực; không tin ID trong DTO, sự kiện hay tham số nghiệp vụ. */
    public Long requireAuthenticatedAccountId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof JwtAuthenticationToken jwtAuthentication)
                || !authentication.isAuthenticated()) {
            throw new IllegalStateException(
                    "An authenticated JWT principal is required for a human audit event");
        }

        try {
            long accountId = Long.parseLong(jwtAuthentication.getToken().getSubject());
            if (accountId > 0) {
                return accountId;
            }
        } catch (RuntimeException ignored) {
            // Subject thiếu hoặc không hợp lệ không được dùng làm người thực hiện audit.
        }

        throw new IllegalStateException("The authenticated principal has no valid account ID");
    }
}
