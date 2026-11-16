package com.fido.common.response;

import com.fido.common.exception.InvalidPaginationException;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

/** API nhận số trang từ 1; chuyển sang chỉ số từ 0 khi truy vấn Spring Data. */
public record Pagination(int page, int pageSize) {

    public static final int DEFAULT_PAGE = 1;
    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;

    public Pagination {
        if (page < 1 || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
            throw new InvalidPaginationException();
        }
    }

    public static Pagination of(Integer page, Integer pageSize) {
        return new Pagination(
                page == null ? DEFAULT_PAGE : page,
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
