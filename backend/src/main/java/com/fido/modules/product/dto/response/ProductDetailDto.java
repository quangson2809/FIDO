package com.fido.modules.product.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record ProductDetailDto(
        Long product_id,
        Long parent_product_id,
        String sku,
        String name,
        String slug,
        String description,
        CategoryDto category,
        BrandDto brand,
        Long selling_price,
        String status,
        List<ProductImageDto> images,
        LocalDateTime created_at,
        LocalDateTime updated_at,
        List<ProductAttributeValueDto> attribute_values,
        ProductFamilyDto family) {}
