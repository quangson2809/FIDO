package com.fido.modules.order.service.lifecycle;

import com.fido.modules.order.dto.request.OrderActionRequest;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.repository.OrderRepository;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
class MarkDeliveryFailedOrderHandler implements OrderActionHandler {
    private final OrderRepository orders;

    MarkDeliveryFailedOrderHandler(OrderRepository orders) {
        this.orders = orders;
    }

    public List<OrderAction> supportedActions() {
        return List.of(OrderAction.MARK_DELIVERY_FAILED);
    }

    @Override
    public void execute(Long actor, Order order, OrderActionRequest request) {

        order.markDeliveryFailed();
        orders.save(order);
    }
}
