package com.fido.modules.product.mapper;

import com.fido.modules.product.dto.response.AttributeDto;
import com.fido.modules.product.dto.response.AttributeOptionDto;
import com.fido.modules.product.entity.Attribute;
import com.fido.modules.product.entity.AttributeOption;
import java.util.List;

public final class AttributeMapper {
    private AttributeMapper() {}

    public static AttributeOptionDto option(AttributeOption option) {
        return new AttributeOptionDto(
                option.getAttributeOptionId(), option.getAttributeId(), option.getValue(),
                option.getLabel(), option.getSortOrder());
    }

    public static AttributeDto attribute(Attribute attribute, List<AttributeOption> options) {
        return new AttributeDto(attribute.getAttributeId(), attribute.getCode(), attribute.getName(),
                attribute.isRequired(), attribute.isVariantDefining(), attribute.getSortOrder(),
                options.stream().map(AttributeMapper::option).toList());
    }
}
