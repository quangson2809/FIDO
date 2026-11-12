package com.fido.modules.order.service;

import com.fido.modules.order.dto.request.OrderActionRequest;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.ShippingInfo;

import java.util.List;

interface OrderActionHandler {
    List<OrderAction> supportedActions();

    void execute(Long actor, Order order, ShippingInfo shipping, OrderActionRequest request);
}
