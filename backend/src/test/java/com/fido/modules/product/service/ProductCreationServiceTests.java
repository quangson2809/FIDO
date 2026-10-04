package com.fido.modules.product.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fido.modules.product.dto.request.ProductCreateRequest;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

class ProductCreationServiceTests {

    @Test
    void uploadsFilesInRequestOrderBeforeProductWrite() {
        ImageStorageGateway storage = mock(ImageStorageGateway.class);
        ProductAdminService products = mock(ProductAdminService.class);
        ProductCreationService service = service(storage, products);

        MultipartFile front = image("front.png");
        MultipartFile back = image("back.png");
        ProductCreateRequest request = request();

        when(storage.upload(front)).thenReturn(
                new ImageStorageGateway.UploadedImage("https://i.ibb.co/front.png")
        );
        when(storage.upload(back)).thenReturn(
                new ImageStorageGateway.UploadedImage("https://i.ibb.co/back.png")
        );

        service.createProduct(7L, request, new MultipartFile[]{front, back});

        InOrder order = inOrder(storage, products);
        order.verify(storage).upload(front);
        order.verify(storage).upload(back);

        ArgumentCaptor<ProductCreateRequest> savedRequest =
                ArgumentCaptor.forClass(ProductCreateRequest.class);
        order.verify(products).createProduct(
                org.mockito.ArgumentMatchers.eq(7L),
                savedRequest.capture()
        );

        assertEquals(
                List.of(
                        new ProductCreateRequest.ImageInput("https://i.ibb.co/front.png", null),
                        new ProductCreateRequest.ImageInput("https://i.ibb.co/back.png", null)
                ),
                savedRequest.getValue().images()
        );
    }

    @Test
    void uploadFailurePreventsProductWrite() {
        ImageStorageGateway storage = mock(ImageStorageGateway.class);
        ProductAdminService products = mock(ProductAdminService.class);
        ProductCreationService service = service(storage, products);

        MultipartFile image = image("front.png");
        when(storage.upload(image)).thenThrow(
                new ProductImageStorageException(
                        HttpStatus.BAD_GATEWAY,
                        "Image storage request failed"
                )
        );

        assertThrows(
                ProductImageStorageException.class,
                () -> service.createProduct(
                        7L,
                        request(),
                        new MultipartFile[]{image}
                )
        );

        verify(products, never()).createProduct(any(), any());
    }

    @Test
    void rejectsJsonImageUrlsInsideMultipartMetadataBeforeUploading() {
        ImageStorageGateway storage = mock(ImageStorageGateway.class);
        ProductAdminService products = mock(ProductAdminService.class);
        ProductCreationService service = service(storage, products);

        ProductCreateRequest baseRequest = request();
        ProductCreateRequest multipartRequest = new ProductCreateRequest(
                baseRequest.category_id(),
                baseRequest.brand_id(),
                baseRequest.size_system_id(),
                baseRequest.name(),
                baseRequest.description(),
                baseRequest.gender(),
                baseRequest.season(),
                baseRequest.style(),
                baseRequest.material_care(),
                baseRequest.base_price(),
                baseRequest.sale_status(),
                List.of(new ProductCreateRequest.ImageInput(
                        "https://example.test/image.png",
                        null
                )),
                baseRequest.variants()
        );

        var error = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> service.createProduct(
                        7L,
                        multipartRequest,
                        new MultipartFile[]{image("front.png")}
                )
        );

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(storage, never()).upload(any());
        verify(products, never()).createProduct(any(), any());
    }

    @Test
    void rejectsFilesAboveConfiguredUploadLimitBeforeCallingStorage() {
        ImageStorageGateway storage = mock(ImageStorageGateway.class);
        ProductAdminService products = mock(ProductAdminService.class);
        ProductCreationService service = new ProductCreationService(
                storage,
                products,
                DataSize.ofBytes(2)
        );

        var error = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> service.createProduct(
                        7L,
                        request(),
                        new MultipartFile[]{image("front.png")}
                )
        );

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(storage, never()).upload(any());
        verify(products, never()).createProduct(any(), any());
    }

    private ProductCreationService service(
            ImageStorageGateway storage,
            ProductAdminService products
    ) {
        return new ProductCreationService(
                storage,
                products,
                DataSize.ofMegabytes(32)
        );
    }

    private ProductCreateRequest request() {
        return new ProductCreateRequest(
                1L,
                2L,
                3L,
                "FIDO Shirt",
                null,
                "unisex",
                null,
                null,
                null,
                new BigDecimal("100000.00"),
                "ON_SALE",
                List.of(),
                List.of()
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
