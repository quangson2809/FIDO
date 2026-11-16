package com.fido.modules.audit.service;

/**
 * Mã cố định lưu vào entity_type, không lấy tên lớp/bảng từ request. AUDIT_LOG chỉ ghi nhận lượt tra
 * cứu; không tự audit thao tác insert để tránh lặp vô hạn.
 */
public enum AuditEntityType {
    AUDIT_LOG,
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
