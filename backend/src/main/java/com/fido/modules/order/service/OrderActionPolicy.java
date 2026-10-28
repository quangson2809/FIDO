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

import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Explicit Order transition table and prerequisites shared by action visibility and execution. */
@Service
public class OrderActionPolicy {
    private static final List<String> ACTIONS = List.of(
            "CONFIRM", "START_PREPARING", "DISPATCH",
            "MARK_DELIVERY_FAILED", "RETRY_DELIVERY", "CANCEL");
    private static final Map<String, String> TARGETS = Map.of(
            "CONFIRM", OrderPolicy.CONFIRMED,
            "START_PREPARING", OrderPolicy.PREPARING,
            "DISPATCH", OrderPolicy.SHIPPING,
            "MARK_DELIVERY_FAILED", OrderPolicy.DELIVERY_FAILED,
            "RETRY_DELIVERY", OrderPolicy.SHIPPING,
            "CANCEL", OrderPolicy.CANCELLED);

    private final InventoryMovementQueryService movements;
    private final ShippingInfoRepository shippingInfos;

    public OrderActionPolicy(
            InventoryMovementQueryService movements, ShippingInfoRepository shippingInfos) {
        this.movements = movements;
        this.shippingInfos = shippingInfos;
    }

    public List<String> allowedActions(Order order, Payment payment) {
        if (order == null || payment == null) return List.of();
        ShippingInfo shipping = shippingInfos.findById(order.getOrderId()).orElse(null);
        if (shipping == null) return List.of();
        OrderStockState stock = movements.orderStockState(order.getOrderId());
        return ACTIONS.stream()
                .filter(action -> canApply(order, payment, shipping, stock, action))
                .toList();
    }

    /** Called only after locking and re-reading the Order and its related state. */
    public void requireExecutable(
            Order order, Payment payment, ShippingInfo shipping, String action) {
        if (!TARGETS.containsKey(action)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ORDER_ACTION_INVALID");
        }
        if (TARGETS.get(action).equals(order.getOrderStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ORDER_TRANSITION_ALREADY_APPLIED");
        }
        OrderStockState stock = movements.orderStockState(order.getOrderId());
        if (!canApply(order, payment, shipping, stock, action)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ORDER_TRANSITION_NOT_ALLOWED");
        }
    }

    private boolean canApply(
            Order order, Payment payment, ShippingInfo shipping,
            OrderStockState stock, String action) {
        if (order == null || payment == null || shipping == null || stock == null
                || !TARGETS.containsKey(action)
                || !OrderPolicy.canTransition(order.getOrderStatus(), TARGETS.get(action))
                || !"COD".equals(payment.getMethod())
                || !Objects.equals(payment.getAmount(), order.getTotalAmount())
                || !Objects.equals(payment.getCurrency(), order.getCurrency())) {
            return false;
        }

        String from = order.getOrderStatus();
        boolean unpaid = OrderPolicy.UNPAID.equals(payment.getPaymentStatus())
                && Objects.equals(payment.getRefundAmount(), 0L)
                && payment.getCollectedByAccountId() == null
                && payment.getCollectedAt() == null
                && payment.getRefundedByAccountId() == null
                && payment.getRefundedAt() == null
                && payment.getRefundReason() == null;
        boolean deductedOnce = stock.deducted() && !stock.restored();

        return switch (action) {
            case "CONFIRM" ->
                    OrderPolicy.PENDING.equals(from) && unpaid
                            && "PENDING".equals(shipping.getShippingStatus())
                            && !stock.deducted() && !stock.restored();
            case "START_PREPARING" ->
                    OrderPolicy.CONFIRMED.equals(from) && unpaid
                            && "PENDING".equals(shipping.getShippingStatus()) && deductedOnce;
            case "DISPATCH" ->
                    OrderPolicy.PREPARING.equals(from) && unpaid
                            && "PENDING".equals(shipping.getShippingStatus()) && deductedOnce;
            case "MARK_DELIVERY_FAILED" ->
                    OrderPolicy.SHIPPING.equals(from) && unpaid
                            && "SHIPPED".equals(shipping.getShippingStatus()) && deductedOnce;
            case "RETRY_DELIVERY" ->
                    OrderPolicy.DELIVERY_FAILED.equals(from) && unpaid
                            && "FAILED".equals(shipping.getShippingStatus()) && deductedOnce;
            case "CANCEL" ->
                    unpaid && (
                            (OrderPolicy.PENDING.equals(from)
                                    && "PENDING".equals(shipping.getShippingStatus())
                                    && !stock.deducted() && !stock.restored())
                            || ((OrderPolicy.CONFIRMED.equals(from)
                                    || OrderPolicy.PREPARING.equals(from))
                                    && "PENDING".equals(shipping.getShippingStatus()) && deductedOnce)
                            || (OrderPolicy.DELIVERY_FAILED.equals(from)
                                    && "FAILED".equals(shipping.getShippingStatus()) && deductedOnce));
            default -> false;
        };
    }
}
