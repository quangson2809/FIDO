package com.fido.modules.product.dto.response;

public record ProductAttributeValueDto(
        Long attribute_id,
        String attribute_code,
        String attribute_name,
        Long attribute_value_id,
        String value,
        String label) {}
