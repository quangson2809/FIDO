package com.fido.modules.order.service;

import com.fido.modules.inventory.service.InventoryCommandService.StockLine;
import com.fido.modules.order.entity.OrderItem;
import com.fido.modules.order.repository.OrderItemRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Component
class OrderStockLineLoader {
    private final OrderItemRepository items;

    OrderStockLineLoader(OrderItemRepository items) {
        this.items = items;
    }

    /**
     * orderId thuộc đơn đã khóa; đọc và khóa OrderItem để lấy số lượng nguồn cho bút toán kho.
     * Không lấy số lượng trừ/hoàn từ request hoặc catalog hiện tại.
     */
    List<StockLine> loadForUpdate(Long orderId) {
        List<OrderItem> orderItems = items.findAllByOrderIdForUpdate(orderId);
        if (orderItems.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ORDER_ITEMS_MISSING");
        }
        return orderItems.stream()
                .map(
                        item ->
                                new StockLine(
                                        item.getProductId(),
                                        item.getQuantity(),
                                        item.getOrderItemId()))
                .toList();
    }
}
