package com.fido.modules.order.service;

import com.fido.modules.inventory.service.InventoryCommandService;
import com.fido.modules.order.dto.request.OrderActionRequest;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.ShippingInfo;
import com.fido.modules.order.repository.OrderRepository;
import com.fido.modules.order.repository.ShippingInfoRepository;

import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Component
class ShipOrderHandler implements OrderActionHandler {
    private final OrderRepository orders;
    private final ShippingInfoRepository shippingInfos;
    private final InventoryCommandService inventory;
    private final OrderStockLineLoader stockLines;

    ShipOrderHandler(
            OrderRepository orders,
            ShippingInfoRepository shippingInfos,
            InventoryCommandService inventory,
            OrderStockLineLoader stockLines) {
        this.orders = orders;
        this.shippingInfos = shippingInfos;
        this.inventory = inventory;
        this.stockLines = stockLines;
    }

    public List<OrderAction> supportedActions() {
        return List.of(OrderAction.DISPATCH, OrderAction.RETRY_DELIVERY);
    }

    @Override
    public void execute(
            Long actor, Order order, ShippingInfo shipping, OrderActionRequest request) {
        inventory.requireConfirmedOrderMovements(
                order.getOrderId(), stockLines.loadForUpdate(order.getOrderId()));

        order.setOrderStatus(OrderPolicy.SHIPPING);
        shipping.setShippingStatus("SHIPPED");
        shipping.setShippedAt(LocalDateTime.now(ZoneOffset.UTC));
        applyManualTracking(shipping, request);
        orders.save(order);
        shippingInfos.save(shipping);
    }

    private void applyManualTracking(ShippingInfo shipping, OrderActionRequest request) {
        if (request.carrier_name() != null && !request.carrier_name().isBlank()) {
            shipping.setCarrierName(request.carrier_name().trim());
        }
        if (request.tracking_number() != null && !request.tracking_number().isBlank()) {
            shipping.setTrackingNumber(request.tracking_number().trim());
        }
    }
}
