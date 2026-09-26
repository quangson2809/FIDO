package com.fido.modules.product.service;

import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class CatalogPolicy {
    public static final String ON_SALE = "ON_SALE";
    public static final String STOPPED = "STOPPED";
    public static final String CATALOG_READ = "CATALOG_READ";
    public static final String CATALOG_WRITE = "CATALOG_WRITE";
    private static final Set<String> SALE_STATUSES = Set.of(ON_SALE, STOPPED);

    private CatalogPolicy() {}

    public static void requireSaleStatus(String status) {
        if (!SALE_STATUSES.contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
    }
}
