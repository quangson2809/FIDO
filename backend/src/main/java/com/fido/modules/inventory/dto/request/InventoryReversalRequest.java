package com.fido.modules.inventory.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record InventoryReversalRequest(
        @NotBlank @Pattern(regexp = "COUNT_CORRECTION|DATA_CORRECTION|REVERSAL") @Size(max = 80)
                String reason_code,
        // Version của số dư hiện tại được kiểm tra trước khi tạo bút toán đảo, không phải version
        // bút toán gốc.
        @Min(0) Integer expected_version) {}
