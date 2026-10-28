package com.fido.modules.inventory.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;
import java.util.regex.Pattern;

public final class InventoryPolicy {
    public static final String SUPPLIER_ACTIVE = "ACTIVE";
    public static final String SUPPLIER_INACTIVE = "INACTIVE";
    public static final String RECEIPT_DRAFT = "DRAFT";
    public static final String RECEIPT_CONFIRMED = "CONFIRMED";
    public static final String RECEIPT_CANCELLED = "CANCELLED";

    // Canonical transaction_type values accepted by V1__fido_target_schema.sql.
    public static final String OPENING = "OPENING";
    public static final String RECEIPT_IN = "GOODS_RECEIPT";
    public static final String ADJUSTMENT = "ADJUSTMENT";
    public static final String ORDER_CONFIRM_OUT = "ORDER";
    public static final String ORDER_CANCEL_IN = "ORDER_CANCEL_REVERSAL";
    public static final String DELIVERY_RETURN_IN = "RETURN_RESTOCK";

    public static final String INVENTORY_READ = "INVENTORY_READ";
    public static final String INVENTORY_WRITE = "INVENTORY_WRITE";

    private static final Set<String> SUPPLIER_STATUSES = Set.of(SUPPLIER_ACTIVE, SUPPLIER_INACTIVE);
    private static final Set<String> RECEIPT_STATUSES =
            Set.of(RECEIPT_DRAFT, RECEIPT_CONFIRMED, RECEIPT_CANCELLED);

    /**
     * Owned reason-code vocabulary for inventory corrections. Free-form operator text is not
     * persisted in the ledger reason_code column.
     */
    private static final Set<String> ADJUSTMENT_REASON_CODES =
            Set.of("COUNT_CORRECTION", "DAMAGE", "LOSS", "FOUND", "DATA_CORRECTION");
    private static final Set<String> REVERSAL_REASON_CODES =
            Set.of("COUNT_CORRECTION", "DATA_CORRECTION", "REVERSAL");
    private static final Pattern SOURCE_OPERATION_ID =
            Pattern.compile("[A-Za-z0-9._:-]{1,80}");

    private InventoryPolicy() {}

    public static boolean isAdjustmentReasonCode(String reasonCode) {
        return reasonCode != null && ADJUSTMENT_REASON_CODES.contains(reasonCode);
    }

    public static boolean isReversalReasonCode(String reasonCode) {
        return reasonCode != null && REVERSAL_REASON_CODES.contains(reasonCode);
    }

    public static boolean isValidSourceOperationId(String sourceOperationId) {
        return sourceOperationId != null && SOURCE_OPERATION_ID.matcher(sourceOperationId).matches();
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
