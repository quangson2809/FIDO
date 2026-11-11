package com.fido.modules.audit.service;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

@Component
public class AuditActorResolver {

    /**
     * Prevents a request carrying an authenticated human identity from being recorded as a
     * NULL-actor system event. The caller of the system entry point must still be trusted code.
     */
    public void requireSystemContext() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)) {
            throw new IllegalStateException(
                    "A system audit event cannot be emitted with an authenticated principal");
        }
    }

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
