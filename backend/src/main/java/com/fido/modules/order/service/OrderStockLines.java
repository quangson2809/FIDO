package com.fido.modules.order.service;

import com.fido.modules.inventory.service.InventoryCommandService.StockLine;
import com.fido.modules.order.entity.OrderItem;
import com.fido.modules.order.repository.OrderItemRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Component
class OrderStockLines {
    private final OrderItemRepository items;

    OrderStockLines(OrderItemRepository items) {
        this.items = items;
    }

    List<StockLine> load(Long orderId) {
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
