package com.fido.modules.product.dto.response;

import java.util.List;

public record ProductFamilyDto(
        Long root_product_id,
        List<ProductFamilyMemberDto> members) {}
