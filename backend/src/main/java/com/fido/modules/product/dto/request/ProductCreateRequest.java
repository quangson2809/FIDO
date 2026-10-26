package com.fido.modules.product.dto.request;

import tools.jackson.databind.annotation.JsonDeserialize;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ProductCreateRequest(
        @Positive Long parent_product_id,
        @Positive Long category_id,
        @Positive Long brand_id,
        @Size(max = 255) String name,
        @Size(max = 200) String slug,
        @NotBlank @Size(max = 100) String sku,
        String description,
        @NotNull @PositiveOrZero @JsonDeserialize(using = IntegerVndDeserializer.class) Long selling_price,
        @PositiveOrZero @JsonDeserialize(using = IntegerVndDeserializer.class) Long cost_price,
        @Pattern(regexp = "DRAFT|ACTIVE|INACTIVE|ARCHIVED") String status) {}
