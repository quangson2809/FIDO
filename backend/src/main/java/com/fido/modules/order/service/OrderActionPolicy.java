package com.fido.modules.order.service;

import com.fido.modules.inventory.service.InventoryMovementQueryService;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.Payment;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.stereotype.Service;

/**
 * Owns state-aware action visibility.
 * Actor capability authorization is enforced separately by OrderAuthorization.
 */
@Service
public class OrderActionPolicy {

    private final InventoryMovementQueryService movements;

    public OrderActionPolicy(
            InventoryMovementQueryService movements
    ) {
        this.movements = movements;
    }

    private static final List<String> ACTIONS = List.of(
            "CONFIRM", "PREPARE", "SHIP", "DELIVERY_FAILED", "RETRY_DELIVERY",
            "CANCEL", "COMPLETE", "DELIVERY_RETURN_IN");
    private static final Map<String, String> TARGETS = Map.of(
            "CONFIRM", OrderPolicy.CONFIRMED, "PREPARE", OrderPolicy.PREPARING,
            "SHIP", OrderPolicy.SHIPPING, "DELIVERY_FAILED", OrderPolicy.DELIVERY_FAILED,
            "RETRY_DELIVERY", OrderPolicy.SHIPPING, "CANCEL", OrderPolicy.CANCELLED,
            "COMPLETE", OrderPolicy.COMPLETED);

    public List<String> allowedActions(Order order, Payment payment) {
        return ACTIONS.stream().filter(action -> canApply(order, payment, action)).toList();
    }

    /** Returns false for an already-applied command; the caller must not repeat effects. */
    public boolean requireExecutable(Order order, Payment payment, String action) {
        if (!ACTIONS.contains(action)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
        String target = TARGETS.get(action);
        if (target != null && target.equals(order.getOrderStatus())) {
            return false;
        }
        if ("DELIVERY_RETURN_IN".equals(action)
                && OrderPolicy.DELIVERY_FAILED.equals(order.getOrderStatus())
                && movements.orderStockState(order.getOrderId()).deliveryReturned()) {
            return false;
        }
        if (!canApply(order, payment, action)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Order action is not allowed in the current state");
        }
        return true;
    }

    private boolean canApply(Order order, Payment payment, String action) {
        String status = order.getOrderStatus();
        if ("DELIVERY_RETURN_IN".equals(action)) {
            return OrderPolicy.DELIVERY_FAILED.equals(status)
                    && !movements.orderStockState(order.getOrderId()).deliveryReturned();
        }
        String target = TARGETS.get(action);
        if (!OrderPolicy.canTransition(status, target)) {
            return false;
        }
        return switch (action) {
            case "SHIP" -> OrderPolicy.PREPARING.equals(status);
            case "RETRY_DELIVERY" -> OrderPolicy.DELIVERY_FAILED.equals(status)
                    && !movements.orderStockState(order.getOrderId()).deliveryReturned();
            case "COMPLETE" -> payment != null && OrderPolicy.PAID.equals(payment.getPaymentStatus());
            default -> true;
        };
    }
}
