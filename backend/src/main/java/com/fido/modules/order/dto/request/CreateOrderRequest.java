package com.fido.modules.order.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body giữ thông tin nhận hàng và voucher; khóa chống lặp chỉ nhận qua header Idempotency-Key. */
public record CreateOrderRequest(
        @NotBlank @Size(max = 150) String recipient_name,
        @NotBlank @Size(max = 20) String recipient_phone,
        @NotBlank @Size(max = 120) String province,
        @NotBlank @Size(max = 120) String district,
        @NotBlank @Size(max = 120) String ward,
        @NotBlank @Size(max = 500) String address_line,
        @Size(max = 80) String voucher_code,
        @Size(max = 64) String confirmation_token) {
    public CreateOrderRequest(
            String recipient_name,
            String recipient_phone,
            String province,
            String district,
            String ward,
            String address_line,
            String voucher_code) {
        this(
                recipient_name,
                recipient_phone,
                province,
                district,
                ward,
                address_line,
                voucher_code,
                null);
    }
}
