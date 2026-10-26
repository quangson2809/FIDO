package com.fido.modules.product.dto.response;

public record AttributeOptionDto(
        Long id, Long attribute_id, String value, String label, Integer sort_order) {}
