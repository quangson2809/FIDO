package com.fido.modules.order.service;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.List;

@Component("orderAuthorization")
public class OrderAuthorization {
    public boolean canExecute(Authentication authentication, String action) {
        if (hasAuthority(authentication, "ROLE_SUPERADMIN")) return true;
        OrderAction command = OrderAction.fromWire(action);
        return command != null
                && hasAuthority(authentication, "PERMISSION_" + command.permission());
    }

    public List<String> filterAllowed(Authentication authentication, List<String> actions) {
        return actions.stream().filter(action -> canExecute(authentication, action)).toList();
    }

    private boolean hasAuthority(Authentication authentication, String authority) {
        return authentication != null
                && authentication.getAuthorities().stream()
                        .anyMatch(granted -> authority.equals(granted.getAuthority()));
    }
}
