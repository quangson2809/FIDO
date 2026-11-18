package com.fido.modules.order.entity;

import static org.junit.jupiter.api.Assertions.*;

import com.fido.common.exception.BusinessRuleException;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;

class OrderEntityBehaviorTests {
    @Test
    void collectedAmountAndOrderIdentityCannotBeReassignedByPublicApi() throws Exception {
        Payment payment = Payment.unpaid(1L, 100L);
        payment.collectCod(7L, NOW);
        assertThrows(
                NoSuchMethodException.class,
                () -> Payment.class.getMethod("setAmount", Long.class));
        assertThrows(
                NoSuchMethodException.class,
                () -> Payment.class.getMethod("setOrderId", Long.class));
        assertFalse(
                java.lang.reflect.Modifier.isPublic(
                        Payment.class.getDeclaredConstructor().getModifiers()));
        payment.refundFull(8L, "return", NOW);
        assertEquals(100L, payment.getRefundAmount());
        assertEquals(1L, payment.getOrderId());
    }

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 18, 0, 0);

    @Test
    void deliveryRetryAndFullReturnFollowTheExistingLifecycle() {
        Order order = new Order();
        ShippingInfo shipping = new ShippingInfo();
        order.confirm();
        order.startPreparing();
        order.dispatch();
        shipping.dispatch(NOW, " carrier ", " tracking ");
        order.markDeliveryFailed();
        shipping.markFailed();
        order.dispatch();
        shipping.dispatch(NOW.plusDays(1), null, " ");
        assertEquals("carrier", shipping.getCarrierName());
        assertEquals("tracking", shipping.getTrackingNumber());
        assertEquals(NOW.plusDays(1), shipping.getShippedAt());
        order.complete();
        shipping.markDelivered(NOW.plusDays(1).plusHours(1));
        order.acceptReturn();
        assertEquals("RETURNED", order.getOrderStatus());
        assertEquals("DELIVERED", shipping.getShippingStatus());
        assertThrows(BusinessRuleException.class, order::cancel);
        assertThrows(BusinessRuleException.class, order::confirm);
        assertThrows(BusinessRuleException.class, () -> shipping.dispatch(NOW, null, null));
    }

    @ParameterizedTest
    @ValueSource(strings = {"PENDING", "CONFIRMED", "PREPARING", "DELIVERY_FAILED"})
    void cancellationIsTerminalFromEveryApprovedSource(String status) {
        Order order = new Order();
        ReflectionTestUtils.setField(order, "orderStatus", status);
        order.cancel();
        BusinessRuleException repeated = assertThrows(BusinessRuleException.class, order::cancel);
        assertEquals("ORDER_TRANSITION_ALREADY_APPLIED", repeated.getMessage());
        assertEquals("CANCELLED", order.getOrderStatus());
    }

    @Test
    void forbiddenOrderAndShippingTransitionsDoNotMutateState() {
        Order order = new Order();
        ShippingInfo shipping = new ShippingInfo();
        assertThrows(BusinessRuleException.class, order::complete);
        assertThrows(BusinessRuleException.class, () -> shipping.markDelivered(NOW));
        assertEquals("PENDING", order.getOrderStatus());
        assertEquals("PENDING", shipping.getShippingStatus());
        assertNull(shipping.getDeliveredAt());
        order.confirm();
        order.startPreparing();
        order.dispatch();
        assertThrows(BusinessRuleException.class, order::cancel);
        assertEquals("SHIPPING", order.getOrderStatus());
    }

    @Test
    void collectionAndRefundKeepAllPaymentFactsTogetherAndRejectRepeats() {
        Payment payment = Payment.unpaid(1L, 123_456L);
        assertTrue(payment.isUncollected());
        assertThrows(BusinessRuleException.class, () -> payment.refundFull(7L, "reason", NOW));
        payment.collectCod(7L, NOW);
        assertTrue(payment.isCollected());
        assertEquals(7L, payment.getCollectedByAccountId());
        assertEquals(NOW, payment.getCollectedAt());
        assertThrows(BusinessRuleException.class, () -> payment.collectCod(8L, NOW.plusDays(1)));
        assertThrows(BusinessRuleException.class, () -> payment.refundFull(8L, " ", NOW));
        assertTrue(payment.isCollected());
        payment.refundFull(8L, " full return ", NOW.plusDays(1));
        assertEquals("REFUNDED", payment.getPaymentStatus());
        assertEquals(payment.getAmount(), payment.getRefundAmount());
        assertEquals("full return", payment.getRefundReason());
        assertEquals(8L, payment.getRefundedByAccountId());
        assertEquals(NOW.plusDays(1), payment.getRefundedAt());
        assertThrows(BusinessRuleException.class, () -> payment.refundFull(9L, "again", NOW));
        assertThrows(BusinessRuleException.class, () -> payment.collectCod(9L, NOW));
        assertEquals(7L, payment.getCollectedByAccountId());
        assertEquals(8L, payment.getRefundedByAccountId());
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "collectedByAccountId",
                "collectedAt",
                "refundedByAccountId",
                "refundedAt",
                "refundReason",
                "refundAmount"
            })
    void dirtyUnpaidFactsCannotBeOverwrittenByCollection(String field) {
        Payment payment = Payment.unpaid(1L, 100L);
        Object value = field.endsWith("At") ? NOW : field.equals("refundReason") ? "reason" : 1L;
        ReflectionTestUtils.setField(payment, field, value);
        assertFalse(payment.isUncollected());
        assertThrows(BusinessRuleException.class, () -> payment.collectCod(7L, NOW));
        assertEquals("UNPAID", payment.getPaymentStatus());
        assertEquals(value, ReflectionTestUtils.getField(payment, field));
    }
}
