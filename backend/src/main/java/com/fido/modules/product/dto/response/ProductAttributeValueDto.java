package com.fido.modules.product.dto.response;

public record ProductAttributeValueDto(
        Long attribute_id,
        String attribute_code,
        String attribute_name,
        boolean is_variant_defining,
        int sort_order,
        Long attribute_value_id,
        String value,
        String label) {}
