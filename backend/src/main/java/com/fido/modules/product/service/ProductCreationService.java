package com.fido.modules.product.service;

import com.fido.modules.product.dto.request.ProductCreateRequest;
import com.fido.modules.product.dto.response.AdminProductDetailDto;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProductCreationService {

    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_WRITE')";

    private final ImageStorageGateway storage;
    private final ProductAdminService products;
    private final long maxImageBytes;

    public ProductCreationService(
            ImageStorageGateway storage,
            ProductAdminService products,
            @Value("${app.image-storage.max-upload-size:32MB}") DataSize maxUploadSize
    ) {
        this.storage = storage;
        this.products = products;
        this.maxImageBytes = maxUploadSize.toBytes();
    }

    @PreAuthorize(WRITE)
    public AdminProductDetailDto createProduct(
            Long actor,
            ProductCreateRequest request,
            MultipartFile[] imageFiles
    ) {
        if (request.images() != null && !request.images().isEmpty()) {
            throw badRequest("Multipart product metadata must not contain image URLs");
        }

        List<MultipartFile> files = imageFiles == null
                ? List.of()
                : Arrays.asList(imageFiles);

        for (MultipartFile file : files) {
            validate(file);
        }

        var uploadedImages = new ArrayList<ProductCreateRequest.ImageInput>();
        for (MultipartFile file : files) {
            ImageStorageGateway.UploadedImage stored = storage.upload(file);
            uploadedImages.add(new ProductCreateRequest.ImageInput(stored.url(), null));
        }

        return products.createProduct(
                actor,
                withImages(request, uploadedImages)
        );
    }

    private ProductCreateRequest withImages(
            ProductCreateRequest request,
            List<ProductCreateRequest.ImageInput> images
    ) {
        return new ProductCreateRequest(
                request.category_id(),
                request.brand_id(),
                request.size_system_id(),
                request.name(),
                request.description(),
                request.gender(),
                request.season(),
                request.style(),
                request.material_care(),
                request.base_price(),
                request.sale_status(),
                List.copyOf(images),
                request.variants()
        );
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw badRequest("Image file must not be empty");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw badRequest("Uploaded file must be an image");
        }
        if (file.getSize() > maxImageBytes) {
            throw badRequest("Image file exceeds configured upload limit");
        }
    }

    private ResponseStatusException badRequest(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }
}
