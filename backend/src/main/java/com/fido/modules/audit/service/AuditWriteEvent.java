package com.fido.modules.audit.service;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Explicit audit input from an owning application service.
 *
 * <p>Actor and timestamp are deliberately absent: the writer derives the actor from the
 * authenticated security principal, while AUDIT_LOGS owns the generated ID and timestamp.
 */
public record AuditWriteEvent(
        AuditAction action,
        AuditEntityType entityType,
        String entityId,
        Map<String, ?> beforeData,
        Map<String, ?> afterData) {

    private static final Pattern SAFE_ENTITY_ID = Pattern.compile("[A-Za-z0-9._:-]{1,100}");

    public AuditWriteEvent {
        Objects.requireNonNull(action, "action");
        Objects.requireNonNull(entityType, "entityType");
        Objects.requireNonNull(entityId, "entityId");

        entityId = entityId.trim();
        if (!SAFE_ENTITY_ID.matcher(entityId).matches()) {
            throw new IllegalArgumentException("entityId must be a stable non-sensitive identifier");
        }

        beforeData = immutableCopy(beforeData);
        afterData = immutableCopy(afterData);
    }

    public static AuditWriteEvent of(
            AuditAction action, AuditEntityType entityType, String entityId) {
        return new AuditWriteEvent(action, entityType, entityId, Map.of(), Map.of());
    }

    public static AuditWriteEvent withChanges(
            AuditAction action,
            AuditEntityType entityType,
            String entityId,
            Map<String, ?> beforeData,
            Map<String, ?> afterData) {
        return new AuditWriteEvent(action, entityType, entityId, beforeData, afterData);
    }

    private static Map<String, ?> immutableCopy(Map<String, ?> source) {
        if (source == null || source.isEmpty()) {
            return Map.of();
        }
        return Collections.unmodifiableMap(new LinkedHashMap<>(source));
    }
}
