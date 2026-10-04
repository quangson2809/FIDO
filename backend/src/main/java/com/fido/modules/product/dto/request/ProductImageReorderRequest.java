package com.fido.modules.product.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.List;

public record ProductImageReorderRequest(
        @NotNull
        List<@NotNull @Valid ImageOrder> images
) {

    public record ImageOrder(
            @NotNull @Positive Long image_id,
            @NotNull @PositiveOrZero Integer sort_order
    ) {
    }
}
