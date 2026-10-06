package com.fido.modules.product.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public class ProductImageStorageException extends ResponseStatusException {

    public ProductImageStorageException(
            HttpStatus status,
            String reason
    ) {
        super(status, reason);
    }
}
