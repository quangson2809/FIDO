package com.fido.modules.order.service;

import com.fido.modules.inventory.service.InventoryCommandService;
import com.fido.modules.inventory.service.InventoryCommandService.StockLine;
import com.fido.modules.order.dto.request.OrderActionRequest;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.ShippingInfo;
import com.fido.modules.order.repository.OrderRepository;
import com.fido.modules.order.repository.ShippingInfoRepository;
import com.fido.modules.promotion.service.VoucherRedemptionService;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
class CancelOrderHandler implements OrderActionHandler {
    private final OrderRepository orders;
    private final ShippingInfoRepository shippingInfos;
    private final InventoryCommandService inventory;
    private final OrderStockLineLoader stockLines;
    private final VoucherRedemptionService voucherRedemption;

    CancelOrderHandler(
            OrderRepository orders,
            ShippingInfoRepository shippingInfos,
            InventoryCommandService inventory,
            OrderStockLineLoader stockLines,
            VoucherRedemptionService voucherRedemption) {
        this.orders = orders;
        this.shippingInfos = shippingInfos;
        this.inventory = inventory;
        this.stockLines = stockLines;
        this.voucherRedemption = voucherRedemption;
    }

    public List<OrderAction> supportedActions() {
        return List.of(OrderAction.CANCEL);
    }

    @Override
    public void execute(
            Long actor, Order order, ShippingInfo shipping, OrderActionRequest request) {
        String fromOrderStatus = order.getOrderStatus();
        List<StockLine> lines = stockLines.loadForUpdate(order.getOrderId());

        if (!OrderPolicy.PENDING.equals(fromOrderStatus)) {
            inventory.restoreCancelledOrder(actor, order.getOrderId(), lines, "ORDER_CANCELLED");
        }

        order.setOrderStatus(OrderPolicy.CANCELLED);
        shipping.setShippingStatus("CANCELLED");
        orders.save(order);
        shippingInfos.save(shipping);

        // The locked Order transition is the one-time release guard; both writes share this
        // transaction.
        voucherRedemption.release(order.getVoucherId());
    }
}
