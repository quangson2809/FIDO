package com.fido.modules.order.service;

import com.fido.modules.inventory.service.InventoryCommandService;
import com.fido.modules.order.dto.request.OrderActionRequest;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.ShippingInfo;
import com.fido.modules.order.repository.OrderRepository;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
class StartPreparingOrderHandler implements OrderActionHandler {
    private final OrderRepository orders;
    private final InventoryCommandService inventory;
    private final OrderStockLineLoader stockLines;

    StartPreparingOrderHandler(
            OrderRepository orders,
            InventoryCommandService inventory,
            OrderStockLineLoader stockLines) {
        this.orders = orders;
        this.inventory = inventory;
        this.stockLines = stockLines;
    }

    public List<OrderAction> supportedActions() {
        return List.of(OrderAction.START_PREPARING);
    }

    @Override
    public void execute(
            Long actor, Order order, ShippingInfo shipping, OrderActionRequest request) {
        inventory.requireConfirmedOrderMovements(
                order.getOrderId(), stockLines.loadForUpdate(order.getOrderId()));

        order.setOrderStatus(OrderPolicy.PREPARING);
        orders.save(order);
    }
}
