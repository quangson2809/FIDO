package com.fido.modules.product.service;

import com.fido.common.exception.SafeLogMessage;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public class ProductImageStorageException extends ResponseStatusException
        implements SafeLogMessage {

    private final String logMessage;

    public ProductImageStorageException(
            HttpStatus status,
            String reason
    ) {
        super(status, reason);
        this.logMessage = reason;
    }

    @Override
    public String logMessage() {
        return logMessage;
    }
}
