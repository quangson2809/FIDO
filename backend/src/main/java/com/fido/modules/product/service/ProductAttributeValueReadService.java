package com.fido.modules.product.service;

import com.fido.modules.product.dto.response.ProductAttributeValueDto;
import com.fido.modules.product.entity.AttributeValueType;
import com.fido.modules.product.repository.ProductAttributeValueRepository;
import com.fido.modules.product.repository.ProductAttributeValueRepository.AttributeValueReadRow;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class ProductAttributeValueReadService {

    private final ProductAttributeValueRepository values;

    public ProductAttributeValueReadService(ProductAttributeValueRepository values) {
        this.values = values;
    }

    public List<ProductAttributeValueDto> forProduct(Long productId) {
        return values.findAttributeValuesForProduct(productId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    private ProductAttributeValueDto toDto(AttributeValueReadRow row) {
        if (row.getTypeCode() == null
                || row.getDataType() == null
                || !row.getTypeCode().equals(row.getDataType())) {
            throw new IllegalStateException("Attribute type lookup is not canonical");
        }

        final AttributeValueType valueType;
        try {
            valueType = AttributeValueType.valueOf(row.getDataType());
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("Unsupported attribute type lookup value", exception);
        }

        String optionValue = null;
        String optionLabel = null;
        if (valueType == AttributeValueType.OPTION) {
            if (row.getOptionId() == null
                    || row.getOptionValue() == null
                    || row.getOptionLabel() == null) {
                throw new IllegalStateException("Product value refers to an invalid Option");
            }
            optionValue = row.getOptionValue();
            optionLabel = row.getOptionLabel();
        }

        return new ProductAttributeValueDto(
                row.getAttributeId(),
                row.getAttributeCode(),
                row.getAttributeName(),
                row.getDataType(),
                row.getOptionId(),
                optionValue,
                optionLabel,
                row.getTextValue(),
                row.getNumberValue(),
                row.getBooleanValue());
    }
}
