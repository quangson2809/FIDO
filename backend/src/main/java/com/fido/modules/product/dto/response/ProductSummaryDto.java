package com.fido.modules.product.dto.response;
import java.math.BigDecimal;
<<<<<<< HEAD
public record ProductSummaryDto(Long product_id, String name, CategoryDto category, BrandDto brand,
                                BigDecimal base_price, String sale_status) {}
=======

public record ProductSummaryDto(
        Long product_id,
        String name,
        String thumbnail,
        CategoryDto category,
        BrandDto brand,
        BigDecimal base_price,
        String sale_status
) {
}
>>>>>>> fa78b77c4f9ff77546b2e352c6671bb30402c1d7
