package com.fido.modules.product.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.fido.modules.inventory.service.InventoryAvailabilityService;
import com.fido.modules.product.entity.Category;
import com.fido.modules.product.entity.Color;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.entity.ProductVariant;
import com.fido.modules.product.entity.SizeValue;
import com.fido.modules.product.repository.BrandRepository;
import com.fido.modules.product.repository.CategoryRepository;
import com.fido.modules.product.repository.ProductImageRepository;
import com.fido.modules.product.repository.ProductPrimaryImageView;
import com.fido.modules.product.repository.ProductRepository;
import com.fido.modules.product.repository.ProductVariantRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

@ExtendWith(MockitoExtension.class)
class PublicCatalogQueryServiceTests {

    @Mock
    private ProductRepository products;

    @Mock
    private ProductVariantRepository variants;

    @Mock
    private ProductImageRepository images;

    @Mock
    private CategoryRepository categories;

    @Mock
    private BrandRepository brands;

    @Mock
    private InventoryAvailabilityService inventory;

    @Mock
    private CatalogReferenceService references;

    @Mock
    private CatalogMetaService metaService;

    private PublicCatalogQueryService service;

    @BeforeEach
    void setUp() {
        service = new PublicCatalogQueryService(
                products,
                variants,
                images,
                categories,
                brands,
                inventory,
                references,
                metaService
        );
    }

    @Test
    void publicProductsLoadsPrimaryImagesInOneBatchForThePage() {
        Product first = product(1L, 10L, "First");
        Product second = product(2L, 20L, "Second");

        when(products.findAll(
                any(Specification.class),
                any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of(first, second)));

        Category firstCategory = category(10L, "First category");
        Category secondCategory = category(20L, "Second category");
        when(categories.findAllByCategoryIdIn(List.of(10L, 20L)))
                .thenReturn(List.of(firstCategory, secondCategory));

        ProductPrimaryImageView firstImage = mock(ProductPrimaryImageView.class);
        ProductPrimaryImageView secondImage = mock(ProductPrimaryImageView.class);
        when(firstImage.getProductId()).thenReturn(1L);
        when(firstImage.getImageUrl()).thenReturn("https://example.test/first.png");
        when(secondImage.getProductId()).thenReturn(2L);
        when(secondImage.getImageUrl()).thenReturn("https://example.test/second.png");
        when(images.findPrimaryImagesByProductIdIn(List.of(1L, 2L)))
                .thenReturn(List.of(firstImage, secondImage));

        var result = service.publicProducts(
                new CatalogProductFilter(
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                )
        );

        assertEquals("https://example.test/first.png", result.data().get(0).primary_image());
        assertEquals("https://example.test/second.png", result.data().get(1).primary_image());
        verify(images).findPrimaryImagesByProductIdIn(List.of(1L, 2L));
        verifyNoMoreInteractions(images);
    }

    @Test
    void publicDetailBatchesVariantSizeAndColorReferences() {
        Product product = mock(Product.class);
        when(product.getProductId()).thenReturn(100L);
        when(product.getCategoryId()).thenReturn(5L);
        when(product.getSizeSystemId()).thenReturn(7L);
        when(product.getBasePrice()).thenReturn(new BigDecimal("120000.00"));
        when(references.product(100L)).thenReturn(product);
        when(references.category(5L)).thenReturn(mock(Category.class));

        ProductVariant first = variant(1L, 11L, 21L);
        ProductVariant second = variant(2L, 12L, 22L);
        when(variants.findAllByProductIdOrderByVariantIdAsc(100L))
                .thenReturn(List.of(first, second));

        when(inventory.availableQuantities(List.of(1L, 2L)))
                .thenReturn(Map.of(1L, 3, 2L, 4));

        SizeValue firstSize = size(11L);
        SizeValue secondSize = size(12L);
        when(references.sizeValuesById(List.of(11L, 12L)))
                .thenReturn(Map.of(11L, firstSize, 12L, secondSize));

        Color firstColor = color(21L);
        Color secondColor = color(22L);
        when(references.colorsById(List.of(21L, 22L)))
                .thenReturn(Map.of(21L, firstColor, 22L, secondColor));

        when(images.findAllByProductIdOrderBySortOrderAsc(100L))
                .thenReturn(List.of());

        var detail = service.publicDetail(100L);

        assertEquals(2, detail.variants().size());
        verify(references).sizeValuesById(List.of(11L, 12L));
        verify(references).colorsById(List.of(21L, 22L));
        verify(references, never()).sizeValue(anyLong());
        verify(references, never()).color(anyLong());
    }

    private Product product(
            Long id,
            Long categoryId,
            String name
    ) {
        Product product = mock(Product.class);
        when(product.getProductId()).thenReturn(id);
        when(product.getCategoryId()).thenReturn(categoryId);
        when(product.getBrandId()).thenReturn(null);
        when(product.getName()).thenReturn(name);
        when(product.getBasePrice()).thenReturn(new BigDecimal("100000.00"));
        when(product.getSaleStatus()).thenReturn(CatalogPolicy.ON_SALE);
        return product;
    }

    private Category category(Long id, String name) {
        Category category = mock(Category.class);
        when(category.getCategoryId()).thenReturn(id);
        when(category.getName()).thenReturn(name);
        return category;
    }

    private ProductVariant variant(
            Long variantId,
            Long sizeValueId,
            Long colorId
    ) {
        ProductVariant variant = mock(ProductVariant.class);
        when(variant.getVariantId()).thenReturn(variantId);
        when(variant.getSizeValueId()).thenReturn(sizeValueId);
        when(variant.getColorId()).thenReturn(colorId);
        when(variant.getSku()).thenReturn("SKU-" + variantId);
        when(variant.getSaleStatus()).thenReturn(CatalogPolicy.ON_SALE);
        return variant;
    }

    private SizeValue size(Long id) {
        SizeValue value = mock(SizeValue.class);
        when(value.getSizeValueId()).thenReturn(id);
        return value;
    }

    private Color color(Long id) {
        Color value = mock(Color.class);
        when(value.getColorId()).thenReturn(id);
        return value;
    }
}
