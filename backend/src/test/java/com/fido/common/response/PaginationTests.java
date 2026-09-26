package com.fido.common.response;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PaginationTests {
    @Test
    void defaultsAndConversionMatchApiContract() {
        Pagination page = Pagination.of(null, null);
        assertEquals(1, page.page());
        assertEquals(20, page.pageSize());
        assertEquals(0, page.toPageable().getPageNumber());
        assertEquals(0, page.meta(0).totalPages());
        assertEquals(2, page.meta(21).totalPages());
        assertEquals(1, page.meta(20).totalPages());
        assertEquals(1, Pagination.of(2, 100).toPageable().getPageNumber());
    }

    @Test
    void rejectsOutOfContractBounds() {
        assertThrows(IllegalArgumentException.class, () -> Pagination.of(0, 20));
        assertThrows(IllegalArgumentException.class, () -> Pagination.of(1, 0));
        assertThrows(IllegalArgumentException.class, () -> Pagination.of(1, 101));
    }
}
