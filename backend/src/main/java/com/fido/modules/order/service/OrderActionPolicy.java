package com.fido.modules.order.service;

import com.fido.modules.inventory.service.InventoryMovementQueryService;
import com.fido.modules.inventory.service.InventoryMovementQueryService.OrderStockState;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.Payment;
import com.fido.modules.order.entity.ShippingInfo;
import com.fido.modules.order.repository.ShippingInfoRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * Shared business policy for both admin action visibility and execution.
 *
 * <p>This is a domain policy, NOT the GoF State pattern. OrderPolicy stores
 * the allowed transition graph; this class enforces payment, shipping and
 * inventory prerequisites for each action.
 *
 * <p>Call requireExecutable only AFTER acquiring the Order write lock.
 * allowedActions is an advisory UI view, never the authoritative guard.
 */
@Service
public class OrderActionPolicy {
    private final InventoryMovementQueryService movements;
    private final ShippingInfoRepository shippingInfos;

    public OrderActionPolicy(
            InventoryMovementQueryService movements, ShippingInfoRepository shippingInfos) {
        this.movements = movements;
        this.shippingInfos = shippingInfos;
    }

    /** List the currently permitted actions; execution will check again under lock. */
    public List<String> allowedActions(Order order, Payment payment) {
        if (order == null || payment == null) return List.of();
        ShippingInfo shipping = shippingInfos.findById(order.getOrderId()).orElse(null);
        if (shipping == null) return List.of();

        OrderStockState stock = movements.orderStockState(order.getOrderId());
        return Arrays.stream(OrderAction.values())
                .filter(action -> canApply(order, payment, shipping, stock, action))
                .map(OrderAction::name)
                .toList();
    }

    /** Authoritative guard for a locked Order; error codes remain unchanged. */
    public void requireExecutable(
            Order order, Payment payment, ShippingInfo shipping, String action) {
        OrderAction parsed = OrderAction.require(action);
        if (parsed.targetStatus().equals(order.getOrderStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "ORDER_TRANSITION_ALREADY_APPLIED");
        }
        OrderStockState stock = movements.orderStockState(order.getOrderId());
        if (!canApply(order, payment, shipping, stock, parsed)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "ORDER_TRANSITION_NOT_ALLOWED");
        }
    }

    private boolean canApply(
            Order order, Payment payment, ShippingInfo shipping,
            OrderStockState stock, OrderAction action) {
        if (order == null || payment == null || shipping == null || stock == null
                || !OrderPolicy.canTransition(order.getOrderStatus(), action.targetStatus())
                || !"COD".equals(payment.getMethod())
                || !Objects.equals(payment.getAmount(), order.getTotalAmount())
                || !Objects.equals(payment.getCurrency(), order.getCurrency())
                || !isCleanUnpaidPayment(payment)) {
            return false;
        }

        // Every manual Order action requires a still-uncollected COD payment.
        // The old implementation repeated this SAME prerequisite six times.
        String from = order.getOrderStatus();
        String shippingStatus = shipping.getShippingStatus();
        boolean noStockMovement = !stock.deducted() && !stock.restored();
        boolean deductedNotRestored = stock.deducted() && !stock.restored();

        return switch (action) {
            case CONFIRM ->
                    OrderPolicy.PENDING.equals(from)
                            && "PENDING".equals(shippingStatus)
                            && noStockMovement;
            case START_PREPARING ->
                    OrderPolicy.CONFIRMED.equals(from)
                            && "PENDING".equals(shippingStatus)
                            && deductedNotRestored;
            case DISPATCH ->
                    OrderPolicy.PREPARING.equals(from)
                            && "PENDING".equals(shippingStatus)
                            && deductedNotRestored;
            case MARK_DELIVERY_FAILED ->
                    OrderPolicy.SHIPPING.equals(from)
                            && "SHIPPED".equals(shippingStatus)
                            && deductedNotRestored;
            case RETRY_DELIVERY ->
                    OrderPolicy.DELIVERY_FAILED.equals(from)
                            && "FAILED".equals(shippingStatus)
                            && deductedNotRestored;
            case CANCEL ->
                    (OrderPolicy.PENDING.equals(from)
                                    && "PENDING".equals(shippingStatus)
                                    && noStockMovement)
                            || ((OrderPolicy.CONFIRMED.equals(from)
                                            || OrderPolicy.PREPARING.equals(from))
                                    && "PENDING".equals(shippingStatus)
                                    && deductedNotRestored)
                            || (OrderPolicy.DELIVERY_FAILED.equals(from)
                                    && "FAILED".equals(shippingStatus)
                                    && deductedNotRestored);
        };
    }

    /** A COD record must have no collected/refunded data, including audit columns. */
    private static boolean isCleanUnpaidPayment(Payment payment) {
        return OrderPolicy.UNPAID.equals(payment.getPaymentStatus())
                && Objects.equals(payment.getRefundAmount(), 0L)
                && payment.getCollectedByAccountId() == null
                && payment.getCollectedAt() == null
                && payment.getRefundedByAccountId() == null
                && payment.getRefundedAt() == null
                && payment.getRefundReason() == null;
    }
}
