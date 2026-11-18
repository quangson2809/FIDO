package com.fido.modules.order.service.lifecycle;

import com.fido.modules.inventory.service.stock.InventoryCommandService;
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
        // Kiểm tra đã trừ kho hợp lệ; giao lần đầu hoặc giao lại đều không trừ kho lần nữa.
        inventory.requireConfirmedOrderMovements(
                order.getOrderId(), stockLines.loadForUpdate(order.getOrderId()));

        order.dispatch();
        shipping.dispatch(
                LocalDateTime.now(ZoneOffset.UTC),
                request.carrier_name(),
                request.tracking_number());
        orders.save(order);
        shippingInfos.save(shipping);
    }
}
