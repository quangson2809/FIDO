package com.fido.modules.product.dto.response;
import java.util.List;
public record CatalogMetaDto(List<CategoryDto> categories, List<BrandDto> brands,
                             List<SizeSystemDto> size_systems, List<ColorDto> colors,
                             List<String> genders, List<String> seasons, List<String> styles) {}
