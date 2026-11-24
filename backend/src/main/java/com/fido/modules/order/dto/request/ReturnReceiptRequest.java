package com.fido.modules.order.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

public record ReturnReceiptRequest(
        @NotBlank @Pattern(regexp = "[A-Za-z0-9._:-]{1,80}") String source_operation_id,
        @NotBlank @Size(max = 500) String reason,
        @NotEmpty @Size(max = 100) List<@Valid Line> items) {
    public record Line(
            @NotNull @Positive Long order_item_id,
            @Positive int received_quantity,
            @Min(0) int sellable_quantity) {}
}
