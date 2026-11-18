package com.fido.modules.order.service.lifecycle;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.util.ReflectionTestUtils.setField;

import com.fido.modules.inventory.service.InventoryMovementQueryService;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.Payment;
import com.fido.modules.order.entity.ShippingInfo;
import com.fido.modules.order.repository.ShippingInfoRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

/** Kiểm tra điều kiện COD dùng chung; OrderActionMatrixTests kiểm tra đủ sáu hành động. */
class OrderActionPolicyInvariantTests {
    private final InventoryMovementQueryService movements =
            mock(InventoryMovementQueryService.class);
    private final ShippingInfoRepository shippingInfos = mock(ShippingInfoRepository.class);
    private final OrderActionPolicy policy = new OrderActionPolicy(movements, shippingInfos);

    private Order order;
    private Payment payment;
    private ShippingInfo shipping;

    @BeforeEach
    void setUp() {
        order = new Order();
        order.setOrderId(13L);
        order.setTotalAmount(250000L);

        payment = new Payment();
        payment.setOrderId(13L);
        payment.setAmount(250000L);

        shipping = new ShippingInfo();
        shipping.setOrderId(13L);

        when(shippingInfos.findById(13L)).thenReturn(Optional.of(shipping));
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
        payment.setAmount(249999L);
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
        shipping.cancel();

        ResponseStatusException error =
                assertThrows(
                        ResponseStatusException.class,
                        () -> policy.requireExecutable(order, payment, shipping, "CANCEL"));
        assertEquals(409, error.getStatusCode().value());
        assertEquals("ORDER_TRANSITION_ALREADY_APPLIED", error.getReason());
    }

    private void assertDenied(String action) {
        assertEquals(List.of(), policy.allowedActions(order, payment));
        ResponseStatusException error =
                assertThrows(
                        ResponseStatusException.class,
                        () -> policy.requireExecutable(order, payment, shipping, action));
        assertEquals(409, error.getStatusCode().value());
    }
}
