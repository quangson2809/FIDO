package com.fido.modules.inventory.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;
import java.util.List;

public record GoodsReceiptCreateRequest(
        @NotNull @Positive Long supplier_id,
        @NotNull LocalDate receipt_date,
        String note,
        @NotNull @Valid List<ItemInput> items
) {

    public record ItemInput(
            @NotNull @Positive Long variant_id,
            @NotNull @Positive Integer quantity
    ) {
    }
}
