package com.fido.modules.product.service;

public record CatalogProductFilter(
        String query,
        Long categoryId,
        Long brandId,
        Long minPrice,
        Long maxPrice,
        Integer page,
        Integer pageSize) {}
