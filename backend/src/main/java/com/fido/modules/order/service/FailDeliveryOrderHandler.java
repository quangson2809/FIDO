package com.fido.modules.order.service;

import com.fido.modules.order.dto.request.OrderActionRequest;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.ShippingInfo;
import com.fido.modules.order.repository.OrderRepository;
import com.fido.modules.order.repository.ShippingInfoRepository;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
class FailDeliveryOrderHandler implements OrderActionHandler {
    private final OrderRepository orders;
    private final ShippingInfoRepository shippingInfos;

    FailDeliveryOrderHandler(OrderRepository orders, ShippingInfoRepository shippingInfos) {
        this.orders = orders;
        this.shippingInfos = shippingInfos;
    }

    public List<OrderAction> actions() {
        return List.of(OrderAction.MARK_DELIVERY_FAILED);
    }

    @Override
    public void execute(
            Long actor, Order order, ShippingInfo shipping, OrderActionRequest request) {

        order.setOrderStatus(OrderPolicy.DELIVERY_FAILED);
        shipping.setShippingStatus("FAILED");
        orders.save(order);
        shippingInfos.save(shipping);
    }
}
