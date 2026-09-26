package com.fido.modules.inventory.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record GoodsReceiptActionRequest(
        @NotBlank
        @Pattern(regexp = "CONFIRM|CANCEL")
        String action
) {
}
