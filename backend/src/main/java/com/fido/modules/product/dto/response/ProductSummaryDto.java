package com.fido.modules.product.dto.response;

import java.math.BigDecimal;

public record ProductSummaryDto(
        Long product_id,
        String name,
        String image_url,
        CategoryDto category,
        BrandDto brand,
        BigDecimal base_price,
        String sale_status
) {
}
