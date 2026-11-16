package com.fido.common.response;

import java.util.List;

public record ApiListResponse<T>(List<T> data, PaginationMeta meta) {

    public static <T> ApiListResponse<T> of(List<T> data, PaginationMeta meta) {
        return new ApiListResponse<>(data, meta);
    }
}
