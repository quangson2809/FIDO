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
            Set.of("code", "status", "usage_limit", "used_count", "discount_type");
    private static final Set<String> ACCOUNT_FIELDS =
            Set.of("status", "active", "role_count", "permission_count");
    private static final Set<String> ROLE_FIELDS =
            Set.of("code", "name", "status", "active", "permission_count");
    private static final Set<String> PERMISSION_FIELDS =
            Set.of("code", "name", "active");
    private static final Set<String> CONTENT_FIELDS = Set.of("slug", "title", "status");
    private static final Set<String> RECEIPT_FIELDS =
            Set.of("status", "warehouse_id", "item_count", "total_quantity");
    private static final Set<String> INVENTORY_FIELDS =
            Set.of("product_id", "warehouse_id", "quantity_delta", "reason_code");
    private static final Set<String> SUPPLIER_FIELDS = Set.of("code", "name", "status");
    private static final Set<String> ORDER_FIELDS =
            Set.of(
                    "status",
                    "payment_status",
                    "shipping_status",
                    "item_count",
                    "total_amount",
                    "refund_amount");
    private static final Set<String> CATALOG_FIELDS =
            Set.of("code", "name", "status", "parent_product_id", "price", "image_count");

    private static final Pattern SECRET_OR_PII_KEY =
            Pattern.compile(
                    ".*(password|passwd|token|otp|secret|credential|authorization|cookie|session"
                            + "|private.?key|signed.?url|email|phone|address|raw|bytes).*",
                    Pattern.CASE_INSENSITIVE);

    private final ObjectMapper objectMapper;

    public AuditPayloadPolicy(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Returns null for an empty/fully-redacted payload. Only allowlisted scalar values are kept;
     * nested objects and collections are dropped rather than recursively serializing source data.
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
                    Object normalized = normalizeScalar(value);
                    if (normalized != null) {
                        safe.put(key, normalized);
                    }
                });

        if (safe.isEmpty()) {
            return null;
        }

        try {
            return objectMapper.writeValueAsString(safe);
        } catch (JsonProcessingException ex) {
            // Do not include the input map or serializer details in the surfaced failure.
            throw new IllegalStateException("Could not encode allowlisted audit fields");
        }
    }

    private Set<String> allowedFields(AuditAction action) {
        return switch (action) {
            case VOUCHER_CREATE, VOUCHER_UPDATE -> VOUCHER_FIELDS;
            case SUPERADMIN_BOOTSTRAP, STAFF_CREATE, STAFF_UPDATE -> ACCOUNT_FIELDS;
            case ROLE_CREATE, ROLE_UPDATE, ROLE_DELETE -> ROLE_FIELDS;
            case PERMISSION_CREATE, PERMISSION_UPDATE, PERMISSION_DELETE -> PERMISSION_FIELDS;
            case CONTENT_CREATE, CONTENT_UPDATE -> CONTENT_FIELDS;
            case GOODS_RECEIPT_CREATE,
                    GOODS_RECEIPT_UPDATE,
                    GOODS_RECEIPT_CONFIRM,
                    GOODS_RECEIPT_CANCEL -> RECEIPT_FIELDS;
            case INVENTORY_ADJUST -> INVENTORY_FIELDS;
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
                    VARIANT_CREATE,
                    VARIANT_UPDATE,
                    SIZE_SYSTEM_CREATE,
                    SIZE_SYSTEM_UPDATE,
                    SIZE_SYSTEM_DELETE -> CATALOG_FIELDS;
        };
    }

    private Object normalizeScalar(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String text) {
            String normalized = text.trim();
            if (normalized.isEmpty()
                    || normalized.length() > 500
                    || normalized.chars().anyMatch(Character::isISOControl)) {
                return null;
            }
            return normalized;
        }
        if (value instanceof Boolean
                || value instanceof Byte
                || value instanceof Short
                || value instanceof Integer
                || value instanceof Long
                || value instanceof BigInteger
                || value instanceof BigDecimal) {
            return value;
        }
        if (value instanceof Enum<?> enumValue) {
            return enumValue.name();
        }

        // No JPA entities, DTOs, collections, nested maps, byte arrays or arbitrary objects.
        return null;
    }
}
