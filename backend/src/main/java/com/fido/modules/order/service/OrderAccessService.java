package com.fido.modules.order.service;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Centralizes order capability checks against the authenticated principal.
 */
@Service
public class OrderAccessService {

    public boolean hasCapability(String permission) {
        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null) {
            return false;
        }

        return authentication.getAuthorities()
                .stream()
                .anyMatch(authority ->
                        "ROLE_SUPERADMIN".equals(authority.getAuthority())
                        || ("PERMISSION_" + permission)
                                .equals(authority.getAuthority())
                );
    }

    public void requireCapability(String permission) {
        if (!hasCapability(permission)) {
            throw new AccessDeniedException("Forbidden");
        }
    }
}
