package com.fido.modules.product.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.product.dto.request.ProductImageReorderRequest;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.entity.ProductImage;
import com.fido.modules.product.repository.ProductImageRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@ExtendWith(MockitoExtension.class)
class ProductImageAdminServiceTests {

    @Mock private ProductImageRepository images;
    @Mock private CatalogReferenceService references;
    @Mock private AdminCatalogQueryService query;
    @Mock private AuditWriteService audit;

    private ProductImageAdminService service;

    @BeforeEach
    void setUp() {
        service = new ProductImageAdminService(images, references, query, audit);
        when(references.productForUpdate(55L)).thenReturn(mock(Product.class));
    }

    @Test
    void appendUploadedImagesContinuesDenseSortOrder() {
        ProductImage cover = image(1L, 0, "https://cdn.test/cover.jpg");
        ProductImage second = image(2L, 1, "https://cdn.test/second.jpg");
        when(images.findAllByProductIdForUpdate(55L)).thenReturn(List.of(cover, second));

        service.appendUploadedImages(
                55L,
                List.of(
                        new ImageStorageGateway.UploadedImage("https://cdn.test/third.jpg"),
                        new ImageStorageGateway.UploadedImage("https://cdn.test/fourth.jpg")));

        ArgumentCaptor<ProductImage> saved = ArgumentCaptor.forClass(ProductImage.class);
        verify(images, times(2)).save(saved.capture());
        assertEquals(
                List.of(2, 3),
                saved.getAllValues().stream().map(ProductImage::getSortOrder).toList());
        assertEquals(
                List.of("https://cdn.test/third.jpg", "https://cdn.test/fourth.jpg"),
                saved.getAllValues().stream().map(ProductImage::getImageUrl).toList());
        assertEquals(0, cover.getSortOrder());
        assertEquals(true, cover.getIsPrimary());
        assertEquals(List.of(false, false), saved.getAllValues().stream().map(ProductImage::getIsPrimary).toList());
        verify(audit).record(any());
    }

    @Test
    void removeCoverPromotesNextImageAndNormalizesSortOrder() {
        ProductImage cover = image(1L, 0, "https://cdn.test/cover.jpg");
        ProductImage second = image(2L, 1, "https://cdn.test/second.jpg");
        ProductImage third = image(3L, 2, "https://cdn.test/third.jpg");
        when(images.findAllByProductIdForUpdate(55L)).thenReturn(List.of(cover, second, third));

        service.removeImage(55L, 1L);

        verify(images).delete(cover);
        assertEquals(0, second.getSortOrder());
        assertEquals(1, third.getSortOrder());
        assertEquals(true, second.getIsPrimary());
        assertEquals(false, third.getIsPrimary());
        verify(images, times(3)).flush();
        verify(audit).record(any());
    }

    @Test
    void reorderSelectsNewCoverAndProducesDenseSortOrder() {
        ProductImage first = image(1L, 0, "https://cdn.test/first.jpg");
        ProductImage second = image(2L, 1, "https://cdn.test/second.jpg");
        ProductImage third = image(3L, 2, "https://cdn.test/third.jpg");
        when(images.findAllByProductIdForUpdate(55L)).thenReturn(List.of(first, second, third));

        service.reorderImages(
                55L,
                new ProductImageReorderRequest(
                        List.of(
                                new ProductImageReorderRequest.ImageOrder(3L, 0),
                                new ProductImageReorderRequest.ImageOrder(1L, 1),
                                new ProductImageReorderRequest.ImageOrder(2L, 2))));

        assertEquals(0, third.getSortOrder());
        assertEquals(1, first.getSortOrder());
        assertEquals(2, second.getSortOrder());
        assertEquals(true, third.getIsPrimary());
        assertEquals(false, first.getIsPrimary());
        assertEquals(false, second.getIsPrimary());
        verify(images, times(2)).flush();
        verify(audit).record(any());
    }

    @Test
    void reorderRejectsDuplicateFinalPositionBeforeMutation() {
        ProductImage first = image(1L, 0, "https://cdn.test/first.jpg");
        ProductImage second = image(2L, 1, "https://cdn.test/second.jpg");
        when(images.findAllByProductIdForUpdate(55L)).thenReturn(List.of(first, second));

        ResponseStatusException error =
                assertThrows(
                        ResponseStatusException.class,
                        () ->
                                service.reorderImages(
                                        55L,
                                        new ProductImageReorderRequest(
                                                List.of(
                                                        new ProductImageReorderRequest.ImageOrder(
                                                                1L, 0),
                                                        new ProductImageReorderRequest.ImageOrder(
                                                                2L, 0)))));

        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        assertEquals(0, first.getSortOrder());
        assertEquals(1, second.getSortOrder());
    }

    @Test
    void appendFirstImageMakesItPrimaryWhenGalleryIsEmpty() {
        when(images.findAllByProductIdForUpdate(55L)).thenReturn(List.of());

        service.appendUploadedImages(
                55L, List.of(new ImageStorageGateway.UploadedImage("https://cdn.test/first.jpg")));

        ArgumentCaptor<ProductImage> saved = ArgumentCaptor.forClass(ProductImage.class);
        verify(images).save(saved.capture());
        assertEquals(0, saved.getValue().getSortOrder());
        assertEquals(true, saved.getValue().getIsPrimary());
    }

    @Test
    void appendRejectsGappedExistingGalleryInsteadOfSilentlyRepairingIt() {
        ProductImage first = image(1L, 0, "https://cdn.test/first.jpg");
        ProductImage third = image(3L, 2, "https://cdn.test/third.jpg");
        when(images.findAllByProductIdForUpdate(55L)).thenReturn(List.of(first, third));

        ResponseStatusException error =
                assertThrows(
                        ResponseStatusException.class,
                        () -> service.appendUploadedImages(
                                55L,
                                List.of(new ImageStorageGateway.UploadedImage("https://cdn.test/new.jpg"))));

        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        verify(images, never()).save(any());
    }

    private ProductImage image(Long id, int sortOrder, String url) {
        ProductImage image = new ProductImage();
        image.setImageId(id);
        image.setProductId(55L);
        image.setImageUrl(url);
        image.setSortOrder(sortOrder);
        image.setIsPrimary(sortOrder == 0);
        return image;
    }
}
