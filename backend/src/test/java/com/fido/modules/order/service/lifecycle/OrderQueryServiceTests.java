package com.fido.modules.order.service.lifecycle;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.util.ReflectionTestUtils.setField;

import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.OrderItem;
import com.fido.modules.order.entity.Payment;
import com.fido.modules.order.repository.OrderAddressRepository;
import com.fido.modules.order.repository.OrderItemRepository;
import com.fido.modules.order.repository.OrderRepository;
import com.fido.modules.order.repository.PaymentRepository;
import com.fido.modules.order.service.OrderPolicy;
import com.fido.modules.order.service.OrderSummaryReadService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

@ExtendWith(MockitoExtension.class)
class OrderQueryServiceTests {

    @Mock private OrderRepository orders;
    @Mock private OrderAddressRepository addresses;
    @Mock private OrderItemRepository items;
    @Mock private PaymentRepository payments;
    @Mock private OrderActionPolicy actionPolicy;

    private OrderQueryService service;

    @BeforeEach
    void setUp() {
        service =
                new OrderQueryService(
                        orders,
                        addresses,
                        items,
                        payments,
                        new OrderSummaryReadService(items, payments),
                        actionPolicy);
    }

    @Test
    @SuppressWarnings("unchecked")
    void customerOrderListLoadsPaymentsAndPreviewImagesInBatches() {
        Order first = order(1L, "ORD-1", 100_000L);
        Order second = order(2L, "ORD-2", 200_000L);
        when(orders.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(first, second), PageRequest.of(0, 20), 2));
        when(payments.findAllByOrderIdIn(List.of(1L, 2L)))
                .thenReturn(
                        List.of(payment(1L, OrderPolicy.UNPAID), payment(2L, OrderPolicy.PAID)));
        when(items.findFirstItemsByOrderIdIn(List.of(1L, 2L)))
                .thenReturn(
                        List.of(
                                orderItem(11L, 1L, "https://cdn.example.test/order-1.jpg"),
                                orderItem(21L, 2L, null)));

        var response = service.customerOrders(10L, null, 1, 20);

        assertEquals(2, response.data().size());
        assertEquals(OrderPolicy.UNPAID, response.data().get(0).payment_status());
        assertEquals(OrderPolicy.PAID, response.data().get(1).payment_status());
        assertEquals("https://cdn.example.test/order-1.jpg", response.data().get(0).image_url());
        assertNull(response.data().get(1).image_url());
        verify(payments).findAllByOrderIdIn(List.of(1L, 2L));
        verify(items).findFirstItemsByOrderIdIn(List.of(1L, 2L));
        verify(payments, never()).findById(anyLong());
        verify(items, never()).findAllByOrderIdOrderByOrderItemIdAsc(anyLong());
    }

    @Test
    @SuppressWarnings("unchecked")
    void orderListStillRejectsBrokenOrderPaymentInvariant() {
        Order order = order(1L, "ORD-1", 100_000L);
        when(orders.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(order), PageRequest.of(0, 20), 1));
        when(payments.findAllByOrderIdIn(List.of(1L))).thenReturn(List.of());
        when(items.findFirstItemsByOrderIdIn(List.of(1L))).thenReturn(List.of());

        IllegalStateException error =
                assertThrows(
                        IllegalStateException.class,
                        () -> service.customerOrders(10L, null, 1, 20));

        assertEquals("Order payment is missing", error.getMessage());
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.CsvSource({
        "ROLE_SUPERADMIN,true", "PERMISSION_ORDER_EDIT,true",
        "PERMISSION_ORDER_READ,false", "PERMISSION_ORDER_FULFILLMENT,false"
    })
    void detailOnlyOffersActionsToAnAuthorizedEditor(String authority, boolean canEdit) {
        Order order = order(1L, "ORD-1", 100_000L);
        Payment payment = payment(1L, "UNPAID");
        when(orders.findById(1L)).thenReturn(java.util.Optional.of(order));
        when(payments.findById(1L)).thenReturn(java.util.Optional.of(payment));
        when(addresses.findById(1L))
                .thenReturn(
                        java.util.Optional.of(new com.fido.modules.order.entity.OrderAddress()));
        when(items.findAllByOrderIdOrderByOrderItemIdAsc(1L)).thenReturn(List.of());
        if (canEdit)
            when(actionPolicy.allowedActions(order, payment))
                    .thenReturn(List.of("CONFIRM", "CANCEL"));
        var auth =
                new org.springframework.security.authentication.TestingAuthenticationToken(
                        "actor", null, authority);
        assertEquals(
                canEdit ? List.of("CONFIRM", "CANCEL") : List.of(),
                service.adminDetail(1L, auth).allowed_actions());
    }

    private Order order(Long orderId, String orderCode, long total) {
        Order order = new Order();
        order.setOrderId(orderId);
        order.setCustomerAccountId(10L);
        order.setOrderCode(orderCode);
        setField(order, "orderStatus", OrderPolicy.PENDING);
        order.setTotalAmount(total);
        return order;
    }

    private OrderItem orderItem(Long orderItemId, Long orderId, String imageUrl) {
        OrderItem item = new OrderItem();
        item.setOrderItemId(orderItemId);
        item.setOrderId(orderId);
        item.setImageUrlSnapshot(imageUrl);
        return item;
    }

    private Payment payment(Long orderId, String status) {
        Payment payment = Payment.unpaid(orderId, 100L);
        setField(payment, "paymentStatus", status);
        return payment;
    }
}
