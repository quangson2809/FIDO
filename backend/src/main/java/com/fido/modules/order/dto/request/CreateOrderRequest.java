package com.fido.modules.order.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateOrderRequest(
        @NotBlank @Size(max = 20) String recipient_phone,
        @Email @Size(max = 254) String recipient_email,
        @NotBlank @Size(max = 500) String recipient_address,
        @Size(max = 80) String voucher_code,
        @Size(max = 36) String quote_id
) {
    public CreateOrderRequest(String phone, String email, String address, String voucherCode) {
        this(phone,email,address,voucherCode,null);
    }
}
