package com.fido.common.response;

/** Standard envelope for a single API resource. */
public record ApiResponse<T>(T data) {

    public static <T> ApiResponse<T> of(T data) {
        return new ApiResponse<>(data);
    }
}
