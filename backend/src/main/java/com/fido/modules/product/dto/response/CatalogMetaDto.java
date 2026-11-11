package com.fido.modules.product.dto.response;

import java.util.List;

/** Public catalog metadata contains categories, brands and option-only Attributes. */
public record CatalogMetaDto(
        List<CategoryDto> categories,
        List<BrandDto> brands,
        List<AttributeDto> attributes) {}
