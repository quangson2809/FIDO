package com.fido.modules.order.service;

import com.fido.modules.audit.service.AuditService;
import com.fido.modules.inventory.service.InventoryCommandService;
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

    private final OrderRepository orders;
    private final OrderItemRepository items;
    private final PaymentRepository payments;
    private final InventoryCommandService inventoryCommands;
    private final OrderQueryService query;
    private final AuditService audit;

    public OrderActionService(
            OrderRepository orders,
            OrderItemRepository items,
            PaymentRepository payments,
            InventoryCommandService inventoryCommands,
            OrderQueryService query,
            AuditService audit
    ) {
        this.orders = orders;
        this.items = items;
        this.payments = payments;
        this.inventoryCommands = inventoryCommands;
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
        if (List.of(
                "CANCEL",
                "DELIVERY_FAILED"
        ).contains(request.action())
                && (request.reason() == null
                || request.reason().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        Order order = locked(orderId);

        Order result = switch (request.action()) {
            case "CONFIRM" ->
                    confirm(actor, order, request.reason());
            case "PREPARE" ->
                    simpleTransition(
                            actor,
                            order,
                            OrderPolicy.CONFIRMED,
                            OrderPolicy.PREPARING,
                            "ORDER_PREPARE"
                    );
            case "SHIP" ->
                    simpleTransition(
                            actor,
                            order,
                            OrderPolicy.PREPARING,
                            OrderPolicy.SHIPPING,
                            "ORDER_SHIP"
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
        if (OrderPolicy.CONFIRMED.equals(
                order.getOrderStatus()
        )) {
            return order;
        }

        if (!OrderPolicy.PENDING.equals(
                order.getOrderStatus()
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        inventoryCommands.deductConfirmedOrder(
                actor,
                order.getOrderId(),
                stockLines(order.getOrderId()),
                reason
        );

        order.setOrderStatus(OrderPolicy.CONFIRMED);
        orders.save(order);

        audit.record(
                actor,
                "ORDER_CONFIRM",
                "ORDER",
                order.getOrderId(),
                transitionDescription(
                        OrderPolicy.PENDING,
                        OrderPolicy.CONFIRMED,
                        reason
                )
        );

        return order;
    }

    private Order deliveryFailed(
            Long actor,
            Order order,
            String reason
    ) {
        if (OrderPolicy.DELIVERY_FAILED.equals(
                order.getOrderStatus()
        )) {
            return order;
        }

        if (!OrderPolicy.SHIPPING.equals(
                order.getOrderStatus()
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

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
                actor,
                "ORDER_DELIVERY_FAILED",
                "ORDER",
                order.getOrderId(),
                transitionDescription(
                        OrderPolicy.SHIPPING,
                        OrderPolicy.DELIVERY_FAILED,
                        reason
                )
        );

        return order;
    }

    private Order retryDelivery(
            Long actor,
            Order order
    ) {
        if (OrderPolicy.SHIPPING.equals(
                order.getOrderStatus()
        )) {
            return order;
        }

        if (!OrderPolicy.DELIVERY_FAILED.equals(
                order.getOrderStatus()
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        var stockState =
                inventoryCommands.orderStockState(
                        order.getOrderId()
                );

        if (stockState.deliveryReturned()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        order.setOrderStatus(OrderPolicy.SHIPPING);
        orders.save(order);

        audit.record(
                actor,
                "ORDER_RETRY_DELIVERY",
                "ORDER",
                order.getOrderId(),
                transitionDescription(
                        OrderPolicy.DELIVERY_FAILED,
                        OrderPolicy.SHIPPING,
                        null
                )
        );

        return order;
    }

    private Order complete(
            Long actor,
            Order order
    ) {
        if (OrderPolicy.COMPLETED.equals(
                order.getOrderStatus()
        )) {
            return order;
        }

        if (!OrderPolicy.SHIPPING.equals(
                order.getOrderStatus()
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        Payment payment = payments
                .findById(order.getOrderId())
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Order payment is missing"
                        )
                );

        if (!OrderPolicy.PAID.equals(
                payment.getPaymentStatus()
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        order.setOrderStatus(OrderPolicy.COMPLETED);
        order.setCompletedAt(
                LocalDateTime.now(ZoneOffset.UTC)
        );

        orders.save(order);

        audit.record(
                actor,
                "ORDER_COMPLETE",
                "ORDER",
                order.getOrderId(),
                transitionDescription(
                        OrderPolicy.SHIPPING,
                        OrderPolicy.COMPLETED,
                        null
                )
        );

        return order;
    }

    private Order cancel(
            Long actor,
            Order order,
            String reason
    ) {
        if (OrderPolicy.CANCELLED.equals(
                order.getOrderStatus()
        )) {
            return order;
        }

        boolean cancellable = List.of(
                OrderPolicy.PENDING,
                OrderPolicy.CONFIRMED,
                OrderPolicy.PREPARING,
                OrderPolicy.DELIVERY_FAILED
        ).contains(order.getOrderStatus());

        if (!cancellable) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        var stockState =
                inventoryCommands.orderStockState(
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
                actor,
                "ORDER_CANCEL",
                "ORDER",
                order.getOrderId(),
                transitionDescription(
                        sourceStatus,
                        OrderPolicy.CANCELLED,
                        reason
                )
        );

        return order;
    }

    private Order deliveryReturnIn(
            Long actor,
            Order order,
            String reason
    ) {
        if (!OrderPolicy.DELIVERY_FAILED.equals(
                order.getOrderStatus()
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        var stockState =
                inventoryCommands.orderStockState(
                        order.getOrderId()
                );

        if (stockState.deliveryReturned()) {
            return order;
        }

        inventoryCommands.restoreDeliveryReturn(
                actor,
                order.getOrderId(),
                stockLines(order.getOrderId()),
                reason
        );

        audit.record(
                actor,
                "ORDER_DELIVERY_RETURN_IN",
                "ORDER",
                order.getOrderId(),
                reason == null || reason.isBlank()
                        ? "physical delivery return"
                        : "physical delivery return; reason="
                                + reason.trim()
        );

        return order;
    }

    private Order simpleTransition(
            Long actor,
            Order order,
            String expected,
            String target,
            String auditAction
    ) {
        if (target.equals(order.getOrderStatus())) {
            return order;
        }

        if (!expected.equals(order.getOrderStatus())
                || !OrderPolicy.canTransition(
                        order.getOrderStatus(),
                        target
                )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        order.setOrderStatus(target);
        orders.save(order);

        audit.record(
                actor,
                auditAction,
                "ORDER",
                order.getOrderId(),
                transitionDescription(
                        expected,
                        target,
                        null
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
            String to,
            String reason
    ) {
        String description = from + " -> " + to;

        if (reason == null || reason.isBlank()) {
            return description;
        }

        return description + "; reason=" + reason.trim();
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
