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
    private final OrderStockLineLoader stockLines;

    ConfirmOrderHandler(
            OrderRepository orders,
            InventoryCommandService inventory,
            OrderStockLineLoader stockLines) {
        this.orders = orders;
        this.inventory = inventory;
        this.stockLines = stockLines;
    }

    public List<OrderAction> supportedActions() {
        return List.of(OrderAction.CONFIRM);
    }

    @Override
    public void execute(
            Long actor, Order order, ShippingInfo shipping, OrderActionRequest request) {
        inventory.deductConfirmedOrder(
                actor,
                order.getOrderId(),
                stockLines.loadForUpdate(order.getOrderId()),
                "ORDER_CONFIRM");

        order.setOrderStatus(OrderPolicy.CONFIRMED);
        orders.save(order);
    }
}
