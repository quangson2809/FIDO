package com.fido.modules.order.service;

import com.fido.modules.audit.service.AuditService;
import com.fido.modules.inventory.entity.InventoryTransaction;
import com.fido.modules.inventory.repository.InventoryRepository;
import com.fido.modules.inventory.repository.InventoryTransactionRepository;
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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class OrderActionService {

    private final OrderRepository orders;
    private final OrderItemRepository items;
    private final PaymentRepository payments;
    private final InventoryRepository inventories;
    private final InventoryTransactionRepository inventoryTransactions;
    private final OrderQueryService query;
    private final AuditService audit;

    public OrderActionService(
            OrderRepository orders,
            OrderItemRepository items,
            PaymentRepository payments,
            InventoryRepository inventories,
            InventoryTransactionRepository inventoryTransactions,
            OrderQueryService query,
            AuditService audit
    ) {
        this.orders = orders;
        this.items = items;
        this.payments = payments;
        this.inventories = inventories;
        this.inventoryTransactions = inventoryTransactions;
        this.query = query;
        this.audit = audit;
    }

    public OrderAdminDetailDto action(
            Long actor,
            Long orderId,
            OrderActionRequest request
    ) {
        String capability = capability(request.action());
        requireCapability(capability);

        if (List.of(
                "CANCEL",
                "DELIVERY_FAILED"
        ).contains(request.action())
                && (request.reason() == null
                || request.reason().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        Order order = locked(orderId);

        return switch (request.action()) {
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
    }

    private OrderAdminDetailDto confirm(
            Long actor,
            Order order,
            String reason
    ) {
        if (OrderPolicy.CONFIRMED.equals(
                order.getOrderStatus()
        )) {
            return query.adminDetailInternal(order);
        }

        if (!OrderPolicy.PENDING.equals(
                order.getOrderStatus()
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        List<OrderItem> orderItems = orderItems(order.getOrderId());

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        for (OrderItem item : orderItems) {
            int updated = inventories.adjustIfNonNegative(
                    item.getVariantId(),
                    -item.getQuantity(),
                    now
            );

            if (updated != 1) {
                throw new ResponseStatusException(HttpStatus.CONFLICT);
            }

            recordInventory(
                    actor,
                    order.getOrderId(),
                    item.getVariantId(),
                    -item.getQuantity(),
                    OrderPolicy.ORDER_CONFIRM_OUT,
                    reason
            );
        }

        order.setOrderStatus(OrderPolicy.CONFIRMED);
        orders.save(order);

        audit.record(
                actor,
                "ORDER_CONFIRM",
                "ORDER",
                order.getOrderId()
        );

        return query.adminDetailInternal(order);
    }

    private OrderAdminDetailDto deliveryFailed(
            Long actor,
            Order order,
            String reason
    ) {
        if (OrderPolicy.DELIVERY_FAILED.equals(
                order.getOrderStatus()
        )) {
            return query.adminDetailInternal(order);
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
                order.getOrderId()
        );

        return query.adminDetailInternal(order);
    }

    private OrderAdminDetailDto retryDelivery(
            Long actor,
            Order order
    ) {
        if (OrderPolicy.SHIPPING.equals(
                order.getOrderStatus()
        )) {
            return query.adminDetailInternal(order);
        }

        if (!OrderPolicy.DELIVERY_FAILED.equals(
                order.getOrderStatus()
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        boolean physicallyReturned =
                inventoryTransactions
                        .existsByOrderIdAndTransactionType(
                                order.getOrderId(),
                                OrderPolicy.DELIVERY_RETURN_IN
                        );

        if (physicallyReturned) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        order.setOrderStatus(OrderPolicy.SHIPPING);
        orders.save(order);

        audit.record(
                actor,
                "ORDER_RETRY_DELIVERY",
                "ORDER",
                order.getOrderId()
        );

        return query.adminDetailInternal(order);
    }

    private OrderAdminDetailDto complete(
            Long actor,
            Order order
    ) {
        if (OrderPolicy.COMPLETED.equals(
                order.getOrderStatus()
        )) {
            return query.adminDetailInternal(order);
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
                order.getOrderId()
        );

        return query.adminDetailInternal(order);
    }

    private OrderAdminDetailDto cancel(
            Long actor,
            Order order,
            String reason
    ) {
        if (OrderPolicy.CANCELLED.equals(
                order.getOrderStatus()
        )) {
            return query.adminDetailInternal(order);
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

        boolean stockWasDeducted =
                inventoryTransactions
                        .existsByOrderIdAndTransactionType(
                                order.getOrderId(),
                                OrderPolicy.ORDER_CONFIRM_OUT
                        );

        boolean stockAlreadyReturned =
                inventoryTransactions
                        .existsByOrderIdAndTransactionType(
                                order.getOrderId(),
                                OrderPolicy.ORDER_CANCEL_IN
                        )
                || inventoryTransactions
                        .existsByOrderIdAndTransactionType(
                                order.getOrderId(),
                                OrderPolicy.DELIVERY_RETURN_IN
                        );

        if (stockWasDeducted && !stockAlreadyReturned) {
            LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

            for (OrderItem item : orderItems(order.getOrderId())) {
                int updated = inventories.increment(
                        item.getVariantId(),
                        item.getQuantity(),
                        now
                );

                if (updated != 1) {
                    throw new IllegalStateException(
                            "Inventory row missing during cancellation"
                    );
                }

                recordInventory(
                        actor,
                        order.getOrderId(),
                        item.getVariantId(),
                        item.getQuantity(),
                        OrderPolicy.ORDER_CANCEL_IN,
                        reason
                );
            }
        }

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
                order.getOrderId()
        );

        return query.adminDetailInternal(order);
    }

    private OrderAdminDetailDto deliveryReturnIn(
            Long actor,
            Order order,
            String reason
    ) {
        if (!OrderPolicy.DELIVERY_FAILED.equals(
                order.getOrderStatus()
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        boolean alreadyReturned =
                inventoryTransactions
                        .existsByOrderIdAndTransactionType(
                                order.getOrderId(),
                                OrderPolicy.DELIVERY_RETURN_IN
                        );

        if (alreadyReturned) {
            return query.adminDetailInternal(order);
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        for (OrderItem item : orderItems(order.getOrderId())) {
            int updated = inventories.increment(
                    item.getVariantId(),
                    item.getQuantity(),
                    now
            );

            if (updated != 1) {
                throw new IllegalStateException(
                        "Inventory row missing during delivery return"
                );
            }

            recordInventory(
                    actor,
                    order.getOrderId(),
                    item.getVariantId(),
                    item.getQuantity(),
                    OrderPolicy.DELIVERY_RETURN_IN,
                    reason
            );
        }

        audit.record(
                actor,
                "ORDER_DELIVERY_RETURN_IN",
                "ORDER",
                order.getOrderId()
        );

        return query.adminDetailInternal(order);
    }

    private OrderAdminDetailDto simpleTransition(
            Long actor,
            Order order,
            String expected,
            String target,
            String auditAction
    ) {
        if (target.equals(order.getOrderStatus())) {
            return query.adminDetailInternal(order);
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
                order.getOrderId()
        );

        return query.adminDetailInternal(order);
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

    private void recordInventory(
            Long actor,
            Long orderId,
            Long variantId,
            int quantityDelta,
            String type,
            String reason
    ) {
        InventoryTransaction transaction =
                new InventoryTransaction();

        transaction.setVariantId(variantId);
        transaction.setQuantityDelta(quantityDelta);
        transaction.setTransactionType(type);
        transaction.setOrderId(orderId);
        transaction.setActorAccountId(actor);
        transaction.setReason(
                reason == null || reason.isBlank()
                        ? null
                        : reason.trim()
        );

        inventoryTransactions.save(transaction);
    }

    private String capability(String action) {
        return switch (action) {
            case "CONFIRM", "PREPARE" ->
                    OrderPolicy.ORDER_PROCESS;
            case "SHIP", "RETRY_DELIVERY", "COMPLETE" ->
                    OrderPolicy.ORDER_FULFILLMENT;
            case "DELIVERY_FAILED", "CANCEL", "DELIVERY_RETURN_IN" ->
                    OrderPolicy.ORDER_EXCEPTION;
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST
            );
        };
    }

    private void requireCapability(String permission) {
        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        boolean allowed = authentication != null
                && authentication.getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                "ROLE_SUPERADMIN".equals(
                                        authority.getAuthority()
                                )
                                || ("PERMISSION_" + permission)
                                        .equals(
                                                authority.getAuthority()
                                        )
                        );

        if (!allowed) {
            throw new AccessDeniedException("Forbidden");
        }
    }

    private Order locked(Long orderId) {
        return orders.findByIdForUpdate(orderId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
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
