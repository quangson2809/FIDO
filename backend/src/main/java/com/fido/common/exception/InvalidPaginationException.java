package com.fido.common.exception;

/** Invalid client-supplied paging bounds, distinct from programming errors. */
public class InvalidPaginationException extends IllegalArgumentException {
    public InvalidPaginationException() {
        super("Invalid pagination bounds");
    }
}
