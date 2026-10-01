package com.fido.modules.order.service;

import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * Maps dynamic order actions to actor capabilities.
 * Business state validation remains in order policy/services.
 */
@Component("orderAuthorization")
public class OrderAuthorization {

    public boolean canExecute(
            Authentication authentication,
            String action
    ) {
        String permission = requiredPermission(action);

        return permission != null
                && (hasAuthority(authentication, "ROLE_SUPERADMIN")
                || hasAuthority(
                        authentication,
                        "PERMISSION_" + permission
                ));
    }

    public List<String> filterAllowed(
            Authentication authentication,
            List<String> actions
    ) {
        return actions.stream()
                .filter(action -> canExecute(authentication, action))
                .toList();
    }

    private String requiredPermission(String action) {
        if (action == null) {
            return null;
        }

        return switch (action) {
            case "CONFIRM", "PREPARE" ->
                    OrderPolicy.ORDER_PROCESS;
            case "SHIP", "RETRY_DELIVERY", "COMPLETE" ->
                    OrderPolicy.ORDER_FULFILLMENT;
            case "DELIVERY_FAILED", "CANCEL", "DELIVERY_RETURN_IN" ->
                    OrderPolicy.ORDER_EXCEPTION;
            default -> null;
        };
    }

    private boolean hasAuthority(
            Authentication authentication,
            String authority
    ) {
        return authentication != null
                && authentication.getAuthorities()
                        .stream()
                        .anyMatch(granted ->
                                authority.equals(granted.getAuthority())
                        );
    }
}
