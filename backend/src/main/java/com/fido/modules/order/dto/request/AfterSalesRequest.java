package com.fido.modules.order.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AfterSalesRequest(
        @NotBlank @Pattern(regexp = "RETURN_AND_REFUND_FULL") String action,
        @NotBlank @Size(max = 500) String reason) {}
