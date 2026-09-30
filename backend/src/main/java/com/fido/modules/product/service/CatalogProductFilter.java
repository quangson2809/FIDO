package com.fido.modules.product.service;

import java.math.BigDecimal;

public record CatalogProductFilter(
        String query,
        Long categoryId,
        Long brandId,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        Long sizeValueId,
        Long colorId,
        String gender,
        String season,
        String style,
        Integer page,
        Integer pageSize
) {
}
