package com.fido.modules.product.service;

import org.springframework.web.multipart.MultipartFile;

/**
 * Product-owned boundary for image storage.
 *
 * <p>Catalog code depends only on this contract and the returned direct URL;
 * provider-specific request/response details stay behind the implementation.</p>
 */
public interface ImageStorageGateway {

    UploadedImage upload(MultipartFile image);

    record UploadedImage(String url) {
    }
}
