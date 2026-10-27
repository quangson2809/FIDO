package com.fido.modules.audit.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Pattern;

/** Applies an action-specific field allowlist before JSON reaches the persistence layer. */
@Component
public class AuditPayloadPolicy {

    private static final Set<String> VOUCHER_FIELDS =
            Set.of("code", "status", "usage_limit", "usage_count", "discount_type");
    private static final Set<String> ACCOUNT_FIELDS =
            Set.of("status", "active", "role_count", "permission_count");
    private static final Set<String> ROLE_FIELDS =
            Set.of("code", "status", "active", "permission_count");
    private static final Set<String> PERMISSION_FIELDS = Set.of("code", "active");
    private static final Set<String> CONTENT_FIELDS =
            Set.of("slug", "status", "title_changed", "content_changed");
    private static final Set<String> AUDIT_QUERY_FIELDS =
            Set.of("actor_account_id", "action", "entity_type", "entity_id", "from", "to", "page", "page_size");
    private static final Set<String> RECEIPT_FIELDS =
            Set.of("status", "warehouse_id", "item_count", "total_quantity");
    private static final Set<String> INVENTORY_FIELDS =
            Set.of("product_id", "warehouse_id", "quantity_delta", "reason_code");
    private static final Set<String> SUPPLIER_FIELDS = Set.of("code", "status");
    private static final Set<String> ORDER_FIELDS =
            Set.of(
                    "status",
                    "payment_status",
                    "shipping_status",
                    "reason_code",
                    "item_count",
                    "total_amount",
                    "refund_amount");
    private static final Set<String> CATALOG_FIELDS =
            Set.of("code", "status", "parent_product_id", "price", "image_count");

    private static final Set<String> CODE_FIELDS =
            Set.of("code", "status", "discount_type", "reason_code",
                    "payment_status", "shipping_status", "slug", "action", "entity_type", "entity_id",
                    "from", "to");
    private static final Set<String> BOOLEAN_FIELDS =
            Set.of("active", "title_changed", "content_changed");
    private static final Set<String> NUMERIC_FIELDS =
            Set.of(
                    "usage_limit", "usage_count", "role_count", "permission_count",
                    "warehouse_id", "item_count", "total_quantity", "product_id",
                    "quantity_delta", "parent_product_id", "price", "image_count",
                    "total_amount", "refund_amount", "actor_account_id", "page", "page_size");

    private static final Pattern SAFE_CODE_VALUE =
            Pattern.compile("[A-Za-z0-9._:-]{1,120}");
    private static final Pattern SECRET_OR_PII_KEY =
            Pattern.compile(
                    ".*(password|passwd|token|otp|secret|credential|authorization|cookie|session"
                            + "|private.?key|signed.?url|email|phone|address|raw|bytes).*",
                    Pattern.CASE_INSENSITIVE);

    // Only allowlisted scalar values reach this serializer; no application-wide mapper bean is needed.
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    /**
     * Returns null for an empty/fully-redacted payload. Values are limited to safe code-like
     * strings, booleans for active-state fields, and integral numeric business facts. Free-form
     * text, nested objects, collections and arbitrary objects are excluded.
     */
    public String toJson(AuditAction action, Map<String, ?> source) {
        if (source == null || source.isEmpty()) {
            return null;
        }

        Set<String> allowed = allowedFields(action);
        Map<String, Object> safe = new TreeMap<>();
        source.forEach(
                (key, value) -> {
                    if (key == null
                            || !allowed.contains(key)
                            || SECRET_OR_PII_KEY.matcher(key).matches()) {
                        return;
                    }
                    Object normalized = normalizeValue(key, value);
                    if (normalized != null) {
                        safe.put(key, normalized);
                    }
                });

        if (safe.isEmpty()) {
            return null;
        }

        try {
            return OBJECT_MAPPER.writeValueAsString(safe);
        } catch (JsonProcessingException ex) {
            // Do not include the input map or serializer details in the surfaced failure.
            throw new IllegalStateException("Could not encode allowlisted audit fields");
        }
    }

    /**
     * Applies the same action-specific field/value allowlist to historical rows before DTO
     * serialization. Unknown action codes and nested/unrecognized values fail closed.
     */
    public Map<String, Object> redactForRead(String actionCode, Map<String, ?> source) {
        if (source == null) {
            return null;
        }

        final AuditAction action;
        try {
            action = AuditAction.valueOf(actionCode);
        } catch (IllegalArgumentException | NullPointerException ex) {
            return Map.of();
        }

        Set<String> allowed = allowedFields(action);
        Map<String, Object> safe = new TreeMap<>();
        source.forEach((key, value) -> {
            if (key == null
                    || !allowed.contains(key)
                    || SECRET_OR_PII_KEY.matcher(key).matches()) {
                return;
            }
            Object normalized = normalizeValue(key, value);
            if (normalized != null) {
                safe.put(key, normalized);
            }
        });
        return java.util.Collections.unmodifiableMap(safe);
    }

    private Set<String> allowedFields(AuditAction action) {
        return switch (action) {
            case AUDIT_LOG_QUERY -> AUDIT_QUERY_FIELDS;
            case VOUCHER_CREATE, VOUCHER_UPDATE,
                    VOUCHER_QUOTA_CONSUME, VOUCHER_QUOTA_RELEASE -> VOUCHER_FIELDS;
            case SUPERADMIN_BOOTSTRAP, STAFF_CREATE, STAFF_UPDATE -> ACCOUNT_FIELDS;
            case ROLE_CREATE, ROLE_UPDATE, ROLE_DELETE -> ROLE_FIELDS;
            case PERMISSION_CREATE, PERMISSION_UPDATE, PERMISSION_DELETE -> PERMISSION_FIELDS;
            case CONTENT_CREATE, CONTENT_UPDATE -> CONTENT_FIELDS;
            case GOODS_RECEIPT_CREATE,
                    GOODS_RECEIPT_UPDATE,
                    GOODS_RECEIPT_CONFIRM,
                    GOODS_RECEIPT_CANCEL -> RECEIPT_FIELDS;
            case INVENTORY_ADJUST, INVENTORY_OPENING, INVENTORY_ORDER_CANCEL_REVERSAL -> INVENTORY_FIELDS;
            case SUPPLIER_CREATE, SUPPLIER_UPDATE -> SUPPLIER_FIELDS;
            case ORDER_CREATE,
                    ORDER_RECIPIENT_UPDATE,
                    ORDER_ADMIN_UPDATE,
                    ORDER_CONFIRM,
                    ORDER_PREPARE,
                    ORDER_SHIP,
                    ORDER_DELIVERY_FAILED,
                    ORDER_RETRY_DELIVERY,
                    ORDER_COMPLETE,
                    ORDER_CANCEL,
                    ORDER_DELIVERY_RETURN_IN,
                    ORDER_RETURN_ACCEPT,
                    ORDER_COD_COLLECT,
                    ORDER_REFUND -> ORDER_FIELDS;
            case CATEGORY_CREATE,
                    CATEGORY_UPDATE,
                    CATEGORY_DELETE,
                    BRAND_CREATE,
                    BRAND_UPDATE,
                    BRAND_DELETE,
                    COLOR_CREATE,
                    COLOR_UPDATE,
                    COLOR_DELETE,
                    PRODUCT_CREATE,
                    PRODUCT_UPDATE,
                    PRODUCT_DELETE,
                    VARIANT_CREATE,
                    VARIANT_UPDATE,
                    SIZE_SYSTEM_CREATE,
                    SIZE_SYSTEM_UPDATE,
                    SIZE_SYSTEM_DELETE,
                    ATTRIBUTE_CREATE,
                    ATTRIBUTE_UPDATE,
                    ATTRIBUTE_OPTION_CREATE,
                    ATTRIBUTE_OPTION_UPDATE -> CATALOG_FIELDS;
        };
    }

    private Object normalizeValue(String key, Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String text && "slug".equals(key)) {
            String slug = text.trim();
            return slug.length() <= 180 && slug.matches("[a-z0-9]+(?:-[a-z0-9]+)*") ? slug : null;
        }
        if (value instanceof String text && CODE_FIELDS.contains(key)) {
            String normalized = text.trim();
            return SAFE_CODE_VALUE.matcher(normalized).matches() ? normalized : null;
        }
        if (value instanceof Enum<?> enumValue && CODE_FIELDS.contains(key)) {
            return enumValue.name();
        }
        if (value instanceof Boolean && BOOLEAN_FIELDS.contains(key)) {
            return value;
        }
        if (value instanceof Byte
                || value instanceof Short
                || value instanceof Integer
                || value instanceof Long
                || value instanceof BigInteger) {
            return NUMERIC_FIELDS.contains(key) ? value : null;
        }
        if (value instanceof BigDecimal decimal && NUMERIC_FIELDS.contains(key)) {
            return decimal.stripTrailingZeros().scale() <= 0 ? decimal.stripTrailingZeros() : null;
        }

        // No free-form strings, JPA entities, DTOs, collections, nested maps or byte arrays.
        return null;
    }
}
