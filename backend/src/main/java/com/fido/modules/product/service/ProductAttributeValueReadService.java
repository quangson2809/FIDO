package com.fido.modules.product.service;

import com.fido.modules.product.dto.response.ProductAttributeValueDto;
import com.fido.modules.product.entity.Attribute;
import com.fido.modules.product.entity.AttributeOption;
import com.fido.modules.product.entity.ProductAttributeValue;
import com.fido.modules.product.repository.AttributeOptionRepository;
import com.fido.modules.product.repository.AttributeRepository;
import com.fido.modules.product.repository.ProductAttributeValueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class ProductAttributeValueReadService {
    private final ProductAttributeValueRepository values;
    private final AttributeRepository attributes;
    private final AttributeOptionRepository options;

    public ProductAttributeValueReadService(
            ProductAttributeValueRepository values, AttributeRepository attributes, AttributeOptionRepository options) {
        this.values = values;
        this.attributes = attributes;
        this.options = options;
    }

    public List<ProductAttributeValueDto> forProduct(Long productId) {
        return values.findAllByProductIdOrderByAttributeIdAsc(productId).stream().map(this::toDto).toList();
    }

    private ProductAttributeValueDto toDto(ProductAttributeValue value) {
        Attribute attribute = attributes.findById(value.getAttributeId())
                .orElseThrow(() -> new IllegalStateException("Product value refers to a missing Attribute"));
        AttributeOption option = options.findByAttributeIdAndAttributeOptionId(
                        attribute.getAttributeId(), value.getOptionId())
                .orElseThrow(() -> new IllegalStateException("Product value refers to an invalid Attribute Option"));
        return new ProductAttributeValueDto(
                attribute.getAttributeId(), attribute.getCode(), attribute.getName(),
                option.getAttributeOptionId(), option.getValue(), option.getLabel());
    }
}
