package com.fido.modules.product.service;

import org.springframework.web.multipart.MultipartFile;

/**
 * Product-owned boundary for persisting uploaded product images outside the database.
 */
public interface ProductImageStorage {

    String upload(MultipartFile image);
}
