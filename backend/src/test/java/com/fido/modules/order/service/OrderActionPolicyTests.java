package com.fido.modules.order.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.fido.modules.inventory.service.InventoryMovementQueryService;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.Payment;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class OrderActionPolicyTests {
    @Test
    void advertisedActionsAndExecutionUseTheSameStateAndSideEffectPrerequisites() {
        var movements = mock(InventoryMovementQueryService.class);
        var policy = new OrderActionPolicy(movements);
        var order = new Order();
        order.setOrderId(1L);
        var payment = new Payment();
        for (boolean returned : List.of(false, true)) {
            when(movements.orderStockState(1L)).thenReturn(new InventoryMovementQueryService.OrderStockState(true, false, returned));
            for (String status : List.of("PENDING", "CONFIRMED", "PREPARING", "SHIPPING", "DELIVERY_FAILED", "COMPLETED", "RETURNED", "CANCELLED")) {
                order.setOrderStatus(status);
                for (String paid : List.of("UNPAID", "PAID", "REFUNDED")) {
                    payment.setPaymentStatus(paid);
                    var allowed = policy.allowedActions(order, payment);
                    for (String action : List.of("CONFIRM", "PREPARE", "SHIP", "DELIVERY_FAILED", "RETRY_DELIVERY", "CANCEL", "COMPLETE", "DELIVERY_RETURN_IN")) {
                        if (allowed.contains(action)) {
                            assertTrue(policy.requireExecutable(order, payment, action));
                        } else {
                            try {
                                assertFalse(policy.requireExecutable(order, payment, action), status + ": " + action);
                            } catch (ResponseStatusException exception) {
                                assertEquals(409, exception.getStatusCode().value());
                            }
                        }
                    }
                }
            }
        }
        order.setOrderStatus("SHIPPING");
        payment.setPaymentStatus("UNPAID");
        assertFalse(policy.allowedActions(order, payment).contains("COMPLETE"));
        assertThrows(ResponseStatusException.class, () -> policy.requireExecutable(order, payment, "COMPLETE"));
        assertThrows(ResponseStatusException.class, () -> policy.requireExecutable(order, payment, "UNKNOWN"));
    }
}
