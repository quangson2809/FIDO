package com.fido.common.response;

import java.util.List;

/** Standard envelope for a paginated API list. */
public record ApiListResponse<T>(List<T> data, PaginationMeta meta) {

    public static <T> ApiListResponse<T> of(List<T> data, PaginationMeta meta) {
        return new ApiListResponse<>(data, meta);
    }
}
