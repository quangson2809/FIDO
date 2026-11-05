package com.fido.modules.product.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;

public final class CatalogPolicy {

    public static final String CATALOG_READ = "CATALOG_READ";
    public static final String CATALOG_WRITE = "CATALOG_WRITE";

    private static final Set<String> PRODUCT_STATUSES =
            Set.of("DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED");
    private static final Set<String> MASTER_DATA_STATUSES = Set.of("ACTIVE", "INACTIVE");

    private CatalogPolicy() {}

    public static void requireProductStatus(String status) {
        if (!PRODUCT_STATUSES.contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid product status");
        }
    }

    public static void requireMasterDataStatus(String status) {
        if (!MASTER_DATA_STATUSES.contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid category or brand status");
        }
    }
}
