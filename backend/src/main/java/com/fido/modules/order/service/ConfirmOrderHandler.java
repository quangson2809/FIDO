package com.fido.modules.order.service;

import com.fido.modules.inventory.service.InventoryCommandService;
import com.fido.modules.order.dto.request.OrderActionRequest;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.ShippingInfo;
import com.fido.modules.order.repository.OrderRepository;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
class ConfirmOrderHandler implements OrderActionHandler {
    private final OrderRepository orders;
    private final InventoryCommandService inventory;
    private final OrderStockLines stockLines;

    ConfirmOrderHandler(
            OrderRepository orders, InventoryCommandService inventory, OrderStockLines stockLines) {
        this.orders = orders;
        this.inventory = inventory;
        this.stockLines = stockLines;
    }

    public List<OrderAction> actions() {
        return List.of(OrderAction.CONFIRM);
    }

    @Override
    public void execute(
            Long actor, Order order, ShippingInfo shipping, OrderActionRequest request) {
        inventory.deductConfirmedOrder(
                actor, order.getOrderId(), stockLines.load(order.getOrderId()), "ORDER_CONFIRM");

        order.setOrderStatus(OrderPolicy.CONFIRMED);
        orders.save(order);
    }
}
