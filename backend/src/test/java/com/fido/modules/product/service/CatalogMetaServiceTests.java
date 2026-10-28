package com.fido.modules.product.service;

import com.fido.modules.product.dto.response.AdminCatalogMetaDtoV2;
import com.fido.modules.product.dto.response.CatalogMetaDto;
import com.fido.modules.product.entity.Attribute;
import com.fido.modules.product.entity.AttributeOption;
import com.fido.modules.product.entity.AttributeType;
import com.fido.modules.product.repository.AttributeOptionRepository;
import com.fido.modules.product.repository.AttributeRepository;
import com.fido.modules.product.repository.AttributeTypeRepository;
import com.fido.modules.product.repository.BrandRepository;
import com.fido.modules.product.repository.CategoryRepository;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CatalogMetaServiceTests {
    private final CategoryRepository categories = mock(CategoryRepository.class);
    private final BrandRepository brands = mock(BrandRepository.class);
    private final AttributeTypeRepository types = mock(AttributeTypeRepository.class);
    private final AttributeRepository attributes = mock(AttributeRepository.class);
    private final AttributeOptionRepository options = mock(AttributeOptionRepository.class);

    private final CatalogMetaService service =
            new CatalogMetaService(categories, brands, types, attributes, options);

    @Test
    void publicAndAdminMetadataReturnFourCanonicalTypesAndOrderedOptions() {
        when(categories.findAllByOrderByCategoryIdAsc()).thenReturn(List.of());
        when(brands.findAllByOrderByBrandIdAsc()).thenReturn(List.of());
        when(types.findAllByOrderByAttributeTypeIdAsc()).thenReturn(List.of(
                type(1L, "OPTION"), type(2L, "TEXT"), type(3L, "NUMBER"), type(4L, "BOOLEAN")));

        Attribute first = attribute(11L, 1L, "FIRST", 1);
        Attribute second = attribute(12L, 1L, "SECOND", 2);
        when(attributes.findAllByOrderBySortOrderAscAttributeIdAsc())
                .thenReturn(List.of(first, second));
        when(options.findAllByAttributeIdInOrderBySortOrderAscAttributeOptionIdAsc(anyCollection()))
                .thenReturn(List.of(option(20L, 11L, "M", 1), option(21L, 12L, "S", 1),
                        option(22L, 12L, "L", 2)));

        CatalogMetaDto publicMeta = service.publicMeta();
        AdminCatalogMetaDtoV2 adminMeta = service.adminMeta();

        assertEquals(List.of("OPTION", "TEXT", "NUMBER", "BOOLEAN"),
                publicMeta.attribute_types().stream().map(t -> t.code()).toList());
        assertEquals(4, adminMeta.attribute_types().size());
        assertEquals(List.of(11L, 12L), adminMeta.attributes().stream().map(a -> a.id()).toList());
        assertEquals(List.of(21L, 22L),
                adminMeta.attributes().get(1).options().stream().map(o -> o.id()).toList());
        assertTrue(publicMeta.attributes().get(0).options().size() == 1);
    }

    private static AttributeType type(Long id, String dataType) {
        AttributeType type = new AttributeType();
        type.setAttributeTypeId(id);
        type.setCode(dataType);
        type.setName(dataType);
        type.setDataType(dataType);
        return type;
    }

    private static Attribute attribute(Long id, Long typeId, String code, int order) {
        Attribute attribute = new Attribute();
        attribute.setAttributeId(id);
        attribute.setAttributeTypeId(typeId);
        attribute.setCode(code);
        attribute.setName(code);
        attribute.setSortOrder(order);
        return attribute;
    }

    private static AttributeOption option(Long id, Long attributeId, String value, int order) {
        AttributeOption option = new AttributeOption();
        option.setAttributeOptionId(id);
        option.setAttributeId(attributeId);
        option.setValue(value);
        option.setLabel(value);
        option.setSortOrder(order);
        return option;
    }
}
