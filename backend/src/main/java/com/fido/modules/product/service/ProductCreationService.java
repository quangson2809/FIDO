package com.fido.modules.product.service;

import com.fido.modules.product.dto.request.ProductCreateRequest;
import com.fido.modules.product.dto.response.AdminProductDetailDto;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Coordinates external image uploads before entering the transactional product write.
 */
@Service
public class ProductCreationService {

    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_WRITE')";

    private final ProductImageStorage imageStorage;
    private final ProductAdminService products;

    public ProductCreationService(
            ProductImageStorage imageStorage,
            ProductAdminService products
    ) {
        this.imageStorage = imageStorage;
        this.products = products;
    }

    @PreAuthorize(WRITE)
    public AdminProductDetailDto createProduct(
            Long actor,
            ProductCreateRequest request,
            MultipartFile[] images
    ) {
        List<String> uploadedImageUrls = uploadImages(images);

        return products.createProduct(
                actor,
                request,
                uploadedImageUrls
        );
    }

    private List<String> uploadImages(MultipartFile[] images) {
        if (images == null || images.length == 0) {
            return List.of();
        }

        List<String> uploadedUrls = new ArrayList<>(images.length);

        for (MultipartFile image : images) {
            if (image == null || image.isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Image file must not be empty"
                );
            }

            uploadedUrls.add(imageStorage.upload(image));
        }

        return List.copyOf(uploadedUrls);
    }
}
