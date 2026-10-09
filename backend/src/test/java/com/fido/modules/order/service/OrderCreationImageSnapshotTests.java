package com.fido.modules.order.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fido.modules.audit.service.AuditService;
import com.fido.modules.cart.service.CheckoutCartView;
import com.fido.modules.cart.service.CartCommandService;
import com.fido.modules.order.dto.request.CreateOrderRequest;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.OrderItem;
import com.fido.modules.order.entity.Payment;
import com.fido.modules.order.repository.OrderItemRepository;
import com.fido.modules.order.repository.OrderRepository;
import com.fido.modules.order.repository.PaymentRepository;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class OrderCreationImageSnapshotTests {

    @Test
    void createCopiesCheckoutCoverIntoOrderItemSnapshot() {
        CheckoutCalculationService checkout = mock(CheckoutCalculationService.class);
        OrderRepository orders = mock(OrderRepository.class);
        OrderItemRepository items = mock(OrderItemRepository.class);
        PaymentRepository payments = mock(PaymentRepository.class);
        AuditService audit = mock(AuditService.class);
        OrderCreationService service = new OrderCreationService(
                checkout,
                mock(CartCommandService.class),
                orders,
                items,
                payments,
                audit
        );

        String currentCover = "https://cdn.test/current-cover.jpg";
        CheckoutCartView.Item checkoutItem = new CheckoutCartView.Item(
                91L,
                2,
                "FIDO Shirt",
                currentCover,
                "SKU-91",
                "M",
                "Black",
                new BigDecimal("90000.00"),
                new BigDecimal("180000.00"),
                10,
                true
        );
        CheckoutCalculation calculation = new CheckoutCalculation(
                List.of(checkoutItem),
                new BigDecimal("180000.00"),
                BigDecimal.ZERO,
                new BigDecimal("30000.00"),
                new BigDecimal("210000.00")
        );
        when(checkout.calculate(42L, null)).thenReturn(calculation);
        when(orders.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setOrderId(100L);
            return order;
        });
        when(payments.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.create(
                42L,
                new CreateOrderRequest(
                        "0900000000",
                        null,
                        "Hanoi",
                        null
                )
        );

        ArgumentCaptor<OrderItem> saved = ArgumentCaptor.forClass(OrderItem.class);
        verify(items).save(saved.capture());
        assertEquals(currentCover, saved.getValue().getImageUrlSnapshot());
        assertEquals(91L, saved.getValue().getVariantId());
        assertEquals(2, saved.getValue().getQuantity());
    }
}
