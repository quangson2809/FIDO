package com.fido.modules.order.service;

import com.fido.modules.inventory.service.InventoryCommandService;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.Payment;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Owns state-aware action visibility.
 * Actor capability authorization is enforced separately by OrderAuthorization.
 */
@Service
public class OrderActionPolicy {

    private final InventoryCommandService inventoryCommands;

    public OrderActionPolicy(
            InventoryCommandService inventoryCommands
    ) {
        this.inventoryCommands = inventoryCommands;
    }

    public List<String> allowedActions(
            Order order,
            Payment payment
    ) {
        var actions = new ArrayList<String>();

        switch (order.getOrderStatus()) {
            case OrderPolicy.PENDING -> {
                actions.add("CONFIRM");
                actions.add("CANCEL");
            }
            case OrderPolicy.CONFIRMED -> {
                actions.add("PREPARE");
                actions.add("CANCEL");
            }
            case OrderPolicy.PREPARING -> {
                actions.add("SHIP");
                actions.add("CANCEL");
            }
            case OrderPolicy.SHIPPING -> {
                actions.add("DELIVERY_FAILED");

                if (OrderPolicy.PAID.equals(payment.getPaymentStatus())) {
                    actions.add("COMPLETE");
                }
            }
            case OrderPolicy.DELIVERY_FAILED -> {
                boolean deliveryReturned =
                        inventoryCommands
                                .orderStockState(order.getOrderId())
                                .deliveryReturned();

                if (!deliveryReturned) {
                    actions.add("RETRY_DELIVERY");
                    actions.add("DELIVERY_RETURN_IN");
                }

                actions.add("CANCEL");
            }
            default -> {
                // Terminal/baseline after-sales states expose no state action.
            }
        }

        return actions;
    }
}
