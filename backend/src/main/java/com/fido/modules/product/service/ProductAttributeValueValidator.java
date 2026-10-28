package com.fido.modules.product.service;

import com.fido.modules.product.dto.request.ProductAttributeValueInput;
import com.fido.modules.product.entity.Attribute;
import com.fido.modules.product.entity.AttributeType;
import com.fido.modules.product.entity.AttributeValueType;
import com.fido.modules.product.entity.ProductAttributeValue;
import com.fido.modules.product.repository.AttributeOptionRepository;
import com.fido.modules.product.repository.AttributeRepository;
import com.fido.modules.product.repository.AttributeTypeRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Validates a complete Product attribute-value set without generating or persisting Products. */
@Service
@Transactional(readOnly = true)
public class ProductAttributeValueValidator {
    private final AttributeRepository attributes;
    private final AttributeTypeRepository types;
    private final AttributeOptionRepository options;

    public ProductAttributeValueValidator(
            AttributeRepository attributes,
            AttributeTypeRepository types,
            AttributeOptionRepository options) {
        this.attributes = attributes;
        this.types = types;
        this.options = options;
    }

    /**
     * Validates a complete replacement set. Required attributes may be absent while a Product
     * remains a draft, but all required attributes must be present before activation.
     */
    public List<ProductAttributeValue> validateCompleteSet(
            Long productId, String productStatus, List<ProductAttributeValueInput> inputs) {
        if (productId == null || productId <= 0) {
            throw badRequest("A persisted Product ID is required to validate attribute values");
        }

        List<ProductAttributeValueInput> values = inputs == null ? List.of() : inputs;
        Set<Long> seenAttributes = new HashSet<>();
        List<ProductAttributeValue> validated = new ArrayList<>();

        for (ProductAttributeValueInput input : values) {
            if (input == null || input.attribute_id() == null || input.attribute_id() <= 0) {
                throw badRequest("Each attribute value must identify an Attribute");
            }
            if (!seenAttributes.add(input.attribute_id())) {
                throw badRequest("An Attribute can have only one value per Product");
            }

            Attribute attribute = attributes.findById(input.attribute_id())
                    .orElseThrow(() -> badRequest("Unknown Attribute"));
            AttributeType type = types.findById(attribute.getAttributeTypeId())
                    .orElseThrow(() -> new IllegalStateException("Attribute refers to a missing type"));
            AttributeValueType valueType = AttributeValueType.from(type);

            if (populatedValues(input) != 1) {
                throw badRequest("Exactly one typed value must be supplied");
            }

            switch (valueType) {
                case OPTION -> {
                    if (input.option_id() == null
                            || input.text_value() != null
                            || input.number_value() != null
                            || input.boolean_value() != null) {
                        throw badRequest("OPTION attributes require option_id only");
                    }
                    if (!options.existsByAttributeIdAndAttributeOptionId(
                            attribute.getAttributeId(), input.option_id())) {
                        throw badRequest("Option does not belong to the selected Attribute");
                    }
                }
                case TEXT -> {
                    if (input.option_id() != null
                            || input.text_value() == null
                            || input.number_value() != null
                            || input.boolean_value() != null) {
                        throw badRequest("TEXT attributes require text_value only");
                    }
                    if (input.text_value().length() > 1000) {
                        throw badRequest("text_value exceeds the target column length");
                    }
                }
                case NUMBER -> {
                    if (input.option_id() != null
                            || input.text_value() != null
                            || input.number_value() == null
                            || input.boolean_value() != null) {
                        throw badRequest("NUMBER attributes require number_value only");
                    }
                    validateNumber(input.number_value());
                }
                case BOOLEAN -> {
                    if (input.option_id() != null
                            || input.text_value() != null
                            || input.number_value() != null
                            || input.boolean_value() == null) {
                        throw badRequest("BOOLEAN attributes require boolean_value only");
                    }
                }
            }

            ProductAttributeValue entity = new ProductAttributeValue();
            entity.setProductId(productId);
            entity.setAttributeId(attribute.getAttributeId());
            entity.setOptionId(input.option_id());
            entity.setTextValue(input.text_value());
            entity.setNumberValue(input.number_value());
            entity.setBooleanValue(input.boolean_value());
            validated.add(entity);
        }

        if ("ACTIVE".equals(productStatus)) {
            for (Attribute attribute : attributes.findAllByOrderBySortOrderAscAttributeIdAsc()) {
                if (attribute.isRequired() && !seenAttributes.contains(attribute.getAttributeId())) {
                    throw badRequest("An ACTIVE Product must supply every required Attribute");
                }
            }
        }
        return List.copyOf(validated);
    }

    private int populatedValues(ProductAttributeValueInput input) {
        int count = 0;
        if (input.option_id() != null) count++;
        if (input.text_value() != null) count++;
        if (input.number_value() != null) count++;
        if (input.boolean_value() != null) count++;
        return count;
    }

    private void validateNumber(BigDecimal value) {
        BigDecimal normalized = value.stripTrailingZeros();
        int fractionDigits = Math.max(normalized.scale(), 0);
        int integerDigits = normalized.precision() - normalized.scale();
        if (fractionDigits > 4 || integerDigits > 14) {
            throw badRequest("number_value exceeds DECIMAL(18,4) precision");
        }
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
