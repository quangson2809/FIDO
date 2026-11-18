package com.fido.modules.order.mapper;

import com.fido.modules.order.dto.response.OrderConfirmationDto;
import com.fido.modules.order.dto.response.OrderItemDto;
import com.fido.modules.order.dto.response.OrderSummaryDto;
import com.fido.modules.order.dto.response.PaymentAdminDto;
import com.fido.modules.order.dto.response.PaymentPublicDto;
import com.fido.modules.order.dto.response.RecipientDto;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.OrderAddress;
import com.fido.modules.order.entity.OrderItem;
import com.fido.modules.order.entity.Payment;

public final class OrderMapper {
    private OrderMapper() {}

    public static RecipientDto recipient(OrderAddress address) {
        String formattedAddress =
                String.join(
                        ", ",
                        address.getAddressLine(),
                        address.getWard(),
                        address.getDistrict(),
                        address.getProvince());
        return new RecipientDto(
                address.getRecipientName(), address.getRecipientPhone(), null, formattedAddress);
    }

    public static OrderItemDto item(OrderItem item) {
        return new OrderItemDto(
                item.getOrderItemId(),
                item.getProductId(),
                item.getProductNameSnapshot(),
                item.getImageUrlSnapshot(),
                item.getSkuSnapshot(),
                item.getUnitPrice(),
                item.getQuantity(),
                item.getLineTotal(),
                item.getDiscountAmount(),
                item.getAttributeSnapshot());
    }

    public static PaymentPublicDto paymentPublic(Payment payment) {
        return new PaymentPublicDto(
                payment.getPaymentStatus(),
                payment.getAmount(),
                "PAID".equals(payment.getPaymentStatus()) ? payment.getAmount() : 0L,
                payment.getRefundAmount() == null ? 0L : payment.getRefundAmount());
    }

    public static PaymentAdminDto paymentAdmin(Payment payment) {
        return new PaymentAdminDto(
                payment.getPaymentStatus(),
                payment.getAmount(),
                "PAID".equals(payment.getPaymentStatus()) ? payment.getAmount() : 0L,
                payment.getRefundAmount() == null ? 0L : payment.getRefundAmount(),
                payment.getCollectedByAccountId(),
                payment.getCollectedAt(),
                payment.getRefundedByAccountId(),
                payment.getRefundedAt());
    }

    public static OrderSummaryDto summary(Order order, Payment payment, String imageUrl) {
        return new OrderSummaryDto(
                order.getOrderId(),
                order.getOrderCode(),
                order.getOrderStatus(),
                payment.getPaymentStatus(),
                imageUrl,
                order.getTotalAmount(),
                order.getCreatedAt(),
                payment.getCollectedAt(),
                payment.getRefundedAt());
    }

    public static OrderConfirmationDto confirmation(
            Order order, Payment payment, OrderAddress address) {
        return new OrderConfirmationDto(
                order.getOrderId(),
                order.getOrderCode(),
                order.getOrderStatus(),
                paymentPublic(payment),
                order.getSubtotal(),
                order.getDiscountAmount(),
                order.getShippingFee(),
                order.getTotalAmount(),
                recipient(address),
                order.getCreatedAt());
    }
}
