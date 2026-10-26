package com.fido.modules.product.dto.response;

public record ProductSummaryDto(
        Long product_id,
        Long parent_product_id,
        String sku,
        String name,
        String slug,
        String thumbnail,
        CategoryDto category,
        BrandDto brand,
        Long selling_price,
        String status) {}
