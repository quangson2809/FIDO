package com.fido.modules.product.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record ProductSummaryDto(
        Long product_id,
        String name,
        String thumbnail,
        CategoryDto category,
        BrandDto brand,
        BigDecimal base_price,
        String sale_status,
        String material_care,
        List<SizeValueDto> sizes
) {
}
