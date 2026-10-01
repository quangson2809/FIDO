package com.fido.modules.order.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PaymentActionRequest(
        @NotBlank
        @Pattern(regexp = "COLLECT_COD|REFUND")
        String action
) {
}
