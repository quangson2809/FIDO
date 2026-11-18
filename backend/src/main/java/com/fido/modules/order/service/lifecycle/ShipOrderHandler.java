package com.fido.modules.order.service.lifecycle;

import com.fido.modules.inventory.service.stock.InventoryCommandService;
import com.fido.modules.order.dto.request.OrderActionRequest;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.repository.OrderRepository;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
class ShipOrderHandler implements OrderActionHandler {
    private final OrderRepository orders;
    private final InventoryCommandService inventory;
    private final OrderStockLineLoader stockLines;

    ShipOrderHandler(
            OrderRepository orders,
            InventoryCommandService inventory,
            OrderStockLineLoader stockLines) {
        this.orders = orders;
        this.inventory = inventory;
        this.stockLines = stockLines;
    }

    public List<OrderAction> supportedActions() {
        return List.of(OrderAction.DISPATCH, OrderAction.RETRY_DELIVERY);
    }

    @Override
    public void execute(Long actor, Order order, OrderActionRequest request) {
        // Kiểm tra đã trừ kho hợp lệ; giao lần đầu hoặc giao lại đều không trừ kho lần nữa.
        inventory.requireConfirmedOrderMovements(
                order.getOrderId(), stockLines.loadForUpdate(order.getOrderId()));

        order.dispatch();
        orders.save(order);
    }
}
