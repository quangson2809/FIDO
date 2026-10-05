package com.fido.modules.product.service;

import org.springframework.web.multipart.MultipartFile;

/**
 * Product-owned boundary for image storage.
 *
 * <p>Catalog code depends only on this contract and the returned direct URL;
 * provider-specific request/response details stay behind the implementation.</p>
 *
 * <p>The MVP boundary is intentionally upload-only. Removing a ProductImage
 * removes the catalog association but does not delete the remote asset because
 * historical OrderItem snapshots may still reference the stored URL. Asset
 * registry, reference tracking, retention periods and garbage collection are
 * deferred until there is a demonstrated cleanup requirement.</p>
 */
public interface ImageStorageGateway {

    UploadedImage upload(MultipartFile image);

    record UploadedImage(String url) {
    }
}
