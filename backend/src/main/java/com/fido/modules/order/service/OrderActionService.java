package com.fido.modules.order.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.inventory.service.InventoryCommandService;
import com.fido.modules.inventory.service.InventoryCommandService.StockLine;
import com.fido.modules.promotion.service.VoucherRedemptionService;
import jakarta.persistence.EntityManager;
import com.fido.modules.order.dto.request.OrderActionRequest;
import com.fido.modules.order.dto.response.OrderAdminDetailDto;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.OrderItem;
import com.fido.modules.order.entity.Payment;
import com.fido.modules.order.entity.ShippingInfo;
import com.fido.modules.order.repository.OrderItemRepository;
import com.fido.modules.order.repository.OrderRepository;
import com.fido.modules.order.repository.PaymentRepository;
import com.fido.modules.order.repository.ShippingInfoRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class OrderActionService {
    private final OrderActionPolicy policy;
    private final OrderRepository orders;
    private final OrderItemRepository items;
    private final PaymentRepository payments;
    private final ShippingInfoRepository shippingInfos;
    private final InventoryCommandService inventory;
    private final OrderQueryService query;
    private final AuditWriteService audit;
    private final VoucherRedemptionService voucherRedemption;
    private final EntityManager entityManager;

    public OrderActionService(
            OrderActionPolicy policy,
            OrderRepository orders,
            OrderItemRepository items,
            PaymentRepository payments,
            ShippingInfoRepository shippingInfos,
            InventoryCommandService inventory,
            OrderQueryService query,
            AuditWriteService audit,
            VoucherRedemptionService voucherRedemption,
            EntityManager entityManager) {
        this.policy = policy;
        this.orders = orders;
        this.items = items;
        this.payments = payments;
        this.shippingInfos = shippingInfos;
        this.inventory = inventory;
        this.query = query;
        this.audit = audit;
        this.voucherRedemption = voucherRedemption;
        this.entityManager = entityManager;
    }

    @PreAuthorize("@orderAuthorization.canExecute(authentication, #request.action())")
    public OrderAdminDetailDto action(
            Long actor, Long orderId, OrderActionRequest request, Authentication authentication) {
        Order order = orders.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));
        Payment payment = payments.findById(orderId)
                .orElseThrow(() -> new IllegalStateException("ORDER_PAYMENT_MISSING"));
        ShippingInfo shipping = shippingInfos.findById(orderId)
                .orElseThrow(() -> new IllegalStateException("ORDER_SHIPPING_INFO_MISSING"));

        policy.requireExecutable(order, payment, shipping, request.action());
        switch (request.action()) {
            case "CONFIRM" -> confirm(actor, order, shipping);
            case "START_PREPARING" -> startPreparing(actor, order, shipping);
            case "DISPATCH" -> dispatch(actor, order, shipping, request);
            case "MARK_DELIVERY_FAILED" -> markDeliveryFailed(actor, order, shipping, request);
            case "RETRY_DELIVERY" -> retryDelivery(actor, order, shipping, request);
            case "CANCEL" -> cancel(actor, order, payment, shipping, request);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ORDER_ACTION_INVALID");
        }
        return query.adminDetailInternal(order, authentication);
    }

    private void confirm(Long actor, Order order, ShippingInfo shipping) {
        String fromOrder = order.getOrderStatus();
        String fromShipping = shipping.getShippingStatus();
        inventory.deductConfirmedOrder(
                actor, order.getOrderId(), stockLines(order.getOrderId()), "ORDER_CONFIRM");

        order.setOrderStatus(OrderPolicy.CONFIRMED);
        orders.save(order);
        auditTransition(
                AuditAction.ORDER_CONFIRM, order, fromOrder, fromShipping,
                order.getOrderStatus(), shipping.getShippingStatus());
    }

    private void startPreparing(Long actor, Order order, ShippingInfo shipping) {
        String fromOrder = order.getOrderStatus();
        String fromShipping = shipping.getShippingStatus();
        inventory.requireConfirmedOrderMovements(order.getOrderId(), stockLines(order.getOrderId()));

        order.setOrderStatus(OrderPolicy.PREPARING);
        orders.save(order);
        auditTransition(
                AuditAction.ORDER_PREPARE, order, fromOrder, fromShipping,
                order.getOrderStatus(), shipping.getShippingStatus());
    }

    private void dispatch(
            Long actor, Order order, ShippingInfo shipping, OrderActionRequest request) {
        String fromOrder = order.getOrderStatus();
        String fromShipping = shipping.getShippingStatus();
        inventory.requireConfirmedOrderMovements(order.getOrderId(), stockLines(order.getOrderId()));

        order.setOrderStatus(OrderPolicy.SHIPPING);
        shipping.setShippingStatus("SHIPPED");
        shipping.setShippedAt(LocalDateTime.now(ZoneOffset.UTC));
        applyManualTracking(shipping, request);
        orders.save(order);
        shippingInfos.save(shipping);
        auditTransition(
                AuditAction.ORDER_SHIP, order, fromOrder, fromShipping,
                order.getOrderStatus(), shipping.getShippingStatus());
    }

    private void markDeliveryFailed(
            Long actor, Order order, ShippingInfo shipping, OrderActionRequest request) {
        String fromOrder = order.getOrderStatus();
        String fromShipping = shipping.getShippingStatus();

        order.setOrderStatus(OrderPolicy.DELIVERY_FAILED);
        shipping.setShippingStatus("FAILED");
        orders.save(order);
        shippingInfos.save(shipping);
        auditTransition(
                AuditAction.ORDER_DELIVERY_FAILED, order, fromOrder, fromShipping,
                order.getOrderStatus(), shipping.getShippingStatus(), null, request.reason());
    }

    private void retryDelivery(
            Long actor, Order order, ShippingInfo shipping, OrderActionRequest request) {
        String fromOrder = order.getOrderStatus();
        String fromShipping = shipping.getShippingStatus();
        inventory.requireConfirmedOrderMovements(order.getOrderId(), stockLines(order.getOrderId()));

        order.setOrderStatus(OrderPolicy.SHIPPING);
        shipping.setShippingStatus("SHIPPED");
        shipping.setShippedAt(LocalDateTime.now(ZoneOffset.UTC));
        applyManualTracking(shipping, request);
        orders.save(order);
        shippingInfos.save(shipping);
        auditTransition(
                AuditAction.ORDER_RETRY_DELIVERY, order, fromOrder, fromShipping,
                order.getOrderStatus(), shipping.getShippingStatus());
    }

    private void cancel(
            Long actor, Order order, Payment payment, ShippingInfo shipping,
            OrderActionRequest request) {
        String fromOrder = order.getOrderStatus();
        String fromShipping = shipping.getShippingStatus();
        List<StockLine> lines = stockLines(order.getOrderId());

        if (!OrderPolicy.PENDING.equals(fromOrder)) {
            inventory.restoreCancelledOrder(
                    actor, order.getOrderId(), lines, "ORDER_CANCELLED");
        }

        order.setOrderStatus(OrderPolicy.CANCELLED);
        shipping.setShippingStatus("CANCELLED");
        orders.save(order);
        shippingInfos.save(shipping);

        // Flush inside the same transaction so the promotion module sees the committed-in-transaction
        // CANCELLED source state. A later voucher/audit failure still rolls the complete command back.
        entityManager.flush();
        voucherRedemption.restoreCancelledOrder(order.getOrderId(), order.getVoucherId());

        auditTransition(
                AuditAction.ORDER_CANCEL, order, fromOrder, fromShipping,
                order.getOrderStatus(), shipping.getShippingStatus(),
                payment.getPaymentStatus(), request.reason());
    }

    private void applyManualTracking(ShippingInfo shipping, OrderActionRequest request) {
        if (request.carrier_name() != null && !request.carrier_name().isBlank()) {
            shipping.setCarrierName(request.carrier_name().trim());
        }
        if (request.tracking_number() != null && !request.tracking_number().isBlank()) {
            shipping.setTrackingNumber(request.tracking_number().trim());
        }
    }

    private List<StockLine> stockLines(Long orderId) {
        List<OrderItem> orderItems = items.findAllByOrderIdForUpdate(orderId);
        if (orderItems.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ORDER_ITEMS_MISSING");
        }
        return orderItems.stream()
                .map(item -> new StockLine(item.getProductId(), item.getQuantity(), item.getOrderItemId()))
                .toList();
    }

    private void auditTransition(
            AuditAction action, Order order, String fromOrder, String fromShipping,
            String toOrder, String toShipping) {
        auditTransition(action, order, fromOrder, fromShipping, toOrder, toShipping, null, null);
    }

    private void auditTransition(
            AuditAction action, Order order, String fromOrder, String fromShipping,
            String toOrder, String toShipping, String paymentStatus, String reason) {
        Map<String, Object> before = new LinkedHashMap<>();
        before.put("status", fromOrder);
        before.put("shipping_status", fromShipping);
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("status", toOrder);
        after.put("shipping_status", toShipping);
        if (paymentStatus != null) {
            before.put("payment_status", paymentStatus);
            after.put("payment_status", paymentStatus);
        }
        if (reason != null && reason.trim().matches("[A-Za-z0-9._:-]{1,120}")) {
            after.put("reason_code", reason.trim());
        }
        audit.record(AuditWriteEvent.withChanges(
                action, AuditEntityType.ORDER, order.getOrderId().toString(), before, after));
    }
}
