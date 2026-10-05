package com.fido.modules.product.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fido.modules.product.repository.ProductImageRepository;
import com.fido.modules.product.repository.ProductRepresentativeImageView;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ProductImageReadServiceTests {

    @Test
    void representativeImagesUseOneDistinctBatchQuery() {
        ProductImageRepository images = mock(ProductImageRepository.class);
        ProductImageReadService service = new ProductImageReadService(images);

        ProductRepresentativeImageView first = projection(
                10L,
                "https://cdn.test/ten.jpg"
        );
        ProductRepresentativeImageView second = projection(
                20L,
                "https://cdn.test/twenty.jpg"
        );
        when(images.findRepresentativeImagesByProductIdIn(List.of(10L, 20L)))
                .thenReturn(List.of(first, second));

        Map<Long, String> result = service.representativeByProductIds(
                List.of(10L, 20L, 10L)
        );

        assertEquals(
                Map.of(
                        10L, "https://cdn.test/ten.jpg",
                        20L, "https://cdn.test/twenty.jpg"
                ),
                result
        );
        verify(images).findRepresentativeImagesByProductIdIn(List.of(10L, 20L));
    }

    @Test
    void emptyRepresentativeRequestDoesNotHitRepository() {
        ProductImageRepository images = mock(ProductImageRepository.class);
        ProductImageReadService service = new ProductImageReadService(images);

        assertEquals(Map.of(), service.representativeByProductIds(List.of()));

        verify(images, never()).findRepresentativeImagesByProductIdIn(List.of());
    }

    private ProductRepresentativeImageView projection(
            Long productId,
            String imageUrl
    ) {
        ProductRepresentativeImageView view = mock(ProductRepresentativeImageView.class);
        when(view.getProductId()).thenReturn(productId);
        when(view.getImageUrl()).thenReturn(imageUrl);
        return view;
    }
}
