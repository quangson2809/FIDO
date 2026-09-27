package com.fido.modules.product.service;

import com.fido.modules.product.repository.ProductVariantRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Minimal cross-module contract for Variant identity validation.
 * It deliberately does not depend on Inventory or expose Product entities.
 */
@Service
@Transactional(readOnly = true)
public class CatalogVariantReferenceService {

    private final ProductVariantRepository variants;

    public CatalogVariantReferenceService(
            ProductVariantRepository variants
    ) {
        this.variants = variants;
    }

    public void requireExists(Long variantId) {
        if (variants.findById(variantId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
    }
}
