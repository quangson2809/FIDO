package com.fido.modules.product.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record AdminProductDetailDto(
        Long product_id,
        Long parent_product_id,
        List<Long> child_product_ids,
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
        List<ProductImageDto> images,
        LocalDateTime created_at,
        LocalDateTime updated_at,
        List<ProductAttributeValueDto> attribute_values,
        AdminProductRelationDto parent_product,
        List<AdminProductRelationDto> children) {}
