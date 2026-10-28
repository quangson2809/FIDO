package com.fido.modules.order.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record OrderCustomerDetailDto(
        Long order_id,
        String order_code,
        String order_status,
        RecipientDto recipient,
        List<OrderItemDto> items,
        Long subtotal,
        Long discount,
        Long shipping_fee,
        Long total,
        PaymentPublicDto payment,
        ShippingInfoDto shipping_info,
        LocalDateTime completed_at,
        LocalDateTime returned_at,
        LocalDateTime created_at,
        LocalDateTime updated_at) {}
