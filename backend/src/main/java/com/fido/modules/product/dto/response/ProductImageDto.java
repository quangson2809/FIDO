package com.fido.modules.product.dto.response;

public record ProductImageDto(
        Long id, String image_url, boolean is_primary, Integer sort_order) {}
