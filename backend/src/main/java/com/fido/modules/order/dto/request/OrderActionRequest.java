package com.fido.modules.order.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record OrderActionRequest(
        @NotBlank
                @Pattern(
                        regexp = "CONFIRM|START_PREPARING|DISPATCH|MARK_DELIVERY_FAILED|RETRY_DELIVERY|CANCEL")
                String action,
        @Size(max = 500) String reason,
        @Size(max = 150) String carrier_name,
        @Size(max = 120) String tracking_number) {}
