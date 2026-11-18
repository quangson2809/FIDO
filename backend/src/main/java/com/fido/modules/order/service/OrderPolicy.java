package com.fido.modules.order.service;

import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.Payment;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Set;

public final class OrderPolicy {

    public static final String PENDING = Order.PENDING;
    public static final String CONFIRMED = Order.CONFIRMED;
    public static final String PREPARING = Order.PREPARING;
    public static final String SHIPPING = Order.SHIPPING;
    public static final String COMPLETED = Order.COMPLETED;
    public static final String DELIVERY_FAILED = Order.DELIVERY_FAILED;
    public static final String CANCELLED = Order.CANCELLED;
    public static final String RETURNED = Order.RETURNED;

    public static final String UNPAID = Payment.UNPAID;
    public static final String PAID = Payment.PAID;
    public static final String REFUNDED = Payment.REFUNDED;

    public static final String ORDER_READ = "ORDER_READ";
    public static final String ORDER_EDIT = "ORDER_EDIT";
    public static final String ORDER_PAYMENT = "ORDER_PAYMENT";
    public static final String ORDER_AFTER_SALES = "ORDER_AFTER_SALES";

    private static final Set<String> ORDER_STATUSES =
            Set.of(
                    PENDING,
                    CONFIRMED,
                    PREPARING,
                    SHIPPING,
                    COMPLETED,
                    DELIVERY_FAILED,
                    CANCELLED,
                    RETURNED);

    private OrderPolicy() {}

    public static void requireOrderStatus(String status) {
        if (!ORDER_STATUSES.contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
    }

    public static boolean canTransition(String from, String to) {
        return Order.canTransition(from, to);
    }

    /**
     * completedAt nhận thời điểm thu COD trong Payment; now là giờ UTC hiện tại.
     * Chỉ chấp nhận thời điểm trả từ lúc giao đến hết hai ngày sau đó.
     */
    public static void requireReturnWithinWindow(LocalDateTime completedAt, LocalDateTime now) {
        if (completedAt == null
                || now.isBefore(completedAt)
                || now.isAfter(completedAt.plusDays(2))) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Return is outside the two-day window");
        }
    }
}
