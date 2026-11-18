package com.fido.modules.order.service.lifecycle;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.util.ReflectionTestUtils.setField;

import com.fido.modules.inventory.service.InventoryMovementQueryService;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.Payment;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** Kiểm tra điều kiện COD dùng chung; OrderActionMatrixTests kiểm tra đủ sáu hành động. */
class OrderActionPolicyInvariantTests {
    private final InventoryMovementQueryService movements =
            mock(InventoryMovementQueryService.class);
    private final OrderActionPolicy policy = new OrderActionPolicy(movements);

    private Order order;
    private Payment payment;

    @BeforeEach
    void setUp() {
        order = new Order();
        order.setOrderId(13L);
        order.setTotalAmount(250000L);

        payment = Payment.unpaid(13L, 250000L);

        when(movements.orderStockState(13L))
                .thenReturn(new InventoryMovementQueryService.OrderStockState(false, false, false));
    }

    @Test
    void pendingUnpaidCodOffersConfirmAndCancel() {
        assertEquals(List.of("CONFIRM", "CANCEL"), policy.allowedActions(order, payment));
    }

    @Test
    void paymentAlreadyCollectedDeniesConfirmAndCancel() {
        setField(payment, "collectedByAccountId", 4L);
        assertDenied("CONFIRM");
        assertDenied("CANCEL");
    }

    @Test
    void mismatchBetweenPaymentAndOrderAmountDeniesActions() {
        setField(payment, "amount", 249999L);
        assertDenied("CONFIRM");
        assertDenied("CANCEL");
    }

    @Test
    void refundAmountDeniesActionsEvenWhenStatusStillUnpaid() {
        setField(payment, "refundAmount", 1L);
        assertDenied("CONFIRM");
        assertDenied("CANCEL");
    }

    @Test
    void cancellationAfterStockRestorationIsNotAllowed() {
        order.confirm();
        when(movements.orderStockState(13L))
                .thenReturn(new InventoryMovementQueryService.OrderStockState(true, true, false));
        assertDenied("CANCEL");
    }

    @Test
    void cancelledOrderCannotBeCancelledAgain() {
        order.cancel();

        ResponseStatusException error =
                assertThrows(
                        ResponseStatusException.class,
                        () -> policy.requireExecutable(order, payment, "CANCEL"));
        assertEquals(409, error.getStatusCode().value());
        assertEquals("ORDER_TRANSITION_ALREADY_APPLIED", error.getReason());
    }

    private void assertDenied(String action) {
        assertEquals(List.of(), policy.allowedActions(order, payment));
        ResponseStatusException error =
                assertThrows(
                        ResponseStatusException.class,
                        () -> policy.requireExecutable(order, payment, action));
        assertEquals(409, error.getStatusCode().value());
    }
}
