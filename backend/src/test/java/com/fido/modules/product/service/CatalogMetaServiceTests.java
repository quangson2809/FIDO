package com.fido.modules.product.service;

import com.fido.modules.product.dto.response.AdminCatalogMetaDtoV2;
import com.fido.modules.product.dto.response.CatalogMetaDto;
import com.fido.modules.product.entity.Attribute;
import com.fido.modules.product.entity.AttributeOption;
import com.fido.modules.product.repository.AttributeOptionRepository;
import com.fido.modules.product.repository.AttributeRepository;
import com.fido.modules.product.repository.BrandRepository;
import com.fido.modules.product.repository.CategoryRepository;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CatalogMetaServiceTests {
    private final CategoryRepository categories = mock(CategoryRepository.class);
    private final BrandRepository brands = mock(BrandRepository.class);
    private final AttributeRepository attributes = mock(AttributeRepository.class);
    private final AttributeOptionRepository options = mock(AttributeOptionRepository.class);
    private final CatalogMetaService service = new CatalogMetaService(categories, brands, attributes, options);

    @Test
    void publicAndAdminMetadataReturnOptionOnlyAttributes() {
        when(categories.findAllByOrderByCategoryIdAsc()).thenReturn(List.of());
        when(brands.findAllByOrderByBrandIdAsc()).thenReturn(List.of());
        Attribute color = attribute(11L, "COLOR", 1);
        Attribute size = attribute(12L, "SIZE", 2);
        when(attributes.findAllByOrderBySortOrderAscAttributeIdAsc()).thenReturn(List.of(color, size));
        when(options.findAllByAttributeIdInOrderBySortOrderAscAttributeOptionIdAsc(anyCollection()))
                .thenReturn(List.of(option(101L, 11L, "BLACK", 1),
                        option(201L, 12L, "S", 1), option(202L, 12L, "M", 2)));

        CatalogMetaDto publicMeta = service.publicMeta();
        AdminCatalogMetaDtoV2 adminMeta = service.adminMeta();

        assertEquals(List.of(11L, 12L), adminMeta.attributes().stream().map(a -> a.id()).toList());
        assertEquals(List.of(201L, 202L),
                adminMeta.attributes().get(1).options().stream().map(o -> o.id()).toList());
        assertEquals(List.of(11L, 12L), publicMeta.attributes().stream().map(a -> a.id()).toList());
        assertEquals(1, publicMeta.attributes().get(0).options().size());
    }

    private static Attribute attribute(Long id, String code, int order) {
        Attribute a = new Attribute(); a.setAttributeId(id); a.setCode(code); a.setName(code);
        a.setSortOrder(order); return a;
    }
    private static AttributeOption option(Long id, Long attributeId, String value, int order) {
        AttributeOption o = new AttributeOption(); o.setAttributeOptionId(id); o.setAttributeId(attributeId);
        o.setValue(value); o.setLabel(value); o.setSortOrder(order); return o;
    }
}
