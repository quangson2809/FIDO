package com.fido.modules.product.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fido.modules.product.dto.request.ProductCreateRequest;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

class ProductCreationServiceTests {

    @Test
    void uploadsFilesInRequestOrderBeforeTransactionalWrite() {
        ProductImageStorage storage = mock(ProductImageStorage.class);
        ProductAdminService products = mock(ProductAdminService.class);
        ProductCreationService service = new ProductCreationService(
                storage,
                products
        );

        MultipartFile front = image("front.png");
        MultipartFile back = image("back.png");
        ProductCreateRequest request = request();

        when(storage.upload(front)).thenReturn("https://i.ibb.co/front.png");
        when(storage.upload(back)).thenReturn("https://i.ibb.co/back.png");

        service.createProduct(
                7L,
                request,
                new MultipartFile[]{front, back}
        );

        InOrder order = inOrder(storage, products);
        order.verify(storage).upload(front);
        order.verify(storage).upload(back);
        order.verify(products).createProduct(
                7L,
                request,
                List.of(
                        "https://i.ibb.co/front.png",
                        "https://i.ibb.co/back.png"
                )
        );
    }

    @Test
    void uploadFailurePreventsProductWrite() {
        ProductImageStorage storage = mock(ProductImageStorage.class);
        ProductAdminService products = mock(ProductAdminService.class);
        ProductCreationService service = new ProductCreationService(
                storage,
                products
        );

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

        verifyNoInteractions(products);
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
