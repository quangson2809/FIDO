package com.fido.modules.product.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record ProductCreateRequest(
        @NotNull @Positive Long category_id,
        @Positive Long brand_id,
        @NotNull @Positive Long size_system_id,
        @NotBlank @Size(max = 255) String name,
        String description,
        @Size(max = 50) String gender,
        @Size(max = 80) String season,
        @Size(max = 100) String style,
        String material_care,
        @NotNull @DecimalMin("0.0") BigDecimal base_price,
        @NotBlank @Pattern(regexp = "ON_SALE|STOPPED") String sale_status,
        @Valid List<ImageInput> images,
        @Valid List<VariantInput> variants
) {

    public record ImageInput(
            @NotBlank @Size(max = 1000) String image_url,
            @Size(max = 255) String alt_text
    ) {
    }

    public record VariantInput(
            @NotNull @Positive Long size_value_id,
            @NotNull @Positive Long color_id,
            @Size(max = 100) String sku,
            @DecimalMin("0.0") BigDecimal override_price,
            @NotBlank @Pattern(regexp = "ON_SALE|STOPPED") String sale_status
    ) {
    }
}
