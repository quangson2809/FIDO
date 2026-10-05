package com.fido.modules.product.service;

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
public class ProductImageUploadService {

    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_WRITE')";

    private final ImageStorageGateway storage;
    private final CatalogReferenceService references;
    private final ProductImageAdminService productImages;
    private final long maxImageBytes;

    public ProductImageUploadService(
            ImageStorageGateway storage,
            CatalogReferenceService references,
            ProductImageAdminService productImages,
            @Value("${app.image-storage.max-upload-size:32MB}") DataSize maxUploadSize
    ) {
        this.storage = storage;
        this.references = references;
        this.productImages = productImages;
        this.maxImageBytes = maxUploadSize.toBytes();
    }

    @PreAuthorize(WRITE)
    public AdminProductDetailDto upload(
            Long actor,
            Long productId,
            MultipartFile[] imageFiles
    ) {
        references.product(productId);

        List<MultipartFile> files = imageFiles == null
                ? List.of()
                : Arrays.asList(imageFiles);

        if (files.isEmpty()) {
            throw badRequest("At least one image file is required");
        }

        for (MultipartFile file : files) {
            validate(file);
        }

        var uploaded = new ArrayList<ImageStorageGateway.UploadedImage>(files.size());
        for (MultipartFile file : files) {
            uploaded.add(storage.upload(file));
        }

        return productImages.appendUploadedImages(
                actor,
                productId,
                List.copyOf(uploaded)
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
