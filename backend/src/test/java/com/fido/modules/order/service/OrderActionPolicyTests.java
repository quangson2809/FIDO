package com.fido.modules.order.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fido.modules.inventory.service.InventoryMovementQueryService;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.Payment;
import com.fido.modules.order.entity.ShippingInfo;
import com.fido.modules.order.repository.ShippingInfoRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class OrderActionPolicyTests {
    @Test
    void visibilityAndExecutionShareTheCanonicalPendingOrderPreconditions() {
        var movements = mock(InventoryMovementQueryService.class);
        var shippingRepository = mock(ShippingInfoRepository.class);
        var policy = new OrderActionPolicy(movements, shippingRepository);
        Order order = pendingOrder();
        Payment payment = unpaidCodPayment();
        ShippingInfo shipping = pendingShipping();
        when(shippingRepository.findById(1L)).thenReturn(Optional.of(shipping));
        when(movements.orderStockState(1L))
                .thenReturn(new InventoryMovementQueryService.OrderStockState(false, false, false));

        var allowed = policy.allowedActions(order, payment);
        assertTrue(allowed.contains("CONFIRM"));
        assertTrue(allowed.contains("CANCEL"));
        assertDoesNotThrow(() -> policy.requireExecutable(order, payment, shipping, "CANCEL"));
    }

    @Test
    void cancellationCannotBeAppliedTwiceToATerminalOrder() {
        var movements = mock(InventoryMovementQueryService.class);
        var shippingRepository = mock(ShippingInfoRepository.class);
        var policy = new OrderActionPolicy(movements, shippingRepository);
        Order order = pendingOrder();
        order.setOrderStatus("CANCELLED");

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> policy.requireExecutable(order, unpaidCodPayment(), pendingShipping(), "CANCEL"));

        assertEquals(409, error.getStatusCode().value());
    }

    private static Order pendingOrder() {
        Order order = new Order();
        order.setOrderId(1L);
        order.setOrderStatus("PENDING");
        order.setTotalAmount(100L);
        order.setCurrency("VND");
        return order;
    }

    private static Payment unpaidCodPayment() {
        Payment payment = new Payment();
        payment.setOrderId(1L);
        payment.setMethod("COD");
        payment.setPaymentStatus("UNPAID");
        payment.setAmount(100L);
        payment.setCurrency("VND");
        payment.setRefundAmount(0L);
        return payment;
    }

    private static ShippingInfo pendingShipping() {
        ShippingInfo shipping = new ShippingInfo();
        shipping.setOrderId(1L);
        shipping.setShippingStatus("PENDING");
        return shipping;
    }
}
