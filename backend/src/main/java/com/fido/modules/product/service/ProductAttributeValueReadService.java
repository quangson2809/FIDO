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
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

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

    /** Resolve a Product family without per-row Attribute or Option queries. */
    public Map<Long, List<ProductAttributeValueDto>> forProducts(Collection<Long> productIds) {
        if (productIds == null || productIds.isEmpty()) return Map.of();
        List<Long> ids = productIds.stream().distinct().toList();
        var rows = values.findAllByProductIdInOrderByProductIdAscAttributeIdAsc(ids);
        var attributeIds = rows.stream().map(ProductAttributeValue::getAttributeId).distinct().toList();
        var optionIds = rows.stream().map(ProductAttributeValue::getOptionId).distinct().toList();
        Map<Long, Attribute> byAttribute = attributeIds.isEmpty() ? Map.of()
                : attributes.findAllByAttributeIdIn(attributeIds).stream().collect(
                        Collectors.toMap(Attribute::getAttributeId, Function.identity()));
        Map<Long, AttributeOption> byOption = optionIds.isEmpty() ? Map.of()
                : options.findAllByAttributeOptionIdIn(optionIds).stream().collect(
                        Collectors.toMap(AttributeOption::getAttributeOptionId, Function.identity()));
        Map<Long, List<ProductAttributeValueDto>> grouped = new HashMap<>();
        ids.forEach(id -> grouped.put(id, new ArrayList<>()));
        for (ProductAttributeValue row : rows) {
            Attribute attribute = byAttribute.get(row.getAttributeId());
            AttributeOption option = byOption.get(row.getOptionId());
            if (attribute == null || option == null
                    || !attribute.getAttributeId().equals(option.getAttributeId())) {
                throw new IllegalStateException("Product value refers to an invalid Attribute Option");
            }
            grouped.get(row.getProductId()).add(new ProductAttributeValueDto(
                    attribute.getAttributeId(), attribute.getCode(), attribute.getName(),
                    option.getAttributeOptionId(), option.getValue(), option.getLabel()));
        }
        return grouped.entrySet().stream().collect(Collectors.toUnmodifiableMap(
                Map.Entry::getKey, entry -> List.copyOf(entry.getValue())));
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
