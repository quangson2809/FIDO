package com.fido.modules.order.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.order.dto.request.OrderActionRequest;
import com.fido.modules.order.dto.response.OrderAdminDetailDto;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.Payment;
import com.fido.modules.order.entity.ShippingInfo;
import com.fido.modules.order.repository.OrderRepository;
import com.fido.modules.order.repository.PaymentRepository;
import com.fido.modules.order.repository.ShippingInfoRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class OrderActionService {
    private final OrderActionPolicy policy;
    private final OrderRepository orders;
    private final PaymentRepository payments;
    private final ShippingInfoRepository shippingInfos;
    private final OrderQueryService query;
    private final AuditWriteService audit;
    private final Map<OrderAction, OrderActionHandler> handlers;

    public OrderActionService(
            OrderActionPolicy policy,
            OrderRepository orders,
            PaymentRepository payments,
            ShippingInfoRepository shippingInfos,
            OrderQueryService query,
            AuditWriteService audit,
            List<OrderActionHandler> handlers) {
        this.policy = policy;
        this.orders = orders;
        this.payments = payments;
        this.shippingInfos = shippingInfos;
        this.query = query;
        this.audit = audit;
        var registry = new EnumMap<OrderAction, OrderActionHandler>(OrderAction.class);
        for (var handler : handlers)
            for (var action : handler.supportedActions()) {
                if (registry.putIfAbsent(action, handler) != null)
                    throw new IllegalStateException("Duplicate Order action handler: " + action);
            }
        if (!registry.keySet().equals(EnumSet.allOf(OrderAction.class)))
            throw new IllegalStateException("Every Order action requires a handler");
        this.handlers = Map.copyOf(registry);
    }

    @PreAuthorize("@orderAuthorization.canExecute(authentication, #request.action())")
    public OrderAdminDetailDto executeAction(
            Long actor, Long orderId, OrderActionRequest request, Authentication authentication) {
        Order order =
                orders.findByIdForUpdate(orderId)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));
        Payment payment =
                payments.findById(orderId)
                        .orElseThrow(() -> new IllegalStateException("ORDER_PAYMENT_MISSING"));
        ShippingInfo shipping =
                shippingInfos
                        .findById(orderId)
                        .orElseThrow(
                                () -> new IllegalStateException("ORDER_SHIPPING_INFO_MISSING"));

        policy.requireExecutable(order, payment, shipping, request.action());
        OrderAction orderAction = OrderAction.require(request.action());
        String fromOrderStatus = order.getOrderStatus();
        String fromShippingStatus = shipping.getShippingStatus();
        handlers.get(orderAction).execute(actor, order, shipping, request);
        auditTransition(
                orderAction.auditAction(),
                order,
                fromOrderStatus,
                fromShippingStatus,
                order.getOrderStatus(),
                shipping.getShippingStatus(),
                orderAction == OrderAction.CANCEL ? payment.getPaymentStatus() : null);
        return query.adminDetailInternal(order, authentication);
    }

    private void auditTransition(
            AuditAction action,
            Order order,
            String fromOrderStatus,
            String fromShippingStatus,
            String toOrderStatus,
            String toShippingStatus,
            String paymentStatus) {
        Map<String, Object> before = new LinkedHashMap<>();
        before.put("status", fromOrderStatus);
        before.put("shipping_status", fromShippingStatus);
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("status", toOrderStatus);
        after.put("shipping_status", toShippingStatus);
        if (paymentStatus != null) {
            before.put("payment_status", paymentStatus);
            after.put("payment_status", paymentStatus);
        }
        audit.record(
                AuditWriteEvent.withChanges(
                        action,
                        AuditEntityType.ORDER,
                        order.getOrderId().toString(),
                        before,
                        after));
    }
}
