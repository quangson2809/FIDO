package com.fido.modules.order.service;

import com.fido.modules.order.dto.response.OrderSummaryDto;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.OrderItem;
import com.fido.modules.order.entity.Payment;
import com.fido.modules.order.entity.ShippingInfo;
import com.fido.modules.order.mapper.OrderMapper;
import com.fido.modules.order.repository.OrderItemRepository;
import com.fido.modules.order.repository.PaymentRepository;
import com.fido.modules.order.repository.ShippingInfoRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class OrderSummaryReadService {

    private final OrderItemRepository items;
    private final PaymentRepository payments;
    private final ShippingInfoRepository shippingInfos;

    public OrderSummaryReadService(
            OrderItemRepository items,
            PaymentRepository payments,
            ShippingInfoRepository shippingInfos) {
        this.items = items;
        this.payments = payments;
        this.shippingInfos = shippingInfos;
    }

    public List<OrderSummaryDto> summaries(List<Order> orders) {
        if (orders.isEmpty()) {
            return List.of();
        }

        List<Long> orderIds = orders.stream().map(Order::getOrderId).toList();
        Map<Long, Payment> paymentsByOrderId =
                payments.findAllByOrderIdIn(orderIds).stream()
                        .collect(Collectors.toMap(Payment::getOrderId, Function.identity()));
        Map<Long, OrderItem> firstItemsByOrderId =
                items.findFirstItemsByOrderIdIn(orderIds).stream()
                        .collect(Collectors.toMap(OrderItem::getOrderId, Function.identity()));
        Map<Long, ShippingInfo> shippingByOrderId =
                shippingInfos.findAllByOrderIdIn(orderIds).stream()
                        .collect(Collectors.toMap(ShippingInfo::getOrderId, Function.identity()));

        return orders.stream()
                .map(
                        order ->
                                OrderMapper.summary(
                                        order,
                                        payment(paymentsByOrderId, order.getOrderId()),
                                        previewImage(firstItemsByOrderId.get(order.getOrderId())),
                                        shippingByOrderId.get(order.getOrderId())))
                .toList();
    }

    private String previewImage(OrderItem firstItem) {
        return firstItem == null ? null : firstItem.getImageUrlSnapshot();
    }

    private Payment payment(Map<Long, Payment> paymentsByOrderId, Long orderId) {
        Payment payment = paymentsByOrderId.get(orderId);
        if (payment == null) {
            throw new IllegalStateException("Order payment is missing");
        }
        return payment;
    }
}
