package com.fido.common.response;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PaginationMeta(
        int page,
        @JsonProperty("page_size") int pageSize,
        long total,
        @JsonProperty("total_pages") int totalPages) {}
