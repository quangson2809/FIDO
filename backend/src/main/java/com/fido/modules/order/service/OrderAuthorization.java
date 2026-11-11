package com.fido.modules.order.service;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.List;

@Component("orderAuthorization")
public class OrderAuthorization {
    public boolean canExecute(Authentication authentication, String action) {
        if (hasAuthority(authentication, "ROLE_SUPERADMIN")) return true;
        return requiredPermission(action) != null
                && hasAuthority(authentication, "PERMISSION_ORDER_EDIT");
    }

    public List<String> filterAllowed(Authentication authentication, List<String> actions) {
        return actions.stream().filter(action -> canExecute(authentication, action)).toList();
    }

    private String requiredPermission(String action) {
        return switch (action == null ? "" : action) {
            case "CONFIRM", "START_PREPARING", "DISPATCH",
                    "MARK_DELIVERY_FAILED", "RETRY_DELIVERY", "CANCEL" -> OrderPolicy.ORDER_EDIT;
            default -> null;
        };
    }

    private boolean hasAuthority(Authentication authentication, String authority) {
        return authentication != null
                && authentication.getAuthorities().stream()
                        .anyMatch(granted -> authority.equals(granted.getAuthority()));
    }
}
