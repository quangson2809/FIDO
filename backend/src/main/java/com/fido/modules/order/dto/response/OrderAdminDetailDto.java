package com.fido.modules.order.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record OrderAdminDetailDto(
        Long order_id,
        String order_code,
        String order_status,
        RecipientDto recipient,
        List<OrderItemDto> items,
        Long subtotal,
        Long discount,
        Long shipping_fee,
        Long total,
        ShippingInfoDto shipping_info,
        LocalDateTime completed_at,
        LocalDateTime returned_at,
        LocalDateTime created_at,
        LocalDateTime updated_at,
        Long customer_account_id,
        Long voucher_id,
        String customer_service_note,
        String cancel_reason,
        PaymentAdminDto payment,
        List<String> allowed_actions) {
    /** Compatibility adapter for old test fixtures; the HTTP money contract is integer VND. */
    public OrderAdminDetailDto(
            Long order_id, String order_code, String order_status, RecipientDto recipient,
            List<OrderItemDto> items, BigDecimal subtotal, BigDecimal discount, BigDecimal shipping_fee,
            BigDecimal total, ShippingInfoDto shipping_info, LocalDateTime completed_at,
            LocalDateTime returned_at, LocalDateTime created_at, LocalDateTime updated_at,
            Long customer_account_id, Long voucher_id, String customer_service_note, String cancel_reason,
            PaymentAdminDto payment, List<String> allowed_actions) {
        this(order_id, order_code, order_status, recipient, items, exactVnd(subtotal), exactVnd(discount),
                exactVnd(shipping_fee), exactVnd(total), shipping_info, completed_at, returned_at,
                created_at, updated_at, customer_account_id, voucher_id, customer_service_note,
                cancel_reason, payment, allowed_actions);
    }
    private static Long exactVnd(BigDecimal amount) { return amount == null ? null : amount.longValueExact(); }
}
