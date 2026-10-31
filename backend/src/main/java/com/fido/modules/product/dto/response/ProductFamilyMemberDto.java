package com.fido.modules.product.dto.response;

import java.util.List;

public record ProductFamilyMemberDto(
        Long product_id,
        Long parent_product_id,
        String sku,
        String name,
        Long selling_price,
        String status,
        List<ProductImageDto> images,
        List<ProductAttributeValueDto> attribute_values) {}
