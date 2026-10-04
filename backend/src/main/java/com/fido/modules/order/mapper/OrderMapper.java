package com.fido.modules.order.mapper;

import com.fido.modules.order.dto.response.OrderConfirmationDto;
import com.fido.modules.order.dto.response.OrderItemDto;
import com.fido.modules.order.dto.response.OrderSummaryDto;
import com.fido.modules.order.dto.response.PaymentAdminDto;
import com.fido.modules.order.dto.response.PaymentPublicDto;
import com.fido.modules.order.dto.response.RecipientDto;
import com.fido.modules.order.dto.response.ShippingInfoDto;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.OrderItem;
import com.fido.modules.order.entity.Payment;
import com.fido.modules.order.entity.ShippingInfo;

public final class OrderMapper {

    private OrderMapper() {
    }

    public static RecipientDto recipient(Order order) {
        return new RecipientDto(
                order.getRecipientPhone(),
                order.getRecipientEmail(),
                order.getRecipientAddress()
        );
    }

    public static OrderItemDto item(OrderItem item) {
        return new OrderItemDto(
                item.getOrderItemId(),
                item.getVariantId(),
                item.getProductNameSnapshot(),
                item.getImageUrlSnapshot(),
                item.getSkuSnapshot(),
                item.getSizeSnapshot(),
                item.getColorSnapshot(),
                item.getUnitPriceSnapshot(),
                item.getQuantity(),
                item.getLineTotalSnapshot()
        );
    }

    public static PaymentPublicDto paymentPublic(Payment payment) {
        return new PaymentPublicDto(
                payment.getPaymentStatus(),
                payment.getAmountDue(),
                payment.getAmountReceived(),
                payment.getAmountRefunded()
        );
    }

    public static PaymentAdminDto paymentAdmin(Payment payment) {
        return new PaymentAdminDto(
                payment.getPaymentStatus(),
                payment.getAmountDue(),
                payment.getAmountReceived(),
                payment.getAmountRefunded(),
                payment.getCollectedByAccountId(),
                payment.getCollectedAt(),
                payment.getRefundedByAccountId(),
                payment.getRefundedAt()
        );
    }

    public static ShippingInfoDto shipping(ShippingInfo shipping) {
        if (shipping == null) {
            return null;
        }
        return new ShippingInfoDto(
                shipping.getDeliveryMode(),
                shipping.getCarrierName()
        );
    }

    public static OrderSummaryDto summary(
            Order order,
            Payment payment,
            String imageUrl
    ) {
        return new OrderSummaryDto(
                order.getOrderId(),
                order.getOrderCode(),
                order.getOrderStatus(),
                payment.getPaymentStatus(),
                imageUrl,
                order.getTotalSnapshot(),
                order.getCreatedAt(),
                order.getCompletedAt(),
                order.getReturnedAt()
        );
    }

    public static OrderConfirmationDto confirmation(Order order, Payment payment) {
        return new OrderConfirmationDto(
                order.getOrderId(),
                order.getOrderCode(),
                order.getOrderStatus(),
                paymentPublic(payment),
                order.getSubtotalSnapshot(),
                order.getDiscountSnapshot(),
                order.getShippingFeeSnapshot(),
                order.getTotalSnapshot(),
                recipient(order),
                order.getCreatedAt()
        );
    }
}
