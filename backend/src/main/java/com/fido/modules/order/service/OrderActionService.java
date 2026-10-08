package com.fido.modules.order.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEvent;
import com.fido.modules.audit.service.AuditService;
import com.fido.modules.audit.service.AuditTargetType;
import com.fido.modules.inventory.service.InventoryCommandService;
import com.fido.modules.inventory.service.InventoryMovementQueryService;
import com.fido.modules.order.dto.request.OrderActionRequest;
import com.fido.modules.order.dto.response.OrderAdminDetailDto;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.OrderItem;
import com.fido.modules.order.entity.Payment;
import com.fido.modules.order.repository.OrderItemRepository;
import com.fido.modules.order.repository.OrderRepository;
import com.fido.modules.order.repository.PaymentRepository;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class OrderActionService {

    private final OrderActionPolicy policy;
    private final OrderRepository orders;
    private final OrderItemRepository items;
    private final PaymentRepository payments;
    private final InventoryCommandService inventoryCommands;
    private final InventoryMovementQueryService movements;
    private final OrderQueryService query;
    private final AuditService audit;

    public OrderActionService(
            OrderActionPolicy policy,
            OrderRepository orders,
            OrderItemRepository items,
            PaymentRepository payments,
            InventoryCommandService inventoryCommands,
            InventoryMovementQueryService movements,
            OrderQueryService query,
            AuditService audit
    ) {
        this.policy = policy;
        this.orders = orders;
        this.items = items;
        this.payments = payments;
        this.inventoryCommands = inventoryCommands;
        this.movements = movements;
        this.query = query;
        this.audit = audit;
    }

    @PreAuthorize(
            "@orderAuthorization.canExecute(authentication, #request.action())"
    )
    public OrderAdminDetailDto action(
            Long actor,
            Long orderId,
            OrderActionRequest request,
            Authentication authentication
    ) {
        Order order = locked(orderId);
        Payment payment = payments.findById(orderId)
                .orElseThrow(() -> new IllegalStateException("Order payment is missing"));
        if (!policy.requireExecutable(order, payment, request.action())) {
            return query.adminDetailInternal(order, authentication);
        }

        Order result = switch (request.action()) {
            case "CONFIRM" ->
                    confirm(actor, order, request.reason());
            case "PREPARE" ->
                    simpleTransition(
                            actor,
                            order,
                            OrderPolicy.CONFIRMED,
                            OrderPolicy.PREPARING,
                            AuditAction.ORDER_PREPARE
                    );
            case "SHIP" ->
                    simpleTransition(
                            actor,
                            order,
                            OrderPolicy.PREPARING,
                            OrderPolicy.SHIPPING,
                            AuditAction.ORDER_SHIP
                    );
            case "DELIVERY_FAILED" ->
                    deliveryFailed(actor, order, request.reason());
            case "RETRY_DELIVERY" ->
                    retryDelivery(actor, order);
            case "CANCEL" ->
                    cancel(actor, order, request.reason());
            case "COMPLETE" ->
                    complete(actor, order);
            case "DELIVERY_RETURN_IN" ->
                    deliveryReturnIn(actor, order, request.reason());
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST
            );
        };

        return query.adminDetailInternal(
                result,
                authentication
        );
    }

    private Order confirm(
            Long actor,
            Order order,
            String reason
    ) {
        inventoryCommands.deductConfirmedOrder(
                actor,
                order.getOrderId(),
                stockLines(order.getOrderId()),
                reason
        );

        order.setOrderStatus(OrderPolicy.CONFIRMED);
        orders.save(order);

        audit.record(
                AuditEvent.described(
                        actor,
                        AuditAction.ORDER_CONFIRM,
                        AuditTargetType.ORDER,
                        order.getOrderId(),
                        transitionDescription(
                                OrderPolicy.PENDING,
                                OrderPolicy.CONFIRMED
                        )
                )
        );

        return order;
    }

    private Order deliveryFailed(
            Long actor,
            Order order,
            String reason
    ) {
        order.setOrderStatus(OrderPolicy.DELIVERY_FAILED);

        if (reason != null && !reason.isBlank()) {
            order.setCustomerServiceNote(
                    appendNote(
                            order.getCustomerServiceNote(),
                            "DELIVERY_FAILED: " + reason.trim()
                    )
            );
        }

        orders.save(order);

        audit.record(
                AuditEvent.described(
                        actor,
                        AuditAction.ORDER_DELIVERY_FAILED,
                        AuditTargetType.ORDER,
                        order.getOrderId(),
                        transitionDescription(
                                OrderPolicy.SHIPPING,
                                OrderPolicy.DELIVERY_FAILED
                        )
                )
        );

        return order;
    }

    private Order retryDelivery(
            Long actor,
            Order order
    ) {
        order.setOrderStatus(OrderPolicy.SHIPPING);
        orders.save(order);

        audit.record(
                AuditEvent.described(
                        actor,
                        AuditAction.ORDER_RETRY_DELIVERY,
                        AuditTargetType.ORDER,
                        order.getOrderId(),
                        transitionDescription(
                                OrderPolicy.DELIVERY_FAILED,
                                OrderPolicy.SHIPPING
                        )
                )
        );

        return order;
    }

    private Order complete(
            Long actor,
            Order order
    ) {
        order.setOrderStatus(OrderPolicy.COMPLETED);
        order.setCompletedAt(
                LocalDateTime.now(ZoneOffset.UTC)
        );

        orders.save(order);

        audit.record(
                AuditEvent.described(
                        actor,
                        AuditAction.ORDER_COMPLETE,
                        AuditTargetType.ORDER,
                        order.getOrderId(),
                        transitionDescription(
                                OrderPolicy.SHIPPING,
                                OrderPolicy.COMPLETED
                        )
                )
        );

        return order;
    }

    private Order cancel(
            Long actor,
            Order order,
            String reason
    ) {
        var stockState =
                movements.orderStockState(
                        order.getOrderId()
                );

        if (stockState.deducted() && !stockState.restored()) {
            inventoryCommands.restoreCancelledOrder(
                    actor,
                    order.getOrderId(),
                    stockLines(order.getOrderId()),
                    reason
            );
        }

        String sourceStatus = order.getOrderStatus();

        order.setOrderStatus(OrderPolicy.CANCELLED);
        order.setCancelReason(
                reason == null || reason.isBlank()
                        ? null
                        : reason.trim()
        );

        orders.save(order);

        audit.record(
                AuditEvent.described(
                        actor,
                        AuditAction.ORDER_CANCEL,
                        AuditTargetType.ORDER,
                        order.getOrderId(),
                        transitionDescription(
                                sourceStatus,
                                OrderPolicy.CANCELLED
                        )
                )
        );

        return order;
    }

    private Order deliveryReturnIn(
            Long actor,
            Order order,
            String reason
    ) {
        inventoryCommands.restoreDeliveryReturn(
                actor,
                order.getOrderId(),
                stockLines(order.getOrderId()),
                reason
        );

        audit.record(
                AuditEvent.described(
                        actor,
                        AuditAction.ORDER_DELIVERY_RETURN_IN,
                        AuditTargetType.ORDER,
                        order.getOrderId(),
                        "physical delivery return"
                )
        );

        return order;
    }

    private Order simpleTransition(
            Long actor,
            Order order,
            String expected,
            String target,
            AuditAction auditAction
    ) {
        order.setOrderStatus(target);
        orders.save(order);

        audit.record(
                AuditEvent.described(
                        actor,
                        auditAction,
                        AuditTargetType.ORDER,
                        order.getOrderId(),
                        transitionDescription(
                                expected,
                                target
                        )
                )
        );

        return order;
    }

    private List<OrderItem> orderItems(Long orderId) {
        var orderItems =
                items.findAllByOrderIdOrderByOrderItemIdAsc(orderId);

        if (orderItems.isEmpty()) {
            throw new IllegalStateException(
                    "Order has no items"
            );
        }

        return orderItems;
    }

    private List<InventoryCommandService.StockLine> stockLines(Long orderId) {
        return orderItems(orderId)
                .stream()
                .map(item ->
                        new InventoryCommandService.StockLine(
                                item.getVariantId(),
                                item.getQuantity()
                        )
                )
                .toList();
    }

    private Order locked(Long orderId) {
        return orders.findByIdForUpdate(orderId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    private String transitionDescription(
            String from,
            String to
    ) {
        return from + " -> " + to;
    }

    private String appendNote(
            String current,
            String addition
    ) {
        if (current == null || current.isBlank()) {
            return addition;
        }

        return current + "\n" + addition;
    }
}
