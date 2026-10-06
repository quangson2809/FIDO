package com.fido.modules.product.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fido.modules.audit.service.AuditService;
import com.fido.modules.product.dto.request.ProductImageReorderRequest;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.entity.ProductImage;
import com.fido.modules.product.repository.ProductImageRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class ProductImageAdminServiceTests {

    @Mock private ProductImageRepository images;
    @Mock private CatalogReferenceService references;
    @Mock private AdminCatalogQueryService query;
    @Mock private AuditService audit;

    private ProductImageAdminService service;

    @BeforeEach
    void setUp() {
        service = new ProductImageAdminService(
                images,
                references,
                query,
                audit
        );
        when(references.productForUpdate(55L)).thenReturn(mock(Product.class));
    }

    @Test
    void appendUploadedImagesContinuesDenseSortOrder() {
        ProductImage cover = image(1L, 0, "https://cdn.test/cover.jpg");
        ProductImage second = image(2L, 1, "https://cdn.test/second.jpg");
        when(images.findAllByProductIdOrderBySortOrderAsc(55L))
                .thenReturn(List.of(cover, second));

        service.appendUploadedImages(
                7L,
                55L,
                List.of(
                        new ImageStorageGateway.UploadedImage("https://cdn.test/third.jpg"),
                        new ImageStorageGateway.UploadedImage("https://cdn.test/fourth.jpg")
                )
        );

        ArgumentCaptor<ProductImage> saved = ArgumentCaptor.forClass(ProductImage.class);
        verify(images, times(2)).save(saved.capture());
        assertEquals(
                List.of(2, 3),
                saved.getAllValues().stream()
                        .map(ProductImage::getSortOrder)
                        .toList()
        );
        assertEquals(
                List.of(
                        "https://cdn.test/third.jpg",
                        "https://cdn.test/fourth.jpg"
                ),
                saved.getAllValues().stream()
                        .map(ProductImage::getImageUrl)
                        .toList()
        );
        assertEquals(0, cover.getSortOrder());
        verify(audit).record(any());
    }

    @Test
    void removeCoverPromotesNextImageAndNormalizesSortOrder() {
        ProductImage cover = image(1L, 0, "https://cdn.test/cover.jpg");
        ProductImage second = image(2L, 1, "https://cdn.test/second.jpg");
        ProductImage third = image(3L, 2, "https://cdn.test/third.jpg");
        when(images.findAllByProductIdForUpdate(55L))
                .thenReturn(List.of(cover, second, third));

        service.removeImage(7L, 55L, 1L);

        verify(images).delete(cover);
        assertEquals(0, second.getSortOrder());
        assertEquals(1, third.getSortOrder());
        verify(images, times(3)).flush();
        verify(audit).record(any());
    }

    @Test
    void reorderSelectsNewCoverAndProducesDenseSortOrder() {
        ProductImage first = image(1L, 0, "https://cdn.test/first.jpg");
        ProductImage second = image(2L, 1, "https://cdn.test/second.jpg");
        ProductImage third = image(3L, 2, "https://cdn.test/third.jpg");
        when(images.findAllByProductIdForUpdate(55L))
                .thenReturn(List.of(first, second, third));

        service.reorderImages(
                7L,
                55L,
                new ProductImageReorderRequest(
                        List.of(
                                new ProductImageReorderRequest.ImageOrder(3L, 0),
                                new ProductImageReorderRequest.ImageOrder(1L, 1),
                                new ProductImageReorderRequest.ImageOrder(2L, 2)
                        )
                )
        );

        assertEquals(0, third.getSortOrder());
        assertEquals(1, first.getSortOrder());
        assertEquals(2, second.getSortOrder());
        verify(images, times(2)).flush();
        verify(audit).record(any());
    }

    @Test
    void reorderRejectsDuplicateFinalPositionBeforeMutation() {
        ProductImage first = image(1L, 0, "https://cdn.test/first.jpg");
        ProductImage second = image(2L, 1, "https://cdn.test/second.jpg");
        when(images.findAllByProductIdForUpdate(55L))
                .thenReturn(List.of(first, second));

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> service.reorderImages(
                        7L,
                        55L,
                        new ProductImageReorderRequest(
                                List.of(
                                        new ProductImageReorderRequest.ImageOrder(1L, 0),
                                        new ProductImageReorderRequest.ImageOrder(2L, 0)
                                )
                        )
                )
        );

        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        assertEquals(0, first.getSortOrder());
        assertEquals(1, second.getSortOrder());
    }

    private ProductImage image(Long id, int sortOrder, String url) {
        ProductImage image = new ProductImage();
        image.setImageId(id);
        image.setProductId(55L);
        image.setImageUrl(url);
        image.setSortOrder(sortOrder);
        return image;
    }
}
