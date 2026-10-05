package com.fido.modules.product.service;

import com.fido.modules.product.dto.response.AdminProductDetailDto;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProductImageUploadService {

    private static final Logger log = LoggerFactory.getLogger(ProductImageUploadService.class);

    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_WRITE')";

    private static final Set<String> SUPPORTED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private static final int SIGNATURE_BYTES = 12;

    private final ImageStorageGateway storage;
    private final CatalogReferenceService references;
    private final ProductImageAdminService productImages;
    private final long maxImageBytes;
    private final int maxFilesPerRequest;

    public ProductImageUploadService(
            ImageStorageGateway storage,
            CatalogReferenceService references,
            ProductImageAdminService productImages,
            @Value("${app.image-storage.max-upload-size:32MB}") DataSize maxUploadSize,
            @Value("${app.image-storage.max-files-per-request:10}") int maxFilesPerRequest
    ) {
        if (maxUploadSize.toBytes() <= 0) {
            throw new IllegalArgumentException("Image upload size limit must be positive");
        }
        if (maxFilesPerRequest <= 0) {
            throw new IllegalArgumentException("Image upload file count limit must be positive");
        }

        this.storage = storage;
        this.references = references;
        this.productImages = productImages;
        this.maxImageBytes = maxUploadSize.toBytes();
        this.maxFilesPerRequest = maxFilesPerRequest;
    }

    @PreAuthorize(WRITE)
    public AdminProductDetailDto upload(
            Long actor,
            Long productId,
            MultipartFile[] imageFiles
    ) {
        long startedAt = System.nanoTime();
        references.product(productId);

        List<MultipartFile> files = imageFiles == null
                ? List.of()
                : Arrays.asList(imageFiles);

        if (files.isEmpty()) {
            throw badRequest("At least one image file is required");
        }
        if (files.size() > maxFilesPerRequest) {
            throw badRequest("Too many image files in one upload request");
        }

        for (MultipartFile file : files) {
            validate(file);
        }

        var uploaded = new ArrayList<ImageStorageGateway.UploadedImage>(files.size());
        for (MultipartFile file : files) {
            uploaded.add(storage.upload(file));
        }

        AdminProductDetailDto result = productImages.appendUploadedImages(
                actor,
                productId,
                List.copyOf(uploaded)
        );

        log.info(
                "Product image upload completed productId={} result=success durationMs={}",
                productId,
                elapsedMillis(startedAt)
        );
        return result;
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw badRequest("Image file must not be empty");
        }

        if (file.getSize() > maxImageBytes) {
            throw badRequest("Image file exceeds configured upload limit");
        }

        String declaredContentType = normalizeContentType(file.getContentType());
        if (!SUPPORTED_CONTENT_TYPES.contains(declaredContentType)) {
            throw badRequest("Unsupported image format");
        }

        String detectedContentType = detectContentType(file);
        if (!declaredContentType.equals(detectedContentType)) {
            throw badRequest("Image content does not match declared MIME type");
        }
    }

    private String normalizeContentType(String contentType) {
        if (contentType == null) {
            return "";
        }

        int separator = contentType.indexOf(';');
        String mediaType = separator >= 0
                ? contentType.substring(0, separator)
                : contentType;
        return mediaType.trim().toLowerCase(Locale.ROOT);
    }

    private String detectContentType(MultipartFile file) {
        byte[] signature = readSignature(file);

        if (isPng(signature)) {
            return "image/png";
        }
        if (isJpeg(signature)) {
            return "image/jpeg";
        }
        if (isWebp(signature)) {
            return "image/webp";
        }

        return "";
    }

    private byte[] readSignature(MultipartFile file) {
        try (InputStream input = file.getInputStream()) {
            return input.readNBytes(SIGNATURE_BYTES);
        } catch (IOException exception) {
            throw badRequest("Image file could not be read");
        }
    }

    private boolean isPng(byte[] bytes) {
        return bytes.length >= 8
                && bytes[0] == (byte) 0x89
                && bytes[1] == 0x50
                && bytes[2] == 0x4E
                && bytes[3] == 0x47
                && bytes[4] == 0x0D
                && bytes[5] == 0x0A
                && bytes[6] == 0x1A
                && bytes[7] == 0x0A;
    }

    private boolean isJpeg(byte[] bytes) {
        return bytes.length >= 3
                && bytes[0] == (byte) 0xFF
                && bytes[1] == (byte) 0xD8
                && bytes[2] == (byte) 0xFF;
    }

    private boolean isWebp(byte[] bytes) {
        return bytes.length >= 12
                && bytes[0] == 'R'
                && bytes[1] == 'I'
                && bytes[2] == 'F'
                && bytes[3] == 'F'
                && bytes[8] == 'W'
                && bytes[9] == 'E'
                && bytes[10] == 'B'
                && bytes[11] == 'P';
    }

    private long elapsedMillis(long startedAt) {
        return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt);
    }

    private ResponseStatusException badRequest(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }
}
