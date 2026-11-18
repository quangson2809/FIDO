package com.fido.modules.order.service.lifecycle;

import com.fido.modules.inventory.service.InventoryMovementQueryService;
import com.fido.modules.inventory.service.InventoryMovementQueryService.OrderStockState;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.Payment;
import com.fido.modules.order.service.OrderPolicy;

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

    public OrderActionPolicy(InventoryMovementQueryService movements) {
        this.movements = movements;
    }

    /** Danh sách này chỉ gợi ý cho UI; thực thi phải kiểm tra lại dưới khóa đơn. */
    public List<String> allowedActions(Order order, Payment payment) {
        if (order == null || payment == null) return List.of();

        OrderStockState stock = movements.orderStockState(order.getOrderId());
        return Arrays.stream(OrderAction.values())
                .filter(action -> canApply(order, payment, stock, action))
                .map(OrderAction::name)
                .toList();
    }

    public List<String> customerAllowedActions(Order order, Payment payment) {
        return canCustomerCancel(order, payment) ? List.of(OrderAction.CANCEL.name()) : List.of();
    }

    /** Chỉ gọi sau khi khóa đơn của chính tài khoản đăng nhập. */
    public void requireCustomerCancellation(Order order, Payment payment) {
        if (!canCustomerCancel(order, payment)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ORDER_TRANSITION_NOT_ALLOWED");
        }
    }

    private boolean canCustomerCancel(Order order, Payment payment) {
        return order != null
                && OrderPolicy.PENDING.equals(order.getOrderStatus())
                && canApply(
                        order,
                        payment,
                        movements.orderStockState(order.getOrderId()),
                        OrderAction.CANCEL);
    }

    /** Kiểm tra Order/Payment và ledger hiện tại sau khi bên gọi đã khóa đơn. */
    public void requireExecutable(Order order, Payment payment, String action) {
        OrderAction parsed = OrderAction.require(action);
        if (parsed.targetStatus().equals(order.getOrderStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "ORDER_TRANSITION_ALREADY_APPLIED");
        }
        OrderStockState stock = movements.orderStockState(order.getOrderId());
        if (!canApply(order, payment, stock, parsed)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ORDER_TRANSITION_NOT_ALLOWED");
        }
    }

    private boolean canApply(
            Order order, Payment payment, OrderStockState stock, OrderAction action) {
        if (order == null
                || payment == null
                || stock == null
                || !OrderPolicy.canTransition(order.getOrderStatus(), action.targetStatus())
                || !Objects.equals(payment.getAmount(), order.getTotalAmount())
                || !payment.isUncollected()) {
            return false;
        }

        // Mọi hành động thủ công bên dưới đều yêu cầu COD chưa thu và chưa có dấu vết hoàn tiền.
        String from = order.getOrderStatus();
        boolean noStockMovement = !stock.deducted() && !stock.restored();
        boolean deductedNotRestored = stock.deducted() && !stock.restored();

        return switch (action) {
            case CONFIRM -> OrderPolicy.PENDING.equals(from) && noStockMovement;
            case START_PREPARING -> OrderPolicy.CONFIRMED.equals(from) && deductedNotRestored;
            case DISPATCH -> OrderPolicy.PREPARING.equals(from) && deductedNotRestored;
            case MARK_DELIVERY_FAILED -> OrderPolicy.SHIPPING.equals(from) && deductedNotRestored;
            case RETRY_DELIVERY -> OrderPolicy.DELIVERY_FAILED.equals(from) && deductedNotRestored;
            case CANCEL ->
                    (OrderPolicy.PENDING.equals(from) && noStockMovement)
                            || ((OrderPolicy.CONFIRMED.equals(from)
                                            || OrderPolicy.PREPARING.equals(from))
                                    && deductedNotRestored)
                            || (OrderPolicy.DELIVERY_FAILED.equals(from) && deductedNotRestored);
        };
    }
}
