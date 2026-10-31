package com.fido.modules.product.service;

import java.util.Map;

public record CatalogProductFilter(
        String query,
        Long categoryId,
        Long brandId,
        Long minPrice,
        Long maxPrice,
        Integer page,
        Integer pageSize,
        Map<String, String> attributeFilters) {
    public CatalogProductFilter {
        attributeFilters = Map.copyOf(attributeFilters == null ? Map.of() : attributeFilters);
    }

    public CatalogProductFilter(String query, Long categoryId, Long brandId,
            Long minPrice, Long maxPrice, Integer page, Integer pageSize) {
        this(query, categoryId, brandId, minPrice, maxPrice, page, pageSize, Map.of());
    }
}
