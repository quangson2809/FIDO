package com.fido.modules.order.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.Payment;
import com.fido.modules.order.repository.OrderItemRepository;
import com.fido.modules.order.repository.OrderRepository;
import com.fido.modules.order.repository.PaymentRepository;
import com.fido.modules.order.repository.ShippingInfoRepository;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

@ExtendWith(MockitoExtension.class)
class OrderQueryServiceTests {

    @Mock private OrderRepository orders;
    @Mock private OrderItemRepository items;
    @Mock private PaymentRepository payments;
    @Mock private ShippingInfoRepository shipping;
    @Mock private OrderActionPolicy actionPolicy;
    @Mock private OrderAuthorization authorization;

    private OrderQueryService service;

    @BeforeEach
    void setUp() {
        service = new OrderQueryService(
                orders,
                items,
                payments,
                shipping,
                actionPolicy,
                authorization
        );
    }

    @Test
    @SuppressWarnings("unchecked")
    void customerOrderListLoadsPaymentsInOneBatch() {
        Order first = order(1L, "ORD-1", new BigDecimal("100000.00"));
        Order second = order(2L, "ORD-2", new BigDecimal("200000.00"));
        when(orders.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(
                        List.of(first, second),
                        PageRequest.of(0, 20),
                        2
                ));
        when(payments.findAllByOrderIdIn(List.of(1L, 2L)))
                .thenReturn(List.of(
                        payment(1L, OrderPolicy.UNPAID),
                        payment(2L, OrderPolicy.PAID)
                ));

        var response = service.customerOrders(10L, null, 1, 20);

        assertEquals(2, response.data().size());
        assertEquals(OrderPolicy.UNPAID, response.data().get(0).payment_status());
        assertEquals(OrderPolicy.PAID, response.data().get(1).payment_status());
        verify(payments).findAllByOrderIdIn(List.of(1L, 2L));
        verify(payments, never()).findById(anyLong());
    }

    @Test
    @SuppressWarnings("unchecked")
    void orderListStillRejectsBrokenOrderPaymentInvariant() {
        Order order = order(1L, "ORD-1", new BigDecimal("100000.00"));
        when(orders.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(
                        List.of(order),
                        PageRequest.of(0, 20),
                        1
                ));
        when(payments.findAllByOrderIdIn(List.of(1L))).thenReturn(List.of());

        IllegalStateException error = assertThrows(
                IllegalStateException.class,
                () -> service.customerOrders(10L, null, 1, 20)
        );

        assertEquals("Order payment is missing", error.getMessage());
    }

    private Order order(Long orderId, String orderCode, BigDecimal total) {
        Order order = new Order();
        order.setOrderId(orderId);
        order.setCustomerAccountId(10L);
        order.setOrderCode(orderCode);
        order.setOrderStatus(OrderPolicy.PENDING);
        order.setTotalSnapshot(total);
        return order;
    }

    private Payment payment(Long orderId, String status) {
        Payment payment = new Payment();
        payment.setOrderId(orderId);
        payment.setPaymentStatus(status);
        return payment;
    }
}
