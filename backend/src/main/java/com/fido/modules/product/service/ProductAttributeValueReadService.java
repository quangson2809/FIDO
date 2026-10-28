package com.fido.modules.product.service;

import com.fido.modules.product.dto.response.ProductAttributeValueDto;
import com.fido.modules.product.entity.Attribute;
import com.fido.modules.product.entity.AttributeOption;
import com.fido.modules.product.entity.AttributeType;
import com.fido.modules.product.entity.AttributeValueType;
import com.fido.modules.product.entity.ProductAttributeValue;
import com.fido.modules.product.repository.AttributeOptionRepository;
import com.fido.modules.product.repository.AttributeRepository;
import com.fido.modules.product.repository.AttributeTypeRepository;
import com.fido.modules.product.repository.ProductAttributeValueRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class ProductAttributeValueReadService {

    private final ProductAttributeValueRepository values;
    private final AttributeRepository attributes;
    private final AttributeTypeRepository types;
    private final AttributeOptionRepository options;

    public ProductAttributeValueReadService(
            ProductAttributeValueRepository values,
            AttributeRepository attributes,
            AttributeTypeRepository types,
            AttributeOptionRepository options) {
        this.values = values;
        this.attributes = attributes;
        this.types = types;
        this.options = options;
    }

    public List<ProductAttributeValueDto> forProduct(Long productId) {
        return values.findAllByProductIdOrderByAttributeIdAsc(productId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    private ProductAttributeValueDto toDto(ProductAttributeValue value) {
        Attribute attribute = attributes.findById(value.getAttributeId())
                .orElseThrow(() -> new IllegalStateException(
                        "Product value refers to a missing Attribute"));

        AttributeType type = types.findById(attribute.getAttributeTypeId())
                .orElseThrow(() -> new IllegalStateException(
                        "Attribute refers to a missing type"));

        AttributeValueType valueType = AttributeValueType.from(type);
        String optionValue = null;
        String optionLabel = null;

        if (valueType == AttributeValueType.OPTION) {
            AttributeOption option = options
                    .findByAttributeIdAndAttributeOptionId(
                            attribute.getAttributeId(), value.getOptionId())
                    .orElseThrow(() -> new IllegalStateException(
                            "Product value refers to an invalid Option"));

            optionValue = option.getValue();
            optionLabel = option.getLabel();
        }

        return new ProductAttributeValueDto(
                attribute.getAttributeId(),
                attribute.getCode(),
                attribute.getName(),
                type.getDataType(),
                value.getOptionId(),
                optionValue,
                optionLabel,
                value.getTextValue(),
                value.getNumberValue(),
                value.getBooleanValue());
    }
}
