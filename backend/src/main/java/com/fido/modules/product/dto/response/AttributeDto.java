package com.fido.modules.product.dto.response;

import java.util.List;

public record AttributeDto(
        Long id,
        String code,
        String name,
        boolean is_required,
        boolean is_variant_defining,
        Integer sort_order,
        List<AttributeOptionDto> options) {}
