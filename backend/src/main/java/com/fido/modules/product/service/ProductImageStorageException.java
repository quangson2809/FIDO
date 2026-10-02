package com.fido.modules.product.service;

import org.springframework.http.HttpStatusCode;
import org.springframework.web.server.ResponseStatusException;

/**
 * Sanitized integration failure. The reason must never contain provider credentials or request URIs.
 */
public final class ProductImageStorageException extends ResponseStatusException {

    public ProductImageStorageException(
            HttpStatusCode status,
            String reason
    ) {
        super(status, reason);
    }
}
