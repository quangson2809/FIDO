package com.fido.modules.audit.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

@Component
public class AuditActorResolver {

    /**
     * Resolves a human actor only from the JWT authentication established by SecurityConfig.
     * Never accepts an actor ID from an audit event, request DTO or domain method parameter.
     */
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
            // Invalid or missing subject is not a valid audit actor.
        }

        throw new IllegalStateException("The authenticated principal has no valid account ID");
    }
}
