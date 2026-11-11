package com.fido.modules.product.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fido.modules.product.entity.Product;
import com.fido.modules.inventory.service.InventoryAvailabilityService;
import com.fido.modules.product.repository.AttributeOptionRepository;
import com.fido.modules.product.repository.AttributeRepository;
import com.fido.modules.product.repository.BrandRepository;
import com.fido.modules.product.repository.CategoryRepository;
import com.fido.modules.product.repository.ProductImageRepository;
import com.fido.modules.product.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import java.util.List;
import java.util.Map;

@ExtendWith(MockitoExtension.class)
class PublicCatalogQueryServiceTests {
    @Mock private ProductRepository products;
    @Mock private InventoryAvailabilityService inventory;
    @Mock private ProductImageRepository images;
    @Mock private ProductImageReadService imageRead;
    @Mock private ProductAttributeValueReadService attributeValueRead;
    @Mock private CategoryRepository categories;
    @Mock private BrandRepository brands;
    @Mock private CatalogReferenceService references;
    @Mock private CatalogMetaService metaService;
    @Mock private AttributeRepository attributes;
    @Mock private AttributeOptionRepository options;

    private PublicCatalogQueryService service;

    @BeforeEach
    void setUp() {
        service = new PublicCatalogQueryService(
                products, inventory, images, imageRead, attributeValueRead,
                categories, brands, references, metaService, attributes, options);
    }

    @Test
    void publicDetailLoadsTheProductByProductIdWithoutVariantExpansion() {
        Product product = product(41L, "CORE-41", 125000L);
        when(references.publicProduct(41L)).thenReturn(product);
        when(products.findAllByParentProductIdOrderByProductIdAsc(41L)).thenReturn(List.of());
        when(images.findAllByProductIdInOrderByProductIdAscSortOrderAscImageIdAsc(List.of(41L)))
                .thenReturn(List.of());
        when(attributeValueRead.forProducts(List.of(41L)))
                .thenReturn(Map.of(41L, List.of()));
        when(inventory.availableQuantities(List.of(41L))).thenReturn(Map.of(41L, 4));

        var detail = service.publicDetail(41L);

        assertEquals(41L, detail.product_id());
        assertEquals("CORE-41", detail.sku());
        assertEquals(125000L, detail.selling_price());
        assertEquals("ACTIVE", detail.status());
        assertEquals(List.of(), detail.images());
        assertEquals(List.of(), detail.attribute_values());
        assertEquals(41L, detail.family().root_product_id());
        assertEquals(List.of(41L), detail.family().members().stream()
                .map(member -> member.product_id()).toList());
        assertEquals(4, detail.family().members().get(0).available_quantity());
        assertEquals(true, detail.family().members().get(0).purchasable());
        verify(inventory).availableQuantities(List.of(41L));
        verify(references).publicProduct(41L);
    }

    @Test
    void childDetailIncludesPublicSiblingsButNeverInactiveOrDeletedParent() {
        Product child = product(42L, "CHILD-42", 200000L);
        child.setParentProductId(41L);
        Product sibling = product(43L, "CHILD-43", 210000L);
        sibling.setParentProductId(41L);
        Product inactive = product(44L, "CHILD-44", 100000L);
        inactive.setParentProductId(41L);
        inactive.setStatus("DRAFT");
        Product root = product(41L, "CORE-41", 125000L);
        root.setStatus("INACTIVE");
        when(references.publicProduct(42L)).thenReturn(child);
        when(products.findById(41L)).thenReturn(java.util.Optional.of(root));
        when(products.findAllByParentProductIdOrderByProductIdAsc(41L))
                .thenReturn(List.of(child, sibling, inactive));
        when(images.findAllByProductIdInOrderByProductIdAscSortOrderAscImageIdAsc(List.of(42L, 43L)))
                .thenReturn(List.of());
        when(attributeValueRead.forProducts(List.of(42L, 43L))).thenReturn(Map.of());
        when(inventory.availableQuantities(List.of(42L, 43L)))
                .thenReturn(Map.of(43L, 7));

        var detail = service.publicDetail(42L);

        assertEquals(41L, detail.family().root_product_id());
        assertEquals(List.of(42L, 43L), detail.family().members().stream()
                .map(member -> member.product_id()).toList());
        assertEquals(42L, detail.product_id());
        assertEquals("CHILD-42", detail.family().members().get(0).sku());
        assertEquals(0, detail.family().members().get(0).available_quantity());
        assertEquals(false, detail.family().members().get(0).purchasable());
        assertEquals(7, detail.family().members().get(1).available_quantity());
        assertEquals(true, detail.family().members().get(1).purchasable());
        verify(inventory).availableQuantities(List.of(42L, 43L));
    }

    @Test
    void publicListUsesEachProductRowAsTheCatalogIdentity() {
        Product first = product(41L, "CORE-41", 125000L);
        Product second = product(42L, "CORE-42", 91000L);
        when(products.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(first, second)));
        when(imageRead.representativeByProductIds(List.of(41L, 42L)))
                .thenReturn(Map.of(41L, "https://cdn.test/41.png", 42L, "https://cdn.test/42.png"));

        var response = service.publicProducts(
                new CatalogProductFilter(null, null, null, null, null, 1, 20));

        assertEquals(2, response.data().size());
        assertEquals(41L, response.data().get(0).product_id());
        assertEquals(125000L, response.data().get(0).selling_price());
        assertEquals("CORE-42", response.data().get(1).sku());
        assertEquals("https://cdn.test/42.png", response.data().get(1).thumbnail());
        verify(imageRead).representativeByProductIds(List.of(41L, 42L));
    }

    private Product product(Long id, String sku, Long sellingPrice) {
        Product product = new Product();
        product.setProductId(id);
        product.setSku(sku);
        product.setName("Product " + id);
        product.setSellingPrice(sellingPrice);
        product.setStatus("ACTIVE");
        return product;
    }
}
