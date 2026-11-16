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
 * Dùng chung điều kiện cho nút quản trị và lúc thực thi. Đây là policy, không phải GoF State; chỉ gọi
 * requireExecutable sau khi đã khóa đơn.
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

    /** Danh sách này chỉ gợi ý cho UI; thực thi phải kiểm tra lại dưới khóa đơn. */
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

    /** Kiểm tra Order/Payment/Shipping và ledger hiện tại sau khi bên gọi đã khóa đơn. */
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

        // Mọi hành động thủ công bên dưới đều yêu cầu COD chưa thu và chưa có dấu vết hoàn tiền.
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

    /** UNPAID chưa đủ: dữ liệu người/thời điểm thu, hoàn tiền cũng phải còn trống. */
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
