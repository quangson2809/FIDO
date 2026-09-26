package com.fido.modules.inventory.service;

import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class InventoryPolicy {

    public static final String SUPPLIER_ACTIVE = "ACTIVE";
    public static final String SUPPLIER_INACTIVE = "INACTIVE";

    public static final String RECEIPT_DRAFT = "DRAFT";
    public static final String RECEIPT_CONFIRMED = "CONFIRMED";
    public static final String RECEIPT_CANCELLED = "CANCELLED";

    public static final String RECEIPT_IN = "RECEIPT_IN";
    public static final String ADJUSTMENT_IN = "ADJUSTMENT_IN";
    public static final String ADJUSTMENT_OUT = "ADJUSTMENT_OUT";

    public static final String INVENTORY_READ = "INVENTORY_READ";
    public static final String INVENTORY_WRITE = "INVENTORY_WRITE";

    private static final Set<String> SUPPLIER_STATUSES = Set.of(
            SUPPLIER_ACTIVE,
            SUPPLIER_INACTIVE
    );

    private static final Set<String> RECEIPT_STATUSES = Set.of(
            RECEIPT_DRAFT,
            RECEIPT_CONFIRMED,
            RECEIPT_CANCELLED
    );

    private InventoryPolicy() {
    }

    public static void requireSupplierStatus(String status) {
        if (!SUPPLIER_STATUSES.contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
    }

    public static void requireReceiptStatus(String status) {
        if (!RECEIPT_STATUSES.contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
    }
}
