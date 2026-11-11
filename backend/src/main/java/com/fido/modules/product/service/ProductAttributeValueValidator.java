package com.fido.modules.product.service;

import com.fido.modules.product.entity.Attribute;
import com.fido.modules.product.entity.AttributeOption;
import com.fido.modules.product.entity.ProductAttributeValue;
import com.fido.modules.product.repository.AttributeOptionRepository;
import com.fido.modules.product.repository.AttributeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Resolves selected Option IDs to their owning Attributes and validates Product values. */
@Service
@Transactional(readOnly = true)
public class ProductAttributeValueValidator {
    private final AttributeRepository attributes;
    private final AttributeOptionRepository options;

    public ProductAttributeValueValidator(AttributeRepository attributes, AttributeOptionRepository options) {
        this.attributes = attributes;
        this.options = options;
    }

    public List<ProductAttributeValue> validateCompleteSet(
            Long productId, String productStatus, List<Long> attributeValueIds) {
        if (productId == null || productId <= 0) {
            throw badRequest("A persisted Product ID is required to validate attribute values");
        }
        List<Long> ids = attributeValueIds == null ? List.of() : attributeValueIds;
        Set<Long> seenOptionIds = new HashSet<>();
        Set<Long> seenAttributeIds = new HashSet<>();
        List<ProductAttributeValue> result = new ArrayList<>();

        for (Long optionId : ids) {
            if (optionId == null || optionId <= 0) throw badRequest("Each attribute_value_id must be a positive ID");
            if (!seenOptionIds.add(optionId)) throw badRequest("Duplicate attribute_value_id is not allowed");
            AttributeOption option = options.findById(optionId)
                    .orElseThrow(() -> badRequest("Unknown attribute_value_id"));
            Long attributeId = option.getAttributeId();
            if (!seenAttributeIds.add(attributeId)) {
                throw badRequest("Only one option may be selected for each Attribute");
            }
            attributes.findById(attributeId).orElseThrow(() ->
                    new IllegalStateException("Attribute Option refers to a missing Attribute"));
            ProductAttributeValue value = new ProductAttributeValue();
            value.setProductId(productId);
            value.setAttributeId(attributeId);
            value.setOptionId(option.getAttributeOptionId());
            result.add(value);
        }

        if ("ACTIVE".equals(productStatus)) {
            for (Attribute attribute : attributes.findAllByOrderBySortOrderAscAttributeIdAsc()) {
                if (attribute.isRequired() && !seenAttributeIds.contains(attribute.getAttributeId())) {
                    throw badRequest("An ACTIVE Product must supply every required Attribute");
                }
            }
        }
        return List.copyOf(result);
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
