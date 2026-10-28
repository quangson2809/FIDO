package com.fido.modules.product.dto.response;

import java.util.List;

public record AdminCatalogMetaDtoV2(
        List<AttributeTypeDto> attribute_types, List<AttributeDto> attributes) {}
