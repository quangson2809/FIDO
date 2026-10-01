package com.fido.modules.order.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record OrderActionRequest(
        @NotBlank
        @Pattern(regexp = "CONFIRM|PREPARE|SHIP|DELIVERY_FAILED|RETRY_DELIVERY|CANCEL|COMPLETE|DELIVERY_RETURN_IN")
        String action,
        @Size(max = 500) String reason
) {
}
