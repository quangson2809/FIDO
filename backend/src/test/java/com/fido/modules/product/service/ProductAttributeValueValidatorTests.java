package com.fido.modules.product.service;

import com.fido.modules.product.dto.request.ProductAttributeValueInput;
import com.fido.modules.product.entity.Attribute;
import com.fido.modules.product.entity.AttributeType;
import com.fido.modules.product.entity.ProductAttributeValue;
import com.fido.modules.product.repository.AttributeOptionRepository;
import com.fido.modules.product.repository.AttributeRepository;
import com.fido.modules.product.repository.AttributeTypeRepository;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductAttributeValueValidatorTests {
    @Mock AttributeRepository attributes;
    @Mock AttributeTypeRepository types;
    @Mock AttributeOptionRepository options;

    @InjectMocks ProductAttributeValueValidator validator;

    @Test
    void acceptsEachTypedValueIncludingFalseBoolean() {
        Attribute optionAttribute = attribute(1L, 11L, false);
        Attribute textAttribute = attribute(2L, 12L, false);
        Attribute numberAttribute = attribute(3L, 13L, false);
        Attribute booleanAttribute = attribute(4L, 14L, false);
        when(attributes.findById(1L)).thenReturn(Optional.of(optionAttribute));
        when(attributes.findById(2L)).thenReturn(Optional.of(textAttribute));
        when(attributes.findById(3L)).thenReturn(Optional.of(numberAttribute));
        when(attributes.findById(4L)).thenReturn(Optional.of(booleanAttribute));
        when(types.findById(11L)).thenReturn(Optional.of(type(11L, "OPTION")));
        when(types.findById(12L)).thenReturn(Optional.of(type(12L, "TEXT")));
        when(types.findById(13L)).thenReturn(Optional.of(type(13L, "NUMBER")));
        when(types.findById(14L)).thenReturn(Optional.of(type(14L, "BOOLEAN")));
        when(options.existsByAttributeIdAndAttributeOptionId(1L, 101L)).thenReturn(true);
        when(attributes.findAllByOrderBySortOrderAscAttributeIdAsc())
                .thenReturn(List.of(optionAttribute, textAttribute, numberAttribute, booleanAttribute));

        List<ProductAttributeValue> result = validator.validateCompleteSet(
                500L, "ACTIVE",
                List.of(
                        new ProductAttributeValueInput(1L, 101L, null, null, null),
                        new ProductAttributeValueInput(2L, null, "cotton", null, null),
                        new ProductAttributeValueInput(3L, null, null, new BigDecimal("12.3400"), null),
                        new ProductAttributeValueInput(4L, null, null, null, Boolean.FALSE)));

        assertEquals(4, result.size());
        assertEquals(Boolean.FALSE, result.get(3).getBooleanValue());
        assertEquals(500L, result.get(0).getProductId());
    }

    @Test
    void rejectsNoValueAndMultipleValues() {
        Attribute attribute = attribute(1L, 11L, false);
        when(attributes.findById(1L)).thenReturn(Optional.of(attribute));
        when(types.findById(11L)).thenReturn(Optional.of(type(11L, "TEXT")));

        assertThrows(ResponseStatusException.class, () -> validator.validateCompleteSet(
                500L, "DRAFT", List.of(new ProductAttributeValueInput(1L, null, null, null, null))));
        assertThrows(ResponseStatusException.class, () -> validator.validateCompleteSet(
                500L, "DRAFT",
                List.of(new ProductAttributeValueInput(1L, null, "text", BigDecimal.ONE, null))));
    }

    @Test
    void rejectsTypedValueThatDoesNotMatchAttributeType() {
        Attribute attribute = attribute(1L, 11L, false);
        when(attributes.findById(1L)).thenReturn(Optional.of(attribute));
        when(types.findById(11L)).thenReturn(Optional.of(type(11L, "TEXT")));

        assertThrows(ResponseStatusException.class, () -> validator.validateCompleteSet(
                500L, "DRAFT", List.of(new ProductAttributeValueInput(1L, 101L, null, null, null))));
    }

    @Test
    void rejectsOptionOwnedByAnotherAttribute() {
        Attribute attribute = attribute(1L, 11L, false);
        when(attributes.findById(1L)).thenReturn(Optional.of(attribute));
        when(types.findById(11L)).thenReturn(Optional.of(type(11L, "OPTION")));
        when(options.existsByAttributeIdAndAttributeOptionId(1L, 101L)).thenReturn(false);

        assertThrows(ResponseStatusException.class, () -> validator.validateCompleteSet(
                500L, "DRAFT", List.of(new ProductAttributeValueInput(1L, 101L, null, null, null))));
    }

    @Test
    void allowsMissingRequiredValueOnDraftButRejectsActivation() {
        Attribute required = attribute(1L, 11L, true);
        when(attributes.findAllByOrderBySortOrderAscAttributeIdAsc()).thenReturn(List.of(required));

        assertTrue(validator.validateCompleteSet(500L, "DRAFT", List.of()).isEmpty());
        assertThrows(ResponseStatusException.class,
                () -> validator.validateCompleteSet(500L, "ACTIVE", List.of()));
    }

    @Test
    void rejectsNumberOutsideDecimalPrecision() {
        Attribute attribute = attribute(1L, 11L, false);
        when(attributes.findById(1L)).thenReturn(Optional.of(attribute));
        when(types.findById(11L)).thenReturn(Optional.of(type(11L, "NUMBER")));

        assertThrows(ResponseStatusException.class, () -> validator.validateCompleteSet(
                500L, "DRAFT",
                List.of(new ProductAttributeValueInput(
                        1L, null, null, new BigDecimal("0.00001"), null))));
    }

    private static Attribute attribute(Long id, Long typeId, boolean required) {
        Attribute attribute = new Attribute();
        attribute.setAttributeId(id);
        attribute.setAttributeTypeId(typeId);
        attribute.setCode("ATTRIBUTE_" + id);
        attribute.setName("Attribute " + id);
        attribute.setRequired(required);
        attribute.setSortOrder(id.intValue());
        return attribute;
    }

    private static AttributeType type(Long id, String dataType) {
        AttributeType type = new AttributeType();
        type.setAttributeTypeId(id);
        type.setCode(dataType);
        type.setName(dataType);
        type.setDataType(dataType);
        return type;
    }
}
