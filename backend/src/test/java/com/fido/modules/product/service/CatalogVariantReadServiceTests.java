package com.fido.modules.product.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fido.modules.inventory.service.InventoryAvailabilityService;
import com.fido.modules.product.entity.Color;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.entity.ProductVariant;
import com.fido.modules.product.entity.SizeValue;
import com.fido.modules.product.repository.ColorRepository;
import com.fido.modules.product.repository.ProductImageRepository;
import com.fido.modules.product.repository.ProductPrimaryImageView;
import com.fido.modules.product.repository.ProductRepository;
import com.fido.modules.product.repository.ProductVariantRepository;
import com.fido.modules.product.repository.SizeValueRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class CatalogVariantReadServiceTests {

    @Test
    void getAllLoadsPrimaryImagesOnceForTheVariantBatch() {
        ProductVariantRepository variants = mock(ProductVariantRepository.class);
        ProductRepository products = mock(ProductRepository.class);
        ProductImageRepository images = mock(ProductImageRepository.class);
        SizeValueRepository sizes = mock(SizeValueRepository.class);
        ColorRepository colors = mock(ColorRepository.class);
        InventoryAvailabilityService inventory = mock(InventoryAvailabilityService.class);

        ProductVariant first = variant(1L, 10L, 100L, 200L);
        ProductVariant second = variant(2L, 10L, 100L, 200L);
        Product product = product(10L);
        SizeValue size = size(100L);
        Color color = color(200L);
        ProductPrimaryImageView primaryImage = mock(ProductPrimaryImageView.class);

        when(primaryImage.getProductId()).thenReturn(10L);
        when(primaryImage.getImageUrl()).thenReturn("https://example.test/front.png");
        when(variants.findAllByVariantIdIn(List.of(1L, 2L)))
                .thenReturn(List.of(first, second));
        when(products.findAllByProductIdIn(List.of(10L)))
                .thenReturn(List.of(product));
        when(images.findPrimaryImagesByProductIdIn(List.of(10L)))
                .thenReturn(List.of(primaryImage));
        when(sizes.findAllBySizeValueIdIn(List.of(100L)))
                .thenReturn(List.of(size));
        when(colors.findAllByColorIdIn(List.of(200L)))
                .thenReturn(List.of(color));
        when(inventory.availableQuantities(List.of(1L, 2L)))
                .thenReturn(Map.of(1L, 3, 2L, 4));

        CatalogVariantReadService service = new CatalogVariantReadService(
                variants,
                products,
                images,
                sizes,
                colors,
                inventory
        );

        var result = service.getAll(List.of(1L, 2L));

        assertEquals("https://example.test/front.png", result.get(1L).primaryImage());
        assertEquals("https://example.test/front.png", result.get(2L).primaryImage());
        verify(images).findPrimaryImagesByProductIdIn(List.of(10L));
    }

    private ProductVariant variant(
            Long variantId,
            Long productId,
            Long sizeValueId,
            Long colorId
    ) {
        ProductVariant variant = mock(ProductVariant.class);
        when(variant.getVariantId()).thenReturn(variantId);
        when(variant.getProductId()).thenReturn(productId);
        when(variant.getSizeValueId()).thenReturn(sizeValueId);
        when(variant.getColorId()).thenReturn(colorId);
        when(variant.getSku()).thenReturn("SKU-" + variantId);
        when(variant.getOverridePrice()).thenReturn(null);
        when(variant.getSaleStatus()).thenReturn(CatalogPolicy.ON_SALE);
        return variant;
    }

    private Product product(Long productId) {
        Product product = mock(Product.class);
        when(product.getProductId()).thenReturn(productId);
        when(product.getName()).thenReturn("FIDO Shirt");
        when(product.getBasePrice()).thenReturn(new BigDecimal("100000.00"));
        when(product.getSaleStatus()).thenReturn(CatalogPolicy.ON_SALE);
        return product;
    }

    private SizeValue size(Long sizeValueId) {
        SizeValue size = mock(SizeValue.class);
        when(size.getSizeValueId()).thenReturn(sizeValueId);
        when(size.getDisplayName()).thenReturn("M");
        return size;
    }

    private Color color(Long colorId) {
        Color color = mock(Color.class);
        when(color.getColorId()).thenReturn(colorId);
        when(color.getName()).thenReturn("Black");
        return color;
    }
}
