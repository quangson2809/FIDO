package com.fido.modules.order.service.lifecycle;

import com.fido.modules.inventory.service.stock.InventoryCommandService;
import com.fido.modules.inventory.service.stock.InventoryCommandService.StockLine;
import com.fido.modules.order.dto.request.OrderActionRequest;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.repository.OrderRepository;
import com.fido.modules.order.service.OrderPolicy;
import com.fido.modules.promotion.service.VoucherRedemptionService;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
class CancelOrderHandler implements OrderActionHandler {
    private final OrderRepository orders;
    private final InventoryCommandService inventory;
    private final OrderStockLineLoader stockLines;
    private final VoucherRedemptionService voucherRedemption;

    CancelOrderHandler(
            OrderRepository orders,
            InventoryCommandService inventory,
            OrderStockLineLoader stockLines,
            VoucherRedemptionService voucherRedemption) {
        this.orders = orders;
        this.inventory = inventory;
        this.stockLines = stockLines;
        this.voucherRedemption = voucherRedemption;
    }

    public List<OrderAction> supportedActions() {
        return List.of(OrderAction.CANCEL);
    }

    @Override
    public void execute(Long actor, Order order, OrderActionRequest request) {
        String fromOrderStatus = order.getOrderStatus();
        List<StockLine> lines = stockLines.loadForUpdate(order.getOrderId());

        // Đơn PENDING chưa trừ kho; các trạng thái đã xác nhận phải đảo bút toán gốc khi hủy.
        if (!OrderPolicy.PENDING.equals(fromOrderStatus)
                && !"DELIVERY_FAILED".equals(fromOrderStatus)) {
            inventory.restoreCancelledOrder(actor, order.getOrderId(), lines, "ORDER_CANCELLED");
        }

        order.cancel();
        orders.save(order);

        // Chuyển trạng thái dưới khóa bảo đảm chỉ giải phóng lượt voucher một lần trong cùng giao
        // dịch.
        voucherRedemption.release(order.getVoucherId());
    }
}
