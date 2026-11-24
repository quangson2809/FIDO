package com.fido.modules.account.service;

import java.util.Set;

public final class SupportedPermissions {
    private SupportedPermissions() {}

    public static final Set<String> CODES =
            Set.of(
                    "CATALOG_READ",
                    "CATALOG_WRITE",
                    "INVENTORY_READ",
                    "INVENTORY_WRITE",
                    "ORDER_READ",
                    "ORDER_EDIT",
                    "ORDER_PAYMENT",
                    "ORDER_AFTER_SALES",
                    "AUDIT_READ",
                    "CONTENT_READ",
                    "CONTENT_WRITE",
                    "CUSTOMER_READ",
                    "CUSTOMER_WRITE",
                    "REPORT_READ",
                    "VOUCHER_READ",
                    "VOUCHER_WRITE");
}
