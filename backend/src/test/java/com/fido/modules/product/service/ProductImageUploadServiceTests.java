package com.fido.modules.product.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fido.modules.product.entity.Product;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

class ProductImageUploadServiceTests {

    @Test
    void validatesProductThenUploadsInRequestOrderAndPersistsUrls() {
        ImageStorageGateway storage = mock(ImageStorageGateway.class);
        CatalogReferenceService references = mock(CatalogReferenceService.class);
        ProductImageAdminService productImages = mock(ProductImageAdminService.class);
        ProductImageUploadService service = service(storage, references, productImages);

        MultipartFile front = image("front.png");
        MultipartFile back = image("back.png");
        when(references.product(21L)).thenReturn(mock(Product.class));
        when(storage.upload(front)).thenReturn(
                new ImageStorageGateway.UploadedImage("https://i.ibb.co/front.png")
        );
        when(storage.upload(back)).thenReturn(
                new ImageStorageGateway.UploadedImage("https://i.ibb.co/back.png")
        );

        service.upload(7L, 21L, new MultipartFile[]{front, back});

        InOrder order = inOrder(references, storage, productImages);
        order.verify(references).product(21L);
        order.verify(storage).upload(front);
        order.verify(storage).upload(back);
        order.verify(productImages).appendUploadedImages(
                7L,
                21L,
                List.of(
                        new ImageStorageGateway.UploadedImage("https://i.ibb.co/front.png"),
                        new ImageStorageGateway.UploadedImage("https://i.ibb.co/back.png")
                )
        );
    }

    @Test
    void storageFailurePreventsImagePersistence() {
        ImageStorageGateway storage = mock(ImageStorageGateway.class);
        CatalogReferenceService references = mock(CatalogReferenceService.class);
        ProductImageAdminService productImages = mock(ProductImageAdminService.class);
        ProductImageUploadService service = service(storage, references, productImages);

        MultipartFile image = image("front.png");
        when(references.product(21L)).thenReturn(mock(Product.class));
        when(storage.upload(image)).thenThrow(
                new ProductImageStorageException(
                        HttpStatus.BAD_GATEWAY,
                        "Image storage request failed"
                )
        );

        assertThrows(
                ProductImageStorageException.class,
                () -> service.upload(7L, 21L, new MultipartFile[]{image})
        );

        verify(productImages, never()).appendUploadedImages(any(), any(), any());
    }

    @Test
    void validatesAllFilesBeforeUploadingAnyFile() {
        ImageStorageGateway storage = mock(ImageStorageGateway.class);
        CatalogReferenceService references = mock(CatalogReferenceService.class);
        ProductImageAdminService productImages = mock(ProductImageAdminService.class);
        ProductImageUploadService service = service(storage, references, productImages);

        when(references.product(21L)).thenReturn(mock(Product.class));
        MultipartFile valid = image("front.png");
        MultipartFile invalid = new MockMultipartFile(
                "images",
                "notes.txt",
                "text/plain",
                new byte[]{1}
        );

        var error = assertThrows(
                ResponseStatusException.class,
                () -> service.upload(
                        7L,
                        21L,
                        new MultipartFile[]{valid, invalid}
                )
        );

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(storage, never()).upload(any());
        verify(productImages, never()).appendUploadedImages(any(), any(), any());
    }

    @Test
    void rejectsEmptyUploadAndFilesAboveConfiguredLimit() {
        ImageStorageGateway storage = mock(ImageStorageGateway.class);
        CatalogReferenceService references = mock(CatalogReferenceService.class);
        ProductImageAdminService productImages = mock(ProductImageAdminService.class);
        when(references.product(21L)).thenReturn(mock(Product.class));

        ProductImageUploadService normal = service(storage, references, productImages);
        var emptyError = assertThrows(
                ResponseStatusException.class,
                () -> normal.upload(7L, 21L, new MultipartFile[0])
        );
        assertEquals(HttpStatus.BAD_REQUEST, emptyError.getStatusCode());

        ProductImageUploadService limited = new ProductImageUploadService(
                storage,
                references,
                productImages,
                DataSize.ofBytes(2)
        );
        var sizeError = assertThrows(
                ResponseStatusException.class,
                () -> limited.upload(
                        7L,
                        21L,
                        new MultipartFile[]{image("front.png")}
                )
        );
        assertEquals(HttpStatus.BAD_REQUEST, sizeError.getStatusCode());

        verify(storage, never()).upload(any());
        verify(productImages, never()).appendUploadedImages(any(), any(), any());
    }

    private ProductImageUploadService service(
            ImageStorageGateway storage,
            CatalogReferenceService references,
            ProductImageAdminService productImages
    ) {
        return new ProductImageUploadService(
                storage,
                references,
                productImages,
                DataSize.ofMegabytes(32)
        );
    }

    private MultipartFile image(String filename) {
        return new MockMultipartFile(
                "images",
                filename,
                "image/png",
                new byte[]{1, 2, 3}
        );
    }
}
