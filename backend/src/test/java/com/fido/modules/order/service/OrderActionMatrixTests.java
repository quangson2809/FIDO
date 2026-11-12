package com.fido.modules.order.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fido.modules.inventory.service.InventoryMovementQueryService;
import com.fido.modules.inventory.service.InventoryMovementQueryService.OrderStockState;
import com.fido.modules.order.dto.request.OrderActionRequest;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.Payment;
import com.fido.modules.order.entity.ShippingInfo;
import com.fido.modules.order.repository.ShippingInfoRepository;

import jakarta.validation.Validation;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

class OrderActionMatrixTests {
    private static final List<String> ACTIONS =
            List.of(
                    "CONFIRM",
                    "START_PREPARING",
                    "DISPATCH",
                    "MARK_DELIVERY_FAILED",
                    "RETRY_DELIVERY",
                    "CANCEL");

    @ParameterizedTest
    @CsvSource({
        "PENDING,PENDING,false,false,CONFIRM;CANCEL",
        "CONFIRMED,PENDING,true,false,START_PREPARING;CANCEL",
        "PREPARING,PENDING,true,false,DISPATCH;CANCEL",
        "SHIPPING,SHIPPED,true,false,MARK_DELIVERY_FAILED",
        "DELIVERY_FAILED,FAILED,true,false,RETRY_DELIVERY;CANCEL",
        "CANCELLED,CANCELLED,true,true,-",
        "COMPLETED,DELIVERED,true,false,-",
        "RETURNED,DELIVERED,true,false,-",
        "CONFIRMED,PENDING,false,false,-",
        "PREPARING,PENDING,true,true,-"
    })
    void visibilityExecutionAndAuthorizationAgree(
            String status,
            String shippingStatus,
            boolean deducted,
            boolean restored,
            String expected) {
        var movements = mock(InventoryMovementQueryService.class);
        var shippingRepository = mock(ShippingInfoRepository.class);
        var policy = new OrderActionPolicy(movements, shippingRepository);
        var order = new Order();
        order.setOrderId(1L);
        order.setOrderStatus(status);
        order.setTotalAmount(100L);
        order.setCurrency("VND");
        var payment = new Payment();
        payment.setMethod("COD");
        payment.setAmount(100L);
        payment.setCurrency("VND");
        payment.setPaymentStatus("UNPAID");
        payment.setRefundAmount(0L);
        var shipping = new ShippingInfo();
        shipping.setShippingStatus(shippingStatus);
        when(shippingRepository.findById(1L)).thenReturn(Optional.of(shipping));
        when(movements.orderStockState(1L))
                .thenReturn(new OrderStockState(deducted, restored, false));
        List<String> allowed =
                expected.equals("-") ? List.of() : Arrays.asList(expected.split(";"));
        assertEquals(allowed, policy.allowedActions(order, payment));
        var authorization = new OrderAuthorization();
        var editor = new TestingAuthenticationToken("editor", "unused", "PERMISSION_ORDER_EDIT");
        var reader = new TestingAuthenticationToken("reader", "unused", "PERMISSION_ORDER_READ");
        var legacy =
                new TestingAuthenticationToken("legacy", "unused", "PERMISSION_ORDER_FULFILLMENT");
        assertEquals(allowed, authorization.filterAllowed(editor, allowed));
        assertEquals(List.of(), authorization.filterAllowed(reader, allowed));
        assertEquals(List.of(), authorization.filterAllowed(legacy, allowed));
        for (String action : ACTIONS) {
            assertTrue(authorization.canExecute(editor, action));
            assertFalse(authorization.canExecute(reader, action));
            if (allowed.contains(action))
                assertDoesNotThrow(
                        () -> policy.requireExecutable(order, payment, shipping, action));
            else
                assertEquals(
                        409,
                        assertThrows(
                                        ResponseStatusException.class,
                                        () ->
                                                policy.requireExecutable(
                                                        order, payment, shipping, action))
                                .getStatusCode()
                                .value());
        }
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "CONFIRM",
                "START_PREPARING",
                "DISPATCH",
                "MARK_DELIVERY_FAILED",
                "RETRY_DELIVERY",
                "CANCEL"
            })
    void requestAcceptsExistingWireVocabulary(String action) {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertTrue(
                    factory.getValidator()
                            .validate(new OrderActionRequest(action, null, null, null))
                            .isEmpty());
        }
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(
            strings = {
                " ",
                "confirm",
                " CONFIRM",
                "CONFIRM ",
                "UNKNOWN",
                "COMPLETE_DELIVERY_AND_COLLECT_COD"
            })
    void malformedActionRetainsRequestRejectionAndAuthorizationBehavior(String action) {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertFalse(
                    factory.getValidator()
                            .validate(new OrderActionRequest(action, null, null, null))
                            .isEmpty());
        }
        var auth = new OrderAuthorization();
        assertFalse(
                auth.canExecute(
                        new TestingAuthenticationToken("editor", "unused", "PERMISSION_ORDER_EDIT"),
                        action));
        assertTrue(
                auth.canExecute(
                        new TestingAuthenticationToken("root", "unused", "ROLE_SUPERADMIN"),
                        action));
    }
}
