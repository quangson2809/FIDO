package com.fido.modules.product.service;

import com.fido.modules.product.entity.Attribute;
import com.fido.modules.product.entity.AttributeOption;
import com.fido.modules.product.entity.ProductAttributeValue;
import com.fido.modules.product.repository.AttributeOptionRepository;
import com.fido.modules.product.repository.AttributeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductAttributeValueValidatorTests {
    @Mock AttributeRepository attributes;
    @Mock AttributeOptionRepository options;
    @InjectMocks ProductAttributeValueValidator validator;

    @Test
    void resolvesSelectedOptionIdsToOwningAttributes() {
        Attribute color = attribute(1L, false), size = attribute(2L, false);
        when(options.findById(101L)).thenReturn(Optional.of(option(101L, 1L)));
        when(options.findById(201L)).thenReturn(Optional.of(option(201L, 2L)));
        when(attributes.findById(1L)).thenReturn(Optional.of(color));
        when(attributes.findById(2L)).thenReturn(Optional.of(size));
        when(attributes.findAllByOrderBySortOrderAscAttributeIdAsc()).thenReturn(List.of(color, size));

        List<ProductAttributeValue> result =
                validator.validateCompleteSet(500L, "ACTIVE", List.of(101L, 201L));

        assertEquals(2, result.size());
        assertEquals(500L, result.get(0).getProductId());
        assertEquals(1L, result.get(0).getAttributeId());
        assertEquals(101L, result.get(0).getOptionId());
        assertEquals(2L, result.get(1).getAttributeId());
    }

    @Test
    void rejectsUnknownAndDuplicateOptionIds() {
        when(options.findById(999L)).thenReturn(Optional.empty());
        assertThrows(ResponseStatusException.class,
                () -> validator.validateCompleteSet(500L, "DRAFT", List.of(999L)));
        when(options.findById(101L)).thenReturn(Optional.of(option(101L, 1L)));
        assertThrows(ResponseStatusException.class,
                () -> validator.validateCompleteSet(500L, "DRAFT", List.of(101L, 101L)));
    }

    @Test
    void rejectsTwoOptionsOwnedByOneAttribute() {
        when(options.findById(101L)).thenReturn(Optional.of(option(101L, 1L)));
        when(options.findById(102L)).thenReturn(Optional.of(option(102L, 1L)));
        when(attributes.findById(1L)).thenReturn(Optional.of(attribute(1L, false)));
        assertThrows(ResponseStatusException.class,
                () -> validator.validateCompleteSet(500L, "DRAFT", List.of(101L, 102L)));
    }

    @Test
    void allowsMissingRequiredAttributeOnDraftButRejectsActivation() {
        Attribute required = attribute(1L, true);
        when(attributes.findAllByOrderBySortOrderAscAttributeIdAsc()).thenReturn(List.of(required));
        assertTrue(validator.validateCompleteSet(500L, "DRAFT", List.of()).isEmpty());
        assertThrows(ResponseStatusException.class,
                () -> validator.validateCompleteSet(500L, "ACTIVE", List.of()));
    }

    private static Attribute attribute(Long id, boolean required) {
        Attribute a = new Attribute(); a.setAttributeId(id); a.setCode("A" + id);
        a.setName("Attribute " + id); a.setRequired(required); a.setSortOrder(id.intValue()); return a;
    }
    private static AttributeOption option(Long id, Long attributeId) {
        AttributeOption o = new AttributeOption(); o.setAttributeOptionId(id); o.setAttributeId(attributeId);
        o.setValue("V" + id); o.setLabel("Value " + id); o.setSortOrder(id.intValue()); return o;
    }
}
