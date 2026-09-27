package com.fido.modules.order.service;

import com.fido.modules.inventory.service.InventoryCommandService;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.Payment;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Owns action-to-capability mapping and action visibility.
 * Transition execution stays in OrderActionService.
 */
@Service
public class OrderActionPolicy {

    private final OrderAccessService access;
    private final InventoryCommandService inventoryCommands;

    public OrderActionPolicy(
            OrderAccessService access,
            InventoryCommandService inventoryCommands
    ) {
        this.access = access;
        this.inventoryCommands = inventoryCommands;
    }

    public void requireCapabilityFor(String action) {
        access.requireCapability(
                capability(action)
        );
    }

    public List<String> allowedActions(
            Order order,
            Payment payment
    ) {
        var actions = new ArrayList<String>();

        switch (order.getOrderStatus()) {
            case OrderPolicy.PENDING -> {
                addIfAllowed(
                        actions,
                        "CONFIRM",
                        OrderPolicy.ORDER_PROCESS
                );
                addIfAllowed(
                        actions,
                        "CANCEL",
                        OrderPolicy.ORDER_EXCEPTION
                );
            }
            case OrderPolicy.CONFIRMED -> {
                addIfAllowed(
                        actions,
                        "PREPARE",
                        OrderPolicy.ORDER_PROCESS
                );
                addIfAllowed(
                        actions,
                        "CANCEL",
                        OrderPolicy.ORDER_EXCEPTION
                );
            }
            case OrderPolicy.PREPARING -> {
                addIfAllowed(
                        actions,
                        "SHIP",
                        OrderPolicy.ORDER_FULFILLMENT
                );
                addIfAllowed(
                        actions,
                        "CANCEL",
                        OrderPolicy.ORDER_EXCEPTION
                );
            }
            case OrderPolicy.SHIPPING -> {
                addIfAllowed(
                        actions,
                        "DELIVERY_FAILED",
                        OrderPolicy.ORDER_EXCEPTION
                );

                if (OrderPolicy.PAID.equals(payment.getPaymentStatus())) {
                    addIfAllowed(
                            actions,
                            "COMPLETE",
                            OrderPolicy.ORDER_FULFILLMENT
                    );
                }
            }
            case OrderPolicy.DELIVERY_FAILED -> {
                boolean deliveryReturned =
                        inventoryCommands
                                .orderStockState(order.getOrderId())
                                .deliveryReturned();

                if (!deliveryReturned) {
                    addIfAllowed(
                            actions,
                            "RETRY_DELIVERY",
                            OrderPolicy.ORDER_FULFILLMENT
                    );
                    addIfAllowed(
                            actions,
                            "DELIVERY_RETURN_IN",
                            OrderPolicy.ORDER_EXCEPTION
                    );
                }

                addIfAllowed(
                        actions,
                        "CANCEL",
                        OrderPolicy.ORDER_EXCEPTION
                );
            }
            default -> {
                // Terminal/baseline after-sales states expose no state action.
            }
        }

        return actions;
    }

    private String capability(String action) {
        return switch (action) {
            case "CONFIRM", "PREPARE" ->
                    OrderPolicy.ORDER_PROCESS;
            case "SHIP", "RETRY_DELIVERY", "COMPLETE" ->
                    OrderPolicy.ORDER_FULFILLMENT;
            case "DELIVERY_FAILED", "CANCEL", "DELIVERY_RETURN_IN" ->
                    OrderPolicy.ORDER_EXCEPTION;
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST
            );
        };
    }

    private void addIfAllowed(
            List<String> actions,
            String action,
            String permission
    ) {
        if (access.hasCapability(permission)) {
            actions.add(action);
        }
    }
}
