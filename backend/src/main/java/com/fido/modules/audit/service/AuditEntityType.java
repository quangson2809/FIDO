package com.fido.modules.audit.service;

/**
 * Stable target-schema entity codes. These values are persisted in AUDIT_LOGS.entity_type;
 * they are not Java class names or table names supplied by a request.
 *
 * <p>AUDIT_LOGS itself is intentionally absent so writing an audit record cannot recursively
 * create another audit record.
 */
public enum AuditEntityType {
    ACCOUNT,
    ADDRESS,
    ACCOUNT_ROLE,
    ROLE,
    ROLE_PERMISSION,
    PERMISSION,
    CATEGORY,
    BRAND,
    PRODUCT,
    PRODUCT_IMAGE,
    ATTRIBUTE_TYPE,
    ATTRIBUTE,
    ATTRIBUTE_OPTION,
    PRODUCT_ATTRIBUTE_VALUE,
    CART,
    CART_ITEM,
    VOUCHER,
    ORDER,
    ORDER_ITEM,
    ORDER_ADDRESS,
    ORDER_VOUCHER_SNAPSHOT,
    PAYMENT,
    SHIPPING_INFO,
    SUPPLIER,
    GOODS_RECEIPT,
    GOODS_RECEIPT_ITEM,
    WAREHOUSE,
    INVENTORY,
    INVENTORY_TRANSACTION,
    CONTENT_PAGE
}
