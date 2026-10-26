package com.fido.modules.inventory.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.List;

public record GoodsReceiptCreateRequest(
        @NotNull @Positive Long supplier_id,
        @NotNull @Positive Long warehouse_id,
        @NotNull @Valid List<ItemInput> items) {

    public record ItemInput(
            @NotNull @Positive Long product_id,
            @NotNull @Positive Integer quantity,
            @NotNull @PositiveOrZero Long unit_cost) {}
}
