package com.fido.modules.product.dto.response;

import java.util.List;

/** Public catalog metadata keeps category/brand fields and adds typed attributes. */
public record CatalogMetaDto(
        List<CategoryDto> categories,
        List<BrandDto> brands,
        List<AttributeTypeDto> attribute_types,
        List<AttributeDto> attributes) {}
