package com.fido.modules.product.mapper;

import com.fido.modules.product.dto.response.AttributeDto;
import com.fido.modules.product.dto.response.AttributeOptionDto;
import com.fido.modules.product.dto.response.AttributeTypeDto;
import com.fido.modules.product.entity.Attribute;
import com.fido.modules.product.entity.AttributeOption;
import com.fido.modules.product.entity.AttributeType;

import java.util.List;

public final class AttributeMapper {
    private AttributeMapper() {}

    public static AttributeTypeDto type(AttributeType type) {
        return new AttributeTypeDto(
                type.getAttributeTypeId(), type.getCode(), type.getName(), type.getDataType());
    }

    public static AttributeOptionDto option(AttributeOption option) {
        return new AttributeOptionDto(
                option.getAttributeOptionId(),
                option.getAttributeId(),
                option.getValue(),
                option.getLabel(),
                option.getSortOrder());
    }

    public static AttributeDto attribute(
            Attribute attribute, AttributeType type, List<AttributeOption> options) {
        return new AttributeDto(
                attribute.getAttributeId(),
                attribute.getCode(),
                attribute.getName(),
                type.getDataType(),
                attribute.isRequired(),
                attribute.isVariantDefining(),
                attribute.getSortOrder(),
                options.stream().map(AttributeMapper::option).toList());
    }
}
