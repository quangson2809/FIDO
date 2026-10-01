package com.fido.modules.order.service;

import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class OrderPolicy {

    public static final String PENDING = "PENDING";
    public static final String CONFIRMED = "CONFIRMED";
    public static final String PREPARING = "PREPARING";
    public static final String SHIPPING = "SHIPPING";
    public static final String COMPLETED = "COMPLETED";
    public static final String DELIVERY_FAILED = "DELIVERY_FAILED";
    public static final String CANCELLED = "CANCELLED";
    public static final String RETURNED = "RETURNED";

    public static final String UNPAID = "UNPAID";
    public static final String PAID = "PAID";
    public static final String REFUNDED = "REFUNDED";

    public static final String ORDER_CONFIRM_OUT = "ORDER_CONFIRM_OUT";
    public static final String ORDER_CANCEL_IN = "ORDER_CANCEL_IN";
    public static final String DELIVERY_RETURN_IN = "DELIVERY_RETURN_IN";

    public static final String ORDER_READ = "ORDER_READ";
    public static final String ORDER_EDIT = "ORDER_EDIT";
    public static final String ORDER_PROCESS = "ORDER_PROCESS";
    public static final String ORDER_FULFILLMENT = "ORDER_FULFILLMENT";
    public static final String ORDER_EXCEPTION = "ORDER_EXCEPTION";
    public static final String ORDER_PAYMENT = "ORDER_PAYMENT";
    public static final String ORDER_AFTER_SALES = "ORDER_AFTER_SALES";

    private static final Set<String> ORDER_STATUSES = Set.of(
            PENDING,
            CONFIRMED,
            PREPARING,
            SHIPPING,
            COMPLETED,
            DELIVERY_FAILED,
            CANCELLED,
            RETURNED
    );

    private static final Map<String, Set<String>> TRANSITIONS = Map.of(
            PENDING, Set.of(CONFIRMED, CANCELLED),
            CONFIRMED, Set.of(PREPARING, CANCELLED),
            PREPARING, Set.of(SHIPPING, CANCELLED),
            SHIPPING, Set.of(COMPLETED, DELIVERY_FAILED),
            DELIVERY_FAILED, Set.of(SHIPPING, CANCELLED),
            COMPLETED, Set.of(RETURNED),
            CANCELLED, Set.of(),
            RETURNED, Set.of()
    );

    private OrderPolicy() {
    }

    public static void requireOrderStatus(String status) {
        if (!ORDER_STATUSES.contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
    }

    public static boolean canTransition(
            String from,
            String to
    ) {
        return TRANSITIONS
                .getOrDefault(from, Set.of())
                .contains(to);
    }

    public static boolean recipientEditable(String status) {
        return Set.of(
                PENDING,
                CONFIRMED,
                PREPARING
        ).contains(status);
    }
}
