package com.fido.modules.product.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fido.modules.product.entity.Product;
import java.nio.charset.StandardCharsets;
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

        MultipartFile front = png("front.png");
        MultipartFile back = png("back.png");
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
    void acceptsOnlySupportedImageSignatures() {
        ImageStorageGateway storage = mock(ImageStorageGateway.class);
        CatalogReferenceService references = mock(CatalogReferenceService.class);
        ProductImageAdminService productImages = mock(ProductImageAdminService.class);
        ProductImageUploadService service = service(storage, references, productImages);

        when(references.product(21L)).thenReturn(mock(Product.class));
        when(storage.upload(any())).thenReturn(
                new ImageStorageGateway.UploadedImage("https://i.ibb.co/image")
        );

        service.upload(
                7L,
                21L,
                new MultipartFile[]{
                        png("front.png"),
                        jpeg("front.jpg"),
                        webp("front.webp")
                }
        );

        verify(storage, times(3)).upload(any());
        verify(productImages).appendUploadedImages(any(), any(), any());
    }

    @Test
    void storageFailurePreventsImagePersistence() {
        ImageStorageGateway storage = mock(ImageStorageGateway.class);
        CatalogReferenceService references = mock(CatalogReferenceService.class);
        ProductImageAdminService productImages = mock(ProductImageAdminService.class);
        ProductImageUploadService service = service(storage, references, productImages);

        MultipartFile image = png("front.png");
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
        MultipartFile valid = png("front.png");
        MultipartFile invalid = new MockMultipartFile(
                "images",
                "notes.txt",
                "text/plain",
                "plain text".getBytes(StandardCharsets.UTF_8)
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
                DataSize.ofBytes(2),
                10
        );
        var sizeError = assertThrows(
                ResponseStatusException.class,
                () -> limited.upload(
                        7L,
                        21L,
                        new MultipartFile[]{png("front.png")}
                )
        );
        assertEquals(HttpStatus.BAD_REQUEST, sizeError.getStatusCode());

        verify(storage, never()).upload(any());
        verify(productImages, never()).appendUploadedImages(any(), any(), any());
    }

    @Test
    void rejectsTooManyFilesBeforeUploadingAnyFile() {
        ImageStorageGateway storage = mock(ImageStorageGateway.class);
        CatalogReferenceService references = mock(CatalogReferenceService.class);
        ProductImageAdminService productImages = mock(ProductImageAdminService.class);
        when(references.product(21L)).thenReturn(mock(Product.class));

        ProductImageUploadService service = new ProductImageUploadService(
                storage,
                references,
                productImages,
                DataSize.ofMegabytes(32),
                2
        );

        var error = assertThrows(
                ResponseStatusException.class,
                () -> service.upload(
                        7L,
                        21L,
                        new MultipartFile[]{
                                png("one.png"),
                                png("two.png"),
                                png("three.png")
                        }
                )
        );

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(storage, never()).upload(any());
        verify(productImages, never()).appendUploadedImages(any(), any(), any());
    }

    @Test
    void rejectsForgedOrMismatchedMimeBeforeCallingStorage() {
        ImageStorageGateway storage = mock(ImageStorageGateway.class);
        CatalogReferenceService references = mock(CatalogReferenceService.class);
        ProductImageAdminService productImages = mock(ProductImageAdminService.class);
        ProductImageUploadService service = service(storage, references, productImages);
        when(references.product(21L)).thenReturn(mock(Product.class));

        MultipartFile forged = new MockMultipartFile(
                "images",
                "forged.png",
                "image/png",
                "not-an-image".getBytes(StandardCharsets.UTF_8)
        );
        MultipartFile mismatch = new MockMultipartFile(
                "images",
                "wrong.jpg",
                "image/jpeg",
                pngBytes()
        );
        MultipartFile unsupported = new MockMultipartFile(
                "images",
                "animation.gif",
                "image/gif",
                "GIF89a".getBytes(StandardCharsets.US_ASCII)
        );

        assertBadRequest(service, forged);
        assertBadRequest(service, mismatch);
        assertBadRequest(service, unsupported);

        verify(storage, never()).upload(any());
        verify(productImages, never()).appendUploadedImages(any(), any(), any());
    }

    private void assertBadRequest(
            ProductImageUploadService service,
            MultipartFile file
    ) {
        var error = assertThrows(
                ResponseStatusException.class,
                () -> service.upload(7L, 21L, new MultipartFile[]{file})
        );
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
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
                DataSize.ofMegabytes(32),
                10
        );
    }

    private MultipartFile png(String filename) {
        return new MockMultipartFile(
                "images",
                filename,
                "image/png",
                pngBytes()
        );
    }

    private MultipartFile jpeg(String filename) {
        return new MockMultipartFile(
                "images",
                filename,
                "image/jpeg",
                new byte[]{
                        (byte) 0xFF,
                        (byte) 0xD8,
                        (byte) 0xFF,
                        (byte) 0xE0,
                        0,
                        0
                }
        );
    }

    private MultipartFile webp(String filename) {
        return new MockMultipartFile(
                "images",
                filename,
                "image/webp",
                new byte[]{
                        'R', 'I', 'F', 'F',
                        0, 0, 0, 0,
                        'W', 'E', 'B', 'P'
                }
        );
    }

    private byte[] pngBytes() {
        return new byte[]{
                (byte) 0x89,
                0x50,
                0x4E,
                0x47,
                0x0D,
                0x0A,
                0x1A,
                0x0A,
                0,
                0,
                0,
                0
        };
    }
}
