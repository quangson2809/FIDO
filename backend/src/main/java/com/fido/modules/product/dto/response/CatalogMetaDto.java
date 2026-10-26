package com.fido.modules.product.dto.response;

import java.util.List;

public record CatalogMetaDto(
        List<CategoryDto> categories,
        List<BrandDto> brands) {}
