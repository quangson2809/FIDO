package com.fido.modules.product.service;

import org.springframework.web.multipart.MultipartFile;

/**
 * Product-owned boundary for remote image storage.
 */
public interface ProductImageStorage {

    StoredImage upload(MultipartFile image);

    record StoredImage(
            String url,
            String providerId,
            String deleteUrl
    ) {
    }
}
