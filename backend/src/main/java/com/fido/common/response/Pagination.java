package com.fido.common.response;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

/** One-based API paging, converted explicitly to Spring Data's zero-based paging. */
public record Pagination(int page, int pageSize) {
    public static final int DEFAULT_PAGE = 1;
    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;

    public Pagination {
        if (page < 1 || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("Invalid pagination bounds");
        }
    }

    public static Pagination of(Integer page, Integer pageSize) {
        return new Pagination(page == null ? DEFAULT_PAGE : page,
                pageSize == null ? DEFAULT_PAGE_SIZE : pageSize);
    }

    public Pageable toPageable() {
        return PageRequest.of(page - 1, pageSize);
    }

    public PaginationMeta meta(long total) {
        if (total < 0) {
            throw new IllegalArgumentException("Total cannot be negative");
        }
        long pages = total / pageSize + (total % pageSize == 0 ? 0 : 1);
        return new PaginationMeta(page, pageSize, total, Math.toIntExact(pages));
    }
}
