package com.fido.modules.product.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fido.modules.product.dto.response.AdminCatalogMetaDtoV2;
import com.fido.modules.product.dto.response.CatalogMetaDto;
import com.fido.modules.product.entity.Attribute;
import com.fido.modules.product.entity.AttributeOption;
import com.fido.modules.product.entity.Brand;
import com.fido.modules.product.entity.Category;
import com.fido.modules.product.repository.AttributeOptionRepository;
import com.fido.modules.product.repository.AttributeRepository;
import com.fido.modules.product.repository.BrandRepository;
import com.fido.modules.product.repository.CategoryRepository;

import org.junit.jupiter.api.Test;
import org.springframework.util.unit.DataSize;

import java.util.List;

class CatalogMetaServiceTests {
    private final CategoryRepository categories = mock(CategoryRepository.class);
    private final BrandRepository brands = mock(BrandRepository.class);
    private final AttributeRepository attributes = mock(AttributeRepository.class);
    private final AttributeOptionRepository options = mock(AttributeOptionRepository.class);
    private final CatalogMetaService service =
            new CatalogMetaService(
                    categories,
                    brands,
                    attributes,
                    options,
                    DataSize.ofMegabytes(2),
                    DataSize.ofMegabytes(8),
                    DataSize.ofMegabytes(1),
                    3);

    @Test
    void publicAndAdminMetadataReturnOptionOnlyAttributes() {
        when(categories.findAllByOrderByCategoryIdAsc()).thenReturn(List.of());
        when(brands.findAllByOrderByBrandIdAsc()).thenReturn(List.of());
        Attribute color = attribute(11L, "COLOR", 1);
        Attribute size = attribute(12L, "SIZE", 2);
        when(attributes.findAllByOrderBySortOrderAscAttributeIdAsc())
                .thenReturn(List.of(color, size));
        when(options.findAllByAttributeIdInOrderBySortOrderAscAttributeOptionIdAsc(anyCollection()))
                .thenReturn(
                        List.of(
                                option(101L, 11L, "BLACK", 1),
                                option(201L, 12L, "S", 1),
                                option(202L, 12L, "M", 2)));

        CatalogMetaDto publicMeta = service.publicMeta();
        AdminCatalogMetaDtoV2 adminMeta = service.adminMeta();

        assertEquals(1024 * 1024, adminMeta.image_upload().max_file_bytes());
        assertEquals(8 * 1024 * 1024, adminMeta.image_upload().max_request_bytes());
        assertEquals(3, adminMeta.image_upload().max_files());
        assertEquals(
                List.of("image/jpeg", "image/png", "image/webp"),
                adminMeta.image_upload().content_types());
        assertEquals(List.of(11L, 12L), adminMeta.attributes().stream().map(a -> a.id()).toList());
        assertEquals(
                List.of(201L, 202L),
                adminMeta.attributes().get(1).options().stream().map(o -> o.id()).toList());
        assertEquals(List.of(11L, 12L), publicMeta.attributes().stream().map(a -> a.id()).toList());
        assertEquals(1, publicMeta.attributes().get(0).options().size());
    }

    @Test
    void publicMetadataHidesInactiveAncestorsAndBrandsButAdminCanReactivateThem() {
        Category inactive = new Category();
        inactive.setCategoryId(1L);
        inactive.setStatus("INACTIVE");
        Category child = new Category();
        child.setCategoryId(2L);
        child.setParentCategoryId(1L);
        child.setStatus("ACTIVE");
        Category visible = new Category();
        visible.setCategoryId(3L);
        visible.setStatus("ACTIVE");
        Brand hiddenBrand = new Brand();
        hiddenBrand.setBrandId(4L);
        hiddenBrand.setStatus("INACTIVE");
        Brand visibleBrand = new Brand();
        visibleBrand.setBrandId(5L);
        visibleBrand.setStatus("ACTIVE");
        when(categories.findAllByOrderByCategoryIdAsc())
                .thenReturn(List.of(inactive, child, visible));
        when(brands.findAllByOrderByBrandIdAsc()).thenReturn(List.of(hiddenBrand, visibleBrand));

        assertEquals(
                List.of(3L),
                service.publicMeta().categories().stream().map(c -> c.category_id()).toList());
        assertEquals(
                List.of(5L),
                service.publicMeta().brands().stream().map(b -> b.brand_id()).toList());
        assertEquals(
                List.of(1L, 2L, 3L),
                service.adminMeta().categories().stream().map(c -> c.category_id()).toList());
        assertEquals(
                List.of(4L, 5L),
                service.adminMeta().brands().stream().map(b -> b.brand_id()).toList());
    }

    private static Attribute attribute(Long id, String code, int order) {
        Attribute a = new Attribute();
        a.setAttributeId(id);
        a.setCode(code);
        a.setName(code);
        a.setSortOrder(order);
        return a;
    }

    private static AttributeOption option(Long id, Long attributeId, String value, int order) {
        AttributeOption o = new AttributeOption();
        o.setAttributeOptionId(id);
        o.setAttributeId(attributeId);
        o.setValue(value);
        o.setLabel(value);
        o.setSortOrder(order);
        return o;
    }
}
