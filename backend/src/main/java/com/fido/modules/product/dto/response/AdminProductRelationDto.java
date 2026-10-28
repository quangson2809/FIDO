package com.fido.modules.product.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record AdminProductRelationDto(
        Long product_id,
        Long parent_product_id,
        String sku,
        String name,
        String slug,
        String description,
        CategoryDto category,
        BrandDto brand,
        Long category_id,
        Long brand_id,
        Long selling_price,
        Long cost_price,
        String status,
        List<ProductAttributeValueDto> attribute_values,
        List<ProductImageDto> images,
        LocalDateTime created_at,
        LocalDateTime updated_at) {}
