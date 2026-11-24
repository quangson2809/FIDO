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

/** Lọc trường và giá trị được phép theo hành động trước khi ghi hoặc trả dữ liệu audit. */
@Component
public class AuditPayloadPolicy {

    private static final Set<String> VOUCHER_FIELDS =
            Set.of(
                    "code",
                    "status",
                    "usage_limit",
                    "usage_count",
                    "discount_type",
                    "discount_value",
                    "minimum_order_value",
                    "maximum_discount",
                    "starts_at",
                    "ends_at");
    private static final Set<String> ACCOUNT_FIELDS =
            Set.of("status", "active", "role_count", "permission_count", "role_ids", "reason");
    private static final Set<String> ROLE_FIELDS =
            Set.of("code", "status", "active", "permission_count", "permission_ids");
    private static final Set<String> PERMISSION_FIELDS = Set.of("code", "active");
    private static final Set<String> CONTENT_FIELDS =
            Set.of("slug", "status", "title_changed", "content_changed");
    private static final Set<String> AUDIT_QUERY_FIELDS =
            Set.of(
                    "actor_account_id",
                    "action",
                    "entity_type",
                    "entity_id",
                    "from",
                    "to",
                    "page",
                    "page_size");
    private static final Set<String> RECEIPT_FIELDS =
            Set.of(
                    "status",
                    "warehouse_id",
                    "item_count",
                    "total_quantity",
                    "reason",
                    "value_delta",
                    "item_changes");
    private static final Set<String> INVENTORY_FIELDS =
            Set.of("product_id", "warehouse_id", "quantity_delta", "reason_code");
    private static final Set<String> SUPPLIER_FIELDS = Set.of("code", "status");
    private static final Set<String> ORDER_FIELDS =
            Set.of(
                    "status",
                    "payment_status",
                    "reason_code",
                    "reason",
                    "item_count",
                    "total_amount",
                    "refund_amount",
                    "received_quantity",
                    "sellable_quantity");
    private static final Set<String> CATALOG_FIELDS =
            Set.of(
                    "code",
                    "status",
                    "parent_product_id",
                    "price",
                    "image_count",
                    "attribute_value_ids");

    private static final Set<String> CODE_FIELDS =
            Set.of(
                    "code",
                    "status",
                    "discount_type",
                    "reason_code",
                    "payment_status",
                    "slug",
                    "action",
                    "entity_type",
                    "entity_id",
                    "from",
                    "to");
    private static final Set<String> BOOLEAN_FIELDS =
            Set.of("active", "title_changed", "content_changed");
    private static final Set<String> NUMERIC_FIELDS =
            Set.of(
                    "discount_value",
                    "minimum_order_value",
                    "maximum_discount",
                    "usage_limit",
                    "usage_count",
                    "role_count",
                    "permission_count",
                    "warehouse_id",
                    "item_count",
                    "total_quantity",
                    "product_id",
                    "quantity_delta",
                    "parent_product_id",
                    "price",
                    "image_count",
                    "total_amount",
                    "refund_amount",
                    "actor_account_id",
                    "page",
                    "page_size",
                    "received_quantity",
                    "sellable_quantity",
                    "value_delta");

    private static final Pattern SAFE_CODE_VALUE = Pattern.compile("[A-Za-z0-9._:-]{1,120}");
    private static final Pattern SECRET_OR_PII_KEY =
            Pattern.compile(
                    ".*(password|passwd|token|otp|secret|credential|authorization|cookie|session"
                            + "|private.?key|signed.?url|email|phone|address|raw|bytes).*",
                    Pattern.CASE_INSENSITIVE);

    // Chỉ tuần tự hóa giá trị đơn đã được lọc; không dùng cấu hình JSON chung của ứng dụng.
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    /**
     * Payload rỗng/bị lọc hết trả null. Chỉ giữ mã an toàn, boolean đúng trường và số nguyên; bỏ văn
     * bản tự do và cấu trúc lồng.
     */
    public String toJson(AuditAction action, Map<String, ?> source) {
        if (source == null || source.isEmpty()) {
            return null;
        }

        Map<String, Object> safe = sanitize(action, source);

        if (safe.isEmpty()) {
            return null;
        }

        try {
            return OBJECT_MAPPER.writeValueAsString(safe);
        } catch (JsonProcessingException ex) {
            // Không kèm payload đầu vào hoặc lỗi bộ tuần tự hóa vào thông báo công khai.
            throw new IllegalStateException("Could not encode allowlisted audit fields");
        }
    }

    /** Lọc lại cả lịch sử trước khi trả DTO; mã hành động lạ không được trả dữ liệu chưa kiểm chứng. */
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

        return java.util.Collections.unmodifiableMap(sanitize(action, source));
    }

    // Đọc và ghi dùng cùng bộ lọc để lịch sử cũ không lộ thêm trường so với dữ liệu mới.
    private Map<String, Object> sanitize(AuditAction action, Map<String, ?> source) {
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
        return safe;
    }

    /**
     * action là mã AuditAction do service nghiệp vụ truyền; chọn đúng tập trường được lưu/trả cho nhóm
     * hành động.
     */
    private Set<String> allowedFields(AuditAction action) {
        return switch (action) {
            case AUDIT_LOG_QUERY -> AUDIT_QUERY_FIELDS;
            case VOUCHER_CREATE, VOUCHER_UPDATE, VOUCHER_QUOTA_CONSUME, VOUCHER_QUOTA_RELEASE ->
                    VOUCHER_FIELDS;
            case SUPERADMIN_BOOTSTRAP,
                            STAFF_CREATE,
                            STAFF_UPDATE,
                            ACCOUNT_PASSWORD_CHANGE,
                            ACCOUNT_PASSWORD_RESET,
                            ACCOUNT_EMAIL_VERIFY,
                            CUSTOMER_STATUS_CHANGE ->
                    ACCOUNT_FIELDS;
            case ROLE_CREATE, ROLE_UPDATE, ROLE_DELETE -> ROLE_FIELDS;
            case PERMISSION_CREATE, PERMISSION_UPDATE, PERMISSION_DELETE -> PERMISSION_FIELDS;
            case CONTENT_CREATE, CONTENT_UPDATE -> CONTENT_FIELDS;
            case GOODS_RECEIPT_CREATE,
                            GOODS_RECEIPT_UPDATE,
                            GOODS_RECEIPT_CONFIRM,
                            GOODS_RECEIPT_CANCEL,
                            STOCKTAKE_CREATE,
                            STOCKTAKE_CONFIRM,
                            GOODS_RECEIPT_CORRECT ->
                    RECEIPT_FIELDS;
            case INVENTORY_ADJUST, INVENTORY_OPENING, INVENTORY_ORDER_CANCEL_REVERSAL ->
                    INVENTORY_FIELDS;
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
                            ORDER_REFUND ->
                    ORDER_FIELDS;
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
                            ATTRIBUTE_OPTION_UPDATE ->
                    CATALOG_FIELDS;
        };
    }

    /**
     * key/value là từng cặp trong before/after; chỉ giữ kiểu dữ liệu và định dạng được phép cho key
     * đó.
     * Trả null nghĩa loại bỏ giá trị, không phải ghi chuỗi null hoặc nguyên object đầu vào.
     */
    public static String redactReason(String text) {
        if (text == null) return null;
        String safe = text.replaceAll("[\\p{Cntrl}]", " ").trim();
        safe = safe.replaceAll("(?i)[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}", "[đã ẩn email]");
        safe = safe.replaceAll("(?<![0-9])(?:\\+?84|0)[0-9 .()-]{8,16}[0-9]", "[đã ẩn điện thoại]");
        safe = safe.replaceAll("(?i)(password|token|secret|otp)\\s*[:=]\\s*\\S+", "$1=[đã ẩn]");
        return safe.substring(0, Math.min(500, safe.length()));
    }

    private Object normalizeValue(String key, Object value) {
        if (value == null) {
            return null;
        }
        if ("item_changes".equals(key)
                && value instanceof java.util.Collection<?> lines
                && lines.size() <= 100) {
            var result = new java.util.ArrayList<Map<String, Object>>();
            for (Object line : lines) {
                if (!(line instanceof Map<?, ?> row)) return null;
                var clean = new java.util.TreeMap<String, Object>();
                for (String field : java.util.List.of("product_id", "quantity", "unit_cost")) {
                    Object number = row.get(field);
                    if (!(number instanceof Integer || number instanceof Long)) return null;
                    clean.put(field, number);
                }
                result.add(clean);
            }
            return result;
        }
        if ("reason".equals(key) && value instanceof String text) {
            return redactReason(text);
        }
        if (java.util.Set.of("permission_ids", "role_ids", "attribute_value_ids").contains(key)
                && value instanceof java.util.Collection<?> ids
                && ids.size() <= 500
                && ids.stream().allMatch(id -> id instanceof Long || id instanceof Integer)) {
            return ids.stream().map(id -> ((Number) id).longValue()).distinct().sorted().toList();
        }
        if (java.util.Set.of("starts_at", "ends_at").contains(key)) {
            if (value instanceof java.time.Instant instant) return instant.toString();
            if (value instanceof String text) {
                try {
                    return java.time.Instant.parse(text).toString();
                } catch (java.time.format.DateTimeParseException ignored) {
                    return null;
                }
            }
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

        // Bỏ văn bản tự do, entity, DTO, danh sách, map lồng và mảng byte.
        return null;
    }
}
